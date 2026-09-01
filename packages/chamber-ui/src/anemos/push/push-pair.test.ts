// ANEMOS-PATCH: Bun coverage for the UI 3 fork relay pairing machine.

import { describe, expect, test } from 'bun:test';
import {
  canAutoPair,
  canClearPair,
  canPollPair,
  canReusePair,
  canSyncPair,
} from './use-push-pair';
import {
  claimPush,
  fetchWithTimeout,
  mergePushIssue,
  PushFail,
  pushIssue,
  runPushSetup,
  type PushServerConnection,
} from './push-pair';
import { installPair, pairPush, PushPlugin } from './push-plugin';
import type { PairInfo, PushState } from '@/anemos/platform-adapter';

type Run = {
  out?: string;
  open?: boolean;
  error?: boolean;
  close?: boolean;
  boom?: string;
};

type Cmd = {
  command: string;
  args: string[];
  cwd?: string;
};

type PairResponse = {
  status?: 'pending' | 'claimed' | 'active' | 'expired' | 'failed';
  message?: string;
  channel_id?: string;
  device_id?: string;
  device_secret?: string;
};

const server: PushServerConnection = { type: 'http', http: { url: 'http://localhost:4096' } };

const push = (input?: Partial<PushState>): PushState => ({
  supported: true,
  permission: 'authorized',
  allowed: true,
  registered: true,
  paired: false,
  generic: true,
  ...input,
});

const stub = (input: { runs: Run[]; pairs?: PairResponse[]; cfg?: { plugin?: string[] }; cfgCode?: number }) => {
  const cmds: Cmd[] = [];
  const urls: string[] = [];
  const runs = new Map<string, Run>();
  const OriginalSocket = globalThis.WebSocket;
  let cfg = { plugin: input.cfg?.plugin ?? [] };
  let id = 0;
  let pair = 0;

  class Socket extends EventTarget {
    readyState = 0;
    binaryType = 'blob';

    constructor(readonly url: string) {
      super();
      const match = this.url.match(/\/pty\/(pty_\d+)\/connect/);
      const plan = match ? runs.get(match[1]) : undefined;
      if (plan?.boom) throw new DOMException(plan.boom);
      queueMicrotask(() => {
        if (plan?.open === false) {
          if (plan.error !== false) this.dispatchEvent(new Event('error'));
          this.close();
          return;
        }
        this.readyState = 1;
        this.dispatchEvent(new Event('open'));
        this.dispatchEvent(new MessageEvent('message', { data: new Uint8Array([0]).buffer }));
        if (plan?.out) this.dispatchEvent(new MessageEvent('message', { data: plan.out }));
        if (plan?.error) this.dispatchEvent(new Event('error'));
        if (plan?.close !== false) this.close();
      });
    }

    send(_data: string | ArrayBuffer | Uint8Array): void {}

    close(): void {
      if (this.readyState === 3) return;
      this.readyState = 3;
      queueMicrotask(() => this.dispatchEvent(new Event('close')));
    }
  }

  globalThis.WebSocket = Socket as unknown as typeof WebSocket;

  const fetch = (async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const text = url instanceof Request ? url.url : String(url);
    const path = new URL(text).pathname;
    const method = init?.method ?? (url instanceof Request ? url.method : 'GET');
    const body = init?.body ? String(init.body) : url instanceof Request ? await url.clone().text() : '';
    urls.push(text);

    if (path === '/global/config' && method === 'GET') {
      if (input.cfgCode) return new Response('err', { status: input.cfgCode });
      return Response.json(cfg);
    }
    if (path === '/global/config' && method === 'PATCH') {
      const data = (body ? JSON.parse(body) : {}) as { plugin?: string[] };
      cfg = { ...cfg, ...data };
      return Response.json(cfg);
    }
    if (path === '/global/dispose' && method === 'POST') return Response.json(true);
    if (path === '/path') return Response.json({ state: '/tmp/opencode', directory: '/repo/demo' });
    if (path === '/pty') {
      const next = (body ? JSON.parse(body) : {}) as { command?: string; args?: string[]; cwd?: string };
      id += 1;
      const key = `pty_${id}`;
      cmds.push({ command: next.command ?? '', args: next.args ?? [], cwd: next.cwd });
      runs.set(key, input.runs[id - 1] ?? input.runs.at(-1) ?? {});
      return Response.json({ id: key });
    }
    if (path.includes('/v1/pair/')) {
      const value = input.pairs?.[pair] ?? input.pairs?.at(-1) ?? { status: 'pending' };
      pair += 1;
      return Response.json(value);
    }
    return new Response('not found', { status: 404 });
  }) as typeof globalThis.fetch;

  return {
    fetch,
    cmds,
    urls,
    restore: () => {
      globalThis.WebSocket = OriginalSocket;
    },
  };
};

