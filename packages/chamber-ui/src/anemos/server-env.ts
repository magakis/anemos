export type AnemosServerEnvSource = 'url' | 'host-port' | 'development-default' | 'browser-origin' | 'chamber-default';

export interface AnemosServerEnv {
  baseUrl: string | null;
  active: boolean;
  source: AnemosServerEnvSource;
}

const normalizeValue = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '');

const hasServerAddressEnv = (): boolean => Boolean(
  normalizeValue(import.meta.env.VITE_OPENCODE_SERVER_HOST)
  || normalizeValue(import.meta.env.VITE_OPENCODE_SERVER_PORT),
);

export const resolveServerEnv = (): AnemosServerEnv => {
  const explicitUrl = normalizeValue(import.meta.env.VITE_OPENCODE_URL);
  if (explicitUrl) {
    return { baseUrl: normalizeBaseUrl(explicitUrl), active: true, source: 'url' };
  }

  const hasAddressEnv = hasServerAddressEnv();
  if (hasAddressEnv || import.meta.env.DEV) {
    const host = normalizeValue(import.meta.env.VITE_OPENCODE_SERVER_HOST) || 'localhost';
    const port = normalizeValue(import.meta.env.VITE_OPENCODE_SERVER_PORT) || '4096';
    return { baseUrl: `http://${host}:${port}`, active: hasAddressEnv, source: hasAddressEnv ? 'host-port' : 'development-default' };
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    return { baseUrl: window.location.origin, active: false, source: 'browser-origin' };
  }

  return { baseUrl: 'http://localhost:4096', active: false, source: 'chamber-default' };
};

export const isAnemosRuntimeActive = (): boolean => {
  if (typeof window !== 'undefined') {
    const marker = (window as typeof window & { __ANEMOS_RUNTIME_ACTIVE__?: boolean }).__ANEMOS_RUNTIME_ACTIVE__;
    if (marker === true) return true;
  }
  return resolveServerEnv().active;
};
