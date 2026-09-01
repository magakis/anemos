import React from 'react';

import { buildRuntimeAuthHeaders } from '@/lib/runtime-auth';

type BootProbeResult = {
  url: string;
  status: number | null;
  contentType: string;
  healthy: boolean | null;
  version: string | null;
  detail: string;
};

type BootGuardState =
  | { status: 'checking' }
  | { status: 'ready' }
  | { status: 'failed'; result: BootProbeResult };

export interface AnemosBootGuardProps {
  baseUrl: string | null;
  enabled: boolean;
  children: React.ReactNode;
}

const probeUrl = (baseUrl: string): string => {
  const normalized = baseUrl.replace(/\/+$/, '');
  try {
    return new URL('global/health', `${normalized}/`).toString();
  } catch {
    if (typeof window !== 'undefined') return new URL(`${normalized}/global/health`, window.location.href).toString();
    return `${normalized}/global/health`;
  }
};

const createProbeSignal = (): { signal: AbortSignal; cleanup: () => void } => {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return { signal: AbortSignal.timeout(5_000), cleanup: () => undefined };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  return { signal: controller.signal, cleanup: () => clearTimeout(timer) };
};

export const probeAnemosV2 = async (baseUrl: string): Promise<BootProbeResult> => {
  const url = probeUrl(baseUrl);
  const timeout = createProbeSignal();
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: await buildRuntimeAuthHeaders({ Accept: 'application/json' }),
      credentials: 'omit',
      signal: timeout.signal,
    });
    const contentType = response.headers.get('content-type') || '(none)';
    if (!response.ok) {
      return {
        url,
        status: response.status,
        contentType,
        healthy: null,
        version: null,
        detail: `HTTP ${response.status}`,
      };
    }
    if (!contentType.includes('application/json')) {
      return {
        url,
        status: response.status,
        contentType,
        healthy: null,
        version: null,
        detail: 'response was not JSON',
      };
    }

    const payload = await response.json().catch(() => null) as { healthy?: unknown; version?: unknown } | null;
    const healthy = typeof payload?.healthy === 'boolean' ? payload.healthy : null;
    const version = typeof payload?.version === 'string' && payload.version.trim() ? payload.version.trim() : null;
    if (healthy !== true || !version) {
      return {
        url,
        status: response.status,
        contentType,
        healthy,
        version,
        detail: 'JSON response did not report healthy=true and a version',
      };
    }

    return {
      url,
      status: response.status,
      contentType,
      healthy,
      version,
      detail: 'healthy v2-compatible backend',
    };
  } catch (error) {
    return {
      url,
      status: null,
      contentType: '(none)',
      healthy: null,
      version: null,
      detail: error instanceof Error ? error.message : 'network request failed',
    };
  } finally {
    timeout.cleanup();
  }
};

const BootCheckingScreen: React.FC = () => (
  <main className="flex min-h-dvh items-center justify-center bg-background px-6 text-center text-foreground">
    <div className="space-y-2">
      <p className="typography-h3">Checking backend compatibility</p>
      <p className="typography-body text-muted-foreground">Connecting to the configured OpenCode server…</p>
    </div>
  </main>
);

const BootFailureScreen: React.FC<{ baseUrl: string; result: BootProbeResult; onRetry: () => void }> = ({ baseUrl, result, onRetry }) => (
  <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-10 text-foreground">
    <div className="w-full max-w-lg space-y-6">
      <div className="space-y-2">
        <h1 className="typography-h3 text-destructive">Backend too old / not v2-compatible</h1>
        <p className="typography-body text-muted-foreground">
          Anemos requires an OpenCode backend with the v2 API. The compatibility probe could not verify this server.
        </p>
      </div>
      <dl className="space-y-3 rounded-lg border border-border bg-surface-subtle p-4 typography-small">
        <div>
          <dt className="text-muted-foreground">Resolved backend</dt>
          <dd className="break-all text-foreground">{baseUrl}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Probe</dt>
          <dd className="break-all text-foreground">GET {result.url}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Result</dt>
          <dd className="text-foreground">
            {result.detail} (status={result.status ?? 'network error'}, content-type={result.contentType})
          </dd>
        </div>
        {result.version ? (
          <div>
            <dt className="text-muted-foreground">Reported version</dt>
            <dd className="text-foreground">{result.version}</dd>
          </div>
        ) : null}
      </dl>
      <p className="typography-body text-muted-foreground">
        Start opencode ≥ v2-capable (for example, 1.18.x) and confirm that GET /global/health returns JSON with healthy=true and a version.
      </p>
      <button type="button" onClick={onRetry} className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground">
        Retry compatibility check
      </button>
    </div>
  </main>
);

export const AnemosBootGuard: React.FC<AnemosBootGuardProps> = ({ baseUrl, enabled, children }) => {
  const [state, setState] = React.useState<BootGuardState>(() => enabled && baseUrl ? { status: 'checking' } : { status: 'ready' });
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    if (!enabled || !baseUrl) {
      setState({ status: 'ready' });
      return;
    }

    let cancelled = false;
    setState({ status: 'checking' });
    void probeAnemosV2(baseUrl).then((result) => {
      if (cancelled) return;
      setState(result.healthy === true && result.version ? { status: 'ready' } : { status: 'failed', result });
    });
    return () => {
      cancelled = true;
    };
  }, [baseUrl, enabled, retryCount]);

  const retry = React.useCallback(() => setRetryCount((count) => count + 1), []);

  if (!enabled || !baseUrl || state.status === 'ready') return <>{children}</>;
  if (state.status === 'checking') return <BootCheckingScreen />;
  return <BootFailureScreen baseUrl={baseUrl} result={state.result} onRetry={retry} />;
};