const withStub = async <T>(input: Parameters<typeof stub>[0], fn: (value: ReturnType<typeof stub>) => Promise<T>): Promise<T> => {
  const value = stub(input);
  try {
    return await fn(value);
  } finally {
    value.restore();
  }
};

const pendingPair = (): PairInfo => ({
  id: 'pair_1',
  status: 'pending',
  token: 'tok_1',
  command: pairPush('tok_1', 'http://localhost:8787'),
  expires: new Date(Date.now() + 60_000).toISOString(),
});

describe('pair state predicates', () => {
  test('allows reuse, polling, syncing, and clearing only for valid states', () => {
    expect(canReusePair(pendingPair())).toBe(true);
    expect(canPollPair({ id: 'pair_1', status: 'pending', paired: false, show: true })).toBe(true);
    expect(canSyncPair({ id: 'pair_1', status: 'active', paired: false })).toBe(false);
    expect(canClearPair({ paired: false, id: 'pair_1', status: 'pending' })).toBe(true);
    expect(canAutoPair({ auto: true, show: true, run: false, clear: false, server: true, relay: true, retry: 0, now: 15_000, push: { allowed: true, registered: true } })).toBe(true);
  });
});

describe('fetchWithTimeout', () => {
  test('returns successful responses', async () => {
    const fetch = (async () => new Response('ok', { status: 200 })) as unknown as typeof globalThis.fetch;
    const response = await fetchWithTimeout(fetch, 'http://localhost:4096/pty', {}, 'Push pairing command', 10);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('ok');
  });

  test('fails with a helpful timeout error', async () => {
    let aborted = false;
    const fetch = ((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        aborted = true;
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    })) as typeof globalThis.fetch;
    await expect(fetchWithTimeout(fetch, 'http://localhost:4096/pty', {}, 'Push pairing command', 10)).rejects.toThrow(
      'Push pairing command timed out. Check that the server is reachable and try again.',
    );
    expect(aborted).toBe(true);
  });
});

describe('claimPush', () => {
  test('runs the host command and waits for the relay claim', async () => {
    await withStub({ runs: [{ out: '{\n  "ok": true,\n  "cmd": "pair"\n}' }], pairs: [{ status: 'claimed' }] }, async (value) => {
      const result = await claimPush({ platform: { fetch: value.fetch }, server, token: 'tok_1', relay: 'http://localhost:8787', pairId: 'pair_1' });
      expect(result).toEqual({ ok: true, pair: { status: 'claimed' } });
      expect(value.cmds.map((item) => item.command)).toEqual(['bunx']);
      expect(value.cmds[0]?.args).toContain('--json');
    });
  });

  test('falls back to npx when bunx ends before a relay claim', async () => {
    await withStub({
      runs: [{ out: 'bunx failed' }, { out: '{\n  "ok": true,\n  "cmd": "pair"\n}' }],
      pairs: [{ status: 'pending' }, { status: 'pending' }, { status: 'active' }],
    }, async (value) => {
      const result = await claimPush({ platform: { fetch: value.fetch }, server, token: 'tok_1', relay: 'http://localhost:8787', pairId: 'pair_1' });
      expect(result).toEqual({ ok: true, pair: { status: 'active' } });
      expect(value.cmds.map((item) => item.command)).toEqual(['bunx', 'npx']);
    });
  });

  test('surfaces terminal relay failures', async () => {
    await withStub({ runs: [{ close: false }], pairs: [{ status: 'failed', message: 'pair_failed' }] }, async (value) => {
      await expect(claimPush({ platform: { fetch: value.fetch }, server, token: 'tok_1', relay: 'http://localhost:8787', pairId: 'pair_1' })).rejects.toThrow('pair_failed');
    });
  });
});

describe('runPushSetup', () => {
  test('surfaces structured permission failures', async () => {
    const denied = push({ permission: 'denied', allowed: false, registered: false });
    const platform = {
      fetch: globalThis.fetch,
      pushState: () => denied,
      getPushState: async () => denied,
      getPushPairing: async () => undefined,
      beginPushPairing: async () => pendingPair(),
    };
    // ANEMOS-PATCH: use Bun's typed rejection matcher instead of unsupported toBeInstanceOf.
    await expect(runPushSetup({ platform, server })).rejects.toThrow(PushFail);
    await runPushSetup({ platform, server }).catch((error: unknown) => {
      expect((error as PushFail).issue.code).toBe('permission_denied');
    });
  });

  test('activates an unconfigured host plugin before pairing', async () => {
    await withStub({ runs: [{ out: '{\n  "ok": true,\n  "cmd": "pair"\n}' }], pairs: [{ status: 'claimed' }] }, async (value) => {
      const active: PushState = push({ paired: true, channel: 'ch_1' });
      const platform = {
        fetch: value.fetch,
        pushState: () => push(),
        getPushState: async () => active,
        getPushPairing: async () => ({ id: 'pair_1', status: 'active', channel: 'ch_1', device: 'dev_1' } as PairInfo),
        beginPushPairing: async () => pendingPair(),
      };
      const result = await runPushSetup({ platform, server, relay: 'http://localhost:8787' });
      expect(result.ok).toBe(true);
      expect(value.urls.some((url) => url.endsWith('/global/config'))).toBe(true);
      expect(value.cmds[0]?.args[0]).toBe(PushPlugin.spec);
    });
  });

  test('uses the install fallback when host config is unavailable', async () => {
    await withStub({ runs: [{ out: '{\n  "ok": true,\n  "cmd": "install"\n}' }], pairs: [{ status: 'claimed' }], cfgCode: 404 }, async (value) => {
      const active: PushState = push({ paired: true });
      const platform = {
        fetch: value.fetch,
        pushState: () => push(),
        getPushState: async () => active,
        getPushPairing: async () => ({ id: 'pair_1', status: 'active' } as PairInfo),
        beginPushPairing: async () => pendingPair(),
      };
      const result = await runPushSetup({ platform, server, relay: 'http://localhost:8787' });
      expect(result.ok).toBe(true);
      expect(value.cmds[0]?.args[1]).toBe('install');
      expect(installPair('tok_1', 'http://localhost:8787', 'bunx')).toContain('bunx @anemos/push install --pair tok_1');
    });
  });
});

describe('push issues', () => {
  test('surfaces native registration failures and relay rate limits', () => {
    expect(pushIssue(push({ allowed: true, registered: false, diag: { lastCode: 'apns_register_failed' } }))?.code).toBe('apns_register_failed');
    expect(pushIssue(push({ diag: { lastCode: 'relay_rate_limited', lastError: 'rate_limited' } }))?.code).toBe('relay_rate_limited');
  });

  test('drops stale permission issues after permission is restored', () => {
    // ANEMOS-PATCH: use Bun's supported equality matcher instead of unsupported toBeUndefined.
    expect(mergePushIssue({ code: 'permission_denied', message: 'denied', action: 'settings' }, push())).toBe(undefined);
    expect(mergePushIssue({ code: 'host_install_failed', message: 'failed', action: 'retry' }, push())?.code).toBe('host_install_failed');
  });
});
