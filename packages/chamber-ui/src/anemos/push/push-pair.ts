// ANEMOS-PATCH: framework-neutral fork relay pairing state machine ported for UI 3.

import type { PairInfo, Platform, PushState } from '@/anemos/platform-adapter';
import { addPush, hasPush, installPair, pairPush, PushPlugin } from './push-plugin';

const PTY_TIMEOUT = 60_000;
const CLAIM_WAIT = 5_000;
const CLAIM_POLL = 1_000;
const CLAIM_GAP = 1_000;
const FETCH_MS = 10_000;
const FINISH_GAP = 5_000;
const FINISH_SETTLE = 1_500;
const OUT_LIMIT = 2_000;
const WAIT_MS = 15_000;
const WAIT_GAP = 500;

type PathRes = {
  state?: string;
  directory?: string;
};

type Cfg = {
  plugin?: string[];
};

type Runner = {
  name: 'npx' | 'bunx';
  command: string;
  args: string[];
};

type Mode = 'pair' | 'install';

type PairRes = {
  status?: 'pending' | 'claimed' | 'active' | 'expired' | 'failed';
  message?: string;
  channel_id?: string;
  device_id?: string;
  device_secret?: string;
};

type Read = {
  at: number;
  res?: PairRes;
  err?: Error;
  job?: Promise<PairRes>;
};

type Stream = {
  close: () => void;
  done: Promise<{
    out: string;
    opened: boolean;
    error?: Error;
  }>;
};

type PairSeed = Partial<PairInfo>;
type WaitPair = {
  pair?: PairInfo;
  limited: boolean;
};
type WaitRelay = {
  pair?: PairRes;
  limited: boolean;
};

export type PushHttpConnection = {
  url: string;
  username?: string;
  password?: string;
  authorization?: string;
};

export type PushServerConnection = {
  type?: string;
  http: PushHttpConnection;
};

type Pull = Pick<
  Platform,
  'beginPushPairing' | 'getPushPairing' | 'getPushState' | 'pushState' | 'requestPushPermission' | 'setPushCredentials'
>;

export type PushPhase = 'permission' | 'register' | 'begin' | 'claim' | 'finish';

export type PushIssueCode =
  | 'permission_denied'
  | 'permission_required'
  | 'unsupported'
  | 'apns_register_failed'
  | 'apns_register_timeout'
  | 'missing_token'
  | 'relay_invalid'
  | 'relay_rate_limited'
  | 'relay_unreachable'
  | 'pair_token_missing'
  | 'host_install_failed'
  | 'pair_claim_timeout'
  | 'pair_expired'
  | 'pair_failed'
  | 'repair_needed'
  | 'server_required'
  | 'unknown';

export type PushIssue = {
  code: PushIssueCode;
  message: string;
  detail?: string;
  action: 'retry' | 'settings' | 'none';
};

export type PushSetupInput = {
  platform: Pull & Pick<Platform, 'fetch'>;
  server?: PushServerConnection;
  relay?: string;
  pair?: PairSeed;
  ask?: boolean;
  onPair?: (value: PairInfo) => void;
  onPhase?: (value?: PushPhase) => void;
  onTrace?: (value: string) => void;
};

export type PushSetupResult = {
  ok: true;
  pair: PairInfo;
  push?: PushState;
};

export class PushFail extends Error {
  issue: PushIssue;

  constructor(issue: PushIssue) {
    super(issue.message);
    this.name = 'PushFail';
    this.issue = issue;
  }
}

const args = (token: string, relay: string | undefined, mode: Mode): string[] => {
  const next = [mode, '--pair', token, '--json'];
  if (relay) next.push('--relay', relay);
  return next;
};

const npx = (token: string, prefix: string | undefined, relay: string | undefined, mode: Mode): Runner | undefined => {
  if (!prefix) return undefined;
  return {
    name: 'npx',
    command: 'npx',
    args: ['--yes', '--prefix', prefix, '--package', PushPlugin.spec, PushPlugin.bin, ...args(token, relay, mode)],
  };
};

const bunx = (token: string, relay: string | undefined, mode: Mode): Runner => ({
  name: 'bunx',
  command: 'bunx',
  args: [PushPlugin.spec, ...args(token, relay, mode)],
});

const pairCmd = (token: string | undefined, relay: string | undefined, command?: string): string | undefined => {
  if (!token) return command;
  return pairPush(token, relay);
};

const hostCmd = (token: string, relay: string | undefined, mode: Mode, tool: Runner['name'] = 'npx'): string =>
  mode === 'install' ? installPair(token, relay, tool) : pairPush(token, relay, tool);

const act = (code: PushIssueCode): PushIssue['action'] => {
  switch (code) {
    case 'permission_denied':
      return 'settings';
    case 'unsupported':
    case 'server_required':
      return 'none';
    default:
      return 'retry';
  }
};

const issue = (code: PushIssueCode, message: string, detail?: string): PushIssue => ({
  code,
  message,
  detail,
  action: act(code),
});

const fail = (code: PushIssueCode, message: string, detail?: string): PushFail => new PushFail(issue(code, message, detail));

const text = (value: unknown): string => value instanceof Error ? value.message : String(value);

const limited = (value: unknown): boolean => {
  const next = text(value).trim().toLowerCase();
  return next.includes('rate_limited')
    || next.includes('rate limited')
    || next.includes('too many requests')
    || next.includes('429');
};

const limitMessage = (value?: string): string => {
  if (value && !limited(value)) return value;
  return 'Push relay is temporarily rate limited. Wait a minute and try again.';
};

const timeout = (ms: number) => {
  const abort = new AbortController();
  let hit = false;
  const id = setTimeout(() => {
    hit = true;
    abort.abort();
  }, ms);
  return {
    signal: abort.signal,
    hit: () => hit,
    clear: () => clearTimeout(id),
  };
};

const wait = (ms: number): Promise<void> => new Promise((resolve) => globalThis.setTimeout(resolve, ms));

const mark = (value: boolean | undefined): string => {
  if (value === true) return '1';
  if (value === false) return '0';
  return '-';
};

const brief = (value?: string): string => {
  if (!value) return '-';
  if (value.length <= 24) return value;
  return `${value.slice(0, 12)}...${value.slice(-8)}`;
};

const reads = new Map<string, Read>();

const slot = (relay: string, pairId: string): string => `${relay} ${pairId}`;

const drop = (relay?: string, pairId?: string): void => {
  if (!relay || !pairId) return;
  reads.delete(slot(relay, pairId));
};

const hold = (item: Read, gap: number): number => {
  if (item.err) return gap;
  const state = item.res?.status;
  if (state === 'pending' || state === 'claimed') return Math.min(gap, CLAIM_GAP);
  return gap;
};

const note = (_input: Pick<PushSetupInput, 'onTrace'> | undefined, _value: string): void => undefined;

const listText = (list?: string[]): string => (!list?.length ? '-' : list.join(','));

const pushText = (push?: PushState): string => [
  `perm=${push?.permission ?? '-'}`,
  `allowed=${mark(push?.allowed)}`,
  `registered=${mark(push?.registered)}`,
  `paired=${mark(push?.paired)}`,
  `code=${push?.diag?.lastCode ?? '-'}`,
  `err=${push?.diag?.lastError ?? '-'}`,
].join(' ');

const pairText = (value?: {
  id?: string;
  status?: string;
  expires?: string;
  channel?: string;
  device?: string;
  message?: string;
}): string => [
  `status=${value?.status ?? '-'}`,
  `id=${brief(value?.id)}`,
  `expires=${value?.expires ?? '-'}`,
  `channel=${brief(value?.channel)}`,
  `device=${brief(value?.device)}`,
  `msg=${value?.message ?? '-'}`,
].join(' ');

const terminal = (status?: string): boolean => status === 'active' || status === 'expired' || status === 'failed';

const expired = (value?: string): boolean => {
  if (!value) return false;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return false;
  return time <= Date.now();
};

const reuse = (pair?: PairSeed, relay?: string): PairInfo | undefined => {
  if (!pair?.id || !pair.token) return undefined;
  if (expired(pair.expires)) return undefined;
  if (pair.status === 'active' || pair.status === 'expired') return undefined;
  return {
    id: pair.id,
    status: pair.status ?? 'pending',
    token: pair.token,
    command: pairCmd(pair.token, relay, pair.command),
    expires: pair.expires,
    channel: pair.channel,
    device: pair.device,
    message: pair.message,
  };
};

const clip = (out: string): string => {
  const value = out.trim();
  if (!value) return '';
  if (value.length <= OUT_LIMIT) return value;
  return value.slice(-OUT_LIMIT);
};

const failRun = (runner: Runner['name'], out: string): string => {
  const value = clip(out);
  if (!value) return `Push pairing command failed via ${runner}.`;
  return `Push pairing command failed via ${runner}: ${value}`;
};

const okRun = (out: string): boolean => {
  const value = clip(out).toLowerCase();
  if (!value) return false;
  const ok = value.includes('"ok": true') || value.includes('ok: true');
  const command = value.includes('"cmd": "pair"')
    || value.includes('cmd: pair')
    || value.includes('"cmd": "install"')
    || value.includes('cmd: install');
  return ok && command;
};

export const pushIssue = (push?: PushState): PushIssue | undefined => {
  if (push?.permission === 'unsupported') return issue('unsupported', 'Notifications are unavailable on this device.');
  if (push?.permission === 'denied') return issue('permission_denied', 'Turn on notifications for Anemos in the iPhone Settings app.');

  switch (push?.diag?.lastCode) {
    case 'apns_register_failed':
      return issue('apns_register_failed', 'Apple push registration failed. Try again in a moment.');
    case 'missing_token':
      return issue('missing_token', 'Anemos could not get an Apple push token yet. Try again in a moment.');
    case 'bad_relay':
      return issue('relay_invalid', 'The push relay URL is invalid.');
    case 'relay_rate_limited':
      return issue('relay_rate_limited', limitMessage(push.diag.lastError));
    case 'relay_timeout':
      return issue('relay_unreachable', push.diag.lastError ?? 'The push relay timed out. Check that the relay is reachable and try again.');
    case 'bad_reply':
    case 'bad_pair':
    case 'decode':
    case 'relay_error':
      if (limited(push.diag.lastError)) return issue('relay_rate_limited', limitMessage(push.diag.lastError));
      return issue('pair_failed', push.diag.lastError ?? 'The push relay returned an unexpected response.');
    case 'repair_needed':
    case 'device_not_found':
    case 'bad_device_secret':
      return issue('repair_needed', 'This iPhone needs to re-pair with the OpenCode host.');
  }
  return undefined;
};

export const mergePushIssue = (saved?: PushIssue, push?: PushState): PushIssue | undefined => {
  const native = pushIssue(push);
  if (native) return native;
  if (!saved) return undefined;
  if (push?.paired) return undefined;

  switch (saved.code) {
    case 'permission_denied':
      if (push && push.permission !== 'denied') return undefined;
      break;
    case 'permission_required':
      if (push?.allowed) return undefined;
      break;
    case 'apns_register_failed':
    case 'apns_register_timeout':
    case 'missing_token':
      if (push?.registered) return undefined;
      break;
  }
  return saved;
};

const errIssue = (err: unknown, push?: PushState, phase?: PushPhase): PushIssue => {
  if (err instanceof PushFail) return err.issue;

  const message = text(err).trim();
  const lower = message.toLowerCase();
  if (lower.includes('turn on notifications for anemos')) return issue('permission_denied', message);
  if (lower.includes('enable notifications for anemos')) {
    return issue(push?.permission === 'denied' ? 'permission_denied' : 'permission_required', message);
  }
  if (lower.includes('apns registration failed')) return issue('apns_register_failed', message);
  if (lower.includes('still waiting for apple push registration')) return issue('apns_register_timeout', message);
  if (lower.includes('apns token unavailable')) return issue('missing_token', 'Anemos could not get an Apple push token yet. Try again in a moment.');
  if (lower.includes('apple push token')) return issue('missing_token', message);
  if (lower.includes('connect to an opencode server first')) return issue('server_required', message);
  if (lower.includes('push relay url is invalid')) return issue('relay_invalid', message);
  if (limited(message)) return issue('relay_rate_limited', limitMessage(message));
  if (lower.includes('timed out') && lower.includes('relay')) return issue('relay_unreachable', message);
  if (lower.includes('push pairing relay check')) return issue('pair_failed', message);
  if (lower.includes('push pairing token unavailable')) return issue('pair_token_missing', message);
  if (lower.includes('never observed the claim') || lower.includes('has not finished syncing yet')) return issue('pair_claim_timeout', message);
  if (lower.includes('pairing request expired')) return issue('pair_expired', message);
  if (lower.includes('could not finish pairing') || lower.includes('pairing failed')) return issue('pair_failed', message);
  if (lower.includes('failed via') || lower.includes('notification plugin failed to install') || lower.includes('push pair failed')) {
    return issue('host_install_failed', message);
  }
  if (lower.includes('re-pair this iphone')) return issue('repair_needed', message);

  const next = pushIssue(push);
  if (next) return next;
  if (phase === 'register') return issue('apns_register_timeout', message || 'Anemos is still waiting for Apple push registration.');
  return issue('unknown', message || 'Notification setup failed. Try again.');
};

const pull = async (input: Pull): Promise<PushState | undefined> => {
  const next = input.getPushState ? await input.getPushState().catch(() => undefined) : undefined;
  return next ?? input.pushState?.();
};

const pullPair = async (input: PushSetupInput): Promise<PairInfo | undefined> => {
  if (!input.platform.getPushPairing) return undefined;
  return input.platform.getPushPairing().catch((err) => {
    if (limited(err)) throw err;
    return undefined;
  });
};

const waitPush = async (input: PushSetupInput): Promise<PushState> => {
  const end = Date.now() + WAIT_MS;
  let last = '';
  for (;;) {
    const push = await pull(input.platform);
    const line = pushText(push);
    if (line !== last) {
      last = line;
      note(input, `waitPush ${line}`);
    }
    const nextIssue = pushIssue(push);
    if (nextIssue?.code === 'apns_register_failed' || nextIssue?.code === 'missing_token') throw new PushFail(nextIssue);
    if (push?.permission === 'denied') throw fail('permission_denied', 'Turn on notifications for Anemos in the iPhone Settings app.');
    if (push?.allowed && push.registered) return push;
    if (Date.now() >= end) {
      if (!push?.allowed) throw fail('permission_required', 'Enable notifications for Anemos to finish setup.');
      if (nextIssue) throw new PushFail(nextIssue);
      throw fail('apns_register_timeout', 'Anemos is still waiting for Apple push registration.');
    }
    await wait(WAIT_GAP);
  }
};

const waitDone = async (input: PushSetupInput): Promise<WaitPair> => {
  const end = Date.now() + WAIT_MS;
  let last: PairInfo | undefined;
  let seen = '';
  for (;;) {
    let halt = false;
    const next = await pullPair(input).catch((err) => {
      if (!limited(err)) throw err;
      halt = true;
      note(input, `waitDone limited err=${text(err)}`);
      return last;
    });
    if (next) {
      last = next;
      const line = pairText(next);
      if (line !== seen) {
        seen = line;
        note(input, `waitDone ${line}`);
      }
      input.onPair?.(next);
      if (terminal(next.status)) return { pair: next, limited: false };
    }
    if (halt) return { pair: last, limited: true };
    if (Date.now() >= end) return { pair: last, limited: false };
    await wait(FINISH_GAP);
  }
};

const waitRelayDone = async (input: PushSetupInput, pairId?: string): Promise<WaitRelay> => {
  const relay = input.relay;
  if (!relay || !pairId) return { pair: undefined, limited: false };
  const fetch = input.platform.fetch ?? globalThis.fetch;
  const end = Date.now() + WAIT_MS;
  let last: PairRes | undefined;
  let seen = '';
  while (Date.now() < end) {
    let halt = false;
    const next = await readPair(fetch, relay, pairId, FINISH_GAP).catch((err) => {
      if (limited(err)) {
        halt = true;
        note(input, `waitRelayDone limited err=${text(err)}`);
        return last;
      }
      return undefined;
    });
    if (next) {
      last = next;
      const line = pairText({ id: pairId, status: next.status, channel: next.channel_id, device: next.device_id, message: next.message });
      if (line !== seen) {
        seen = line;
        note(input, `waitRelayDone ${line}`);
      }
      if (terminal(next.status)) return { pair: next, limited: false };
    }
    if (halt) return { pair: last, limited: true };
    await wait(FINISH_GAP);
  }
  return { pair: last, limited: false };
};

const pullRelay = async (input: PushSetupInput, pairId?: string): Promise<WaitRelay> => {
  const relay = input.relay;
  if (!relay || !pairId) return { pair: undefined, limited: false };
  const fetch = input.platform.fetch ?? globalThis.fetch;
  const next = await readPair(fetch, relay, pairId, FINISH_GAP).catch((err) => {
    if (!limited(err)) throw err;
    note(input, `pullRelay limited err=${text(err)}`);
    return undefined;
  });
  if (next) note(input, `pullRelay ${pairText({ id: pairId, status: next.status, channel: next.channel_id, device: next.device_id, message: next.message })}`);
  return { pair: next, limited: !next };
};

const syncPair = async (input: PushSetupInput, pair?: PairRes) => {
  if (pair?.status !== 'active' || !pair.channel_id || !pair.device_id || !pair.device_secret) return undefined;
  note(input, `syncPair channel=${brief(pair.channel_id)} device=${brief(pair.device_id)} secret=${mark(!!pair.device_secret)}`);
  const push = await input.platform.setPushCredentials?.({ channel: pair.channel_id, device: pair.device_id, secret: pair.device_secret });
  note(input, `syncPair done ${pushText(push)}`);
  return {
    push,
    pair: {
      id: input.pair?.id ?? 'active',
      status: 'active' as const,
      channel: pair.channel_id,
      device: pair.device_id,
    },
  };
};

export async function fetchWithTimeout(
  fetch: typeof globalThis.fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  label: string,
  ms = FETCH_MS,
): Promise<Response> {
  const timer = timeout(ms);
  try {
    return await fetch(input, { ...init, signal: timer.signal });
  } catch (err) {
    if (timer.hit()) throw new Error(`${label} timed out. Check that the server is reachable and try again.`);
    throw err;
  } finally {
    timer.clear();
  }
}

const serverAuthHeaders = (http: PushHttpConnection): Record<string, string> => {
  const headers: Record<string, string> = {};
  if (http.authorization) headers.Authorization = http.authorization;
  if (!headers.Authorization && http.username !== undefined && http.password !== undefined) {
    headers.Authorization = `Basic ${btoa(`${http.username}:${http.password}`)}`;
  }
  return headers;
};

const runPty = async (
  fetch: typeof globalThis.fetch,
  conn: PushServerConnection,
  command: string,
  args: string[],
  cwd?: string,
): Promise<string> => {
  const res = await fetchWithTimeout(
    fetch,
    new URL('/pty', conn.http.url),
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...serverAuthHeaders(conn.http),
      },
      body: JSON.stringify({ command, args, cwd }),
    },
    'Push pairing command',
  );
  if (!res.ok) throw new Error(`push pair failed: ${res.status}`);
  const pty = await res.json() as { id: string };
  return pty.id;
};

const watchPty = (conn: PushServerConnection, id: string, input?: Pick<PushSetupInput, 'onTrace'>): Stream => {
  const Socket = globalThis.WebSocket;
  if (!Socket) {
    return {
      close: () => undefined,
      done: Promise.resolve({ out: '', opened: false, error: new Error('Push pairing command stream is unavailable on this device.') }),
    };
  }

  let socket: WebSocket | undefined;
  let settled = false;
  const done = new Promise<{ out: string; opened: boolean; error?: Error }>((resolve) => {
    let opened = false;
    let out = '';
    let failed: Error | undefined;
    let timer: ReturnType<typeof globalThis.setTimeout> | undefined;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) globalThis.clearTimeout(timer);
      socket?.removeEventListener('open', onOpen);
      socket?.removeEventListener('message', onMessage);
      socket?.removeEventListener('error', onError);
      socket?.removeEventListener('close', onClose);
      resolve({
        out,
        opened,
        error: error ?? failed ?? (!opened ? new Error('Push pairing command stream closed before it could connect.') : undefined),
      });
    };

    const onOpen = () => {
      opened = true;
      note(input, `claim stream open pty=${brief(id)}`);
      if (timer !== undefined) {
        globalThis.clearTimeout(timer);
        timer = undefined;
      }
    };
    const onMessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        out += event.data;
        return;
      }
      if (!(event.data instanceof ArrayBuffer)) return;
      const bytes = new Uint8Array(event.data);
      if (bytes[0] !== 0) return;
    };
    const onError = () => {
      note(input, `claim stream err pty=${brief(id)}`);
      failed = new Error('Push pairing command stream failed. Check that the host is reachable and try again.');
    };
    const onClose = () => {
      note(input, `claim stream close pty=${brief(id)} opened=${mark(opened)}`);
      finish();
    };

    try {
      const url = new URL(`/pty/${id}/connect`, conn.http.url);
      url.searchParams.set('cursor', '0');
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      if (conn.http.username !== undefined) url.username = conn.http.username;
      if (conn.http.password !== undefined) url.password = conn.http.password;
      socket = new Socket(url.toString());
      socket.binaryType = 'arraybuffer';
      socket.addEventListener('open', onOpen);
      socket.addEventListener('message', onMessage);
      socket.addEventListener('error', onError);
      socket.addEventListener('close', onClose);
      timer = globalThis.setTimeout(() => {
        finish(new Error('Push pairing command stream timed out. Check that the host is reachable and try again.'));
        try {
          socket?.close(1000);
        } catch {
          return;
        }
      }, FETCH_MS);
    } catch (err) {
      finish(new Error(`Push pairing command stream could not connect: ${text(err)}`));
    }
  });

  return {
    close: () => {
      if (settled) return;
      try {
        socket?.close(1000);
      } catch {
        return;
      }
    },
    done,
  };
};

const readPair = async (
  fetch: typeof globalThis.fetch,
  relay: string,
  pairId: string,
  gap = CLAIM_GAP,
): Promise<PairRes> => {
  const id = slot(relay, pairId);
  const now = Date.now();
  const prev = reads.get(id);
  if (prev?.job) return prev.job;
  if (prev && now - prev.at < hold(prev, gap)) {
    if (prev.err) throw prev.err;
    if (prev.res) return prev.res;
  }

  const next: Read = prev ?? { at: 0 };
  const job = (async () => {
    try {
      const res = await fetchWithTimeout(
        fetch,
        new URL(`/v1/pair/${encodeURIComponent(pairId)}`, relay),
        { cache: 'no-store' },
        'Push pairing relay check',
      );
      if (!res.ok) throw new Error(`Push pairing relay check failed: ${res.status}`);
      const data = await res.json() as PairRes;
      next.at = Date.now();
      next.res = data;
      next.err = undefined;
      return data;
    } catch (err) {
      const failError = err instanceof Error ? err : new Error(text(err));
      next.at = Date.now();
      next.err = failError;
      next.res = undefined;
      throw failError;
    } finally {
      next.job = undefined;
      reads.set(id, next);
    }
  })();
  next.job = job;
  reads.set(id, next);
  return job;
};

const readPath = async (fetch: typeof globalThis.fetch, conn: PushServerConnection): Promise<PathRes | undefined> => {
  const res = await fetchWithTimeout(fetch, new URL('/path', conn.http.url), { headers: serverAuthHeaders(conn.http) }, 'Push pairing path check');
  if (!res.ok) return undefined;
  return await res.json() as PathRes;
};

const readCfg = async (fetch: typeof globalThis.fetch, conn: PushServerConnection): Promise<Cfg> => {
  const res = await fetchWithTimeout(
    fetch,
    new URL('/global/config', conn.http.url),
    { headers: serverAuthHeaders(conn.http), cache: 'no-store' },
    'Push pairing host config check',
  );
  if (!res.ok) throw new Error(`Push pairing host config check failed: ${res.status}`);
  return await res.json() as Cfg;
};

const patchCfg = async (fetch: typeof globalThis.fetch, conn: PushServerConnection, cfg: Cfg): Promise<Cfg> => {
  const res = await fetchWithTimeout(
    fetch,
    new URL('/global/config', conn.http.url),
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...serverAuthHeaders(conn.http) },
      body: JSON.stringify(cfg),
    },
    'Push pairing host config update',
  );
  if (!res.ok) throw new Error(`Push pairing host config update failed: ${res.status}`);
  return await res.json() as Cfg;
};

const postDispose = async (fetch: typeof globalThis.fetch, conn: PushServerConnection): Promise<void> => {
  const res = await fetchWithTimeout(
    fetch,
    new URL('/global/dispose', conn.http.url),
    { method: 'POST', headers: serverAuthHeaders(conn.http) },
    'Push pairing host recycle',
  );
  if (!res.ok) throw new Error(`Push pairing host recycle failed: ${res.status}`);
};

const waitHost = async (
  fetch: typeof globalThis.fetch,
  conn: PushServerConnection,
  input?: Pick<PushSetupInput, 'onTrace'>,
): Promise<void> => {
  const end = Date.now() + WAIT_MS;
  let err: unknown;
  while (Date.now() < end) {
    try {
      const path = await readPath(fetch, conn);
      if (path) {
        note(input, `waitHost ok state=${brief(path.state)} dir=${brief(path.directory)}`);
        return;
      }
    } catch (cause) {
      err = cause;
    }
    await wait(WAIT_GAP);
  }
  throw err ?? new Error('Push plugin host refresh timed out. Check that the host is reachable and try again.');
};

const recycleHost = async (
  fetch: typeof globalThis.fetch,
  conn: PushServerConnection,
  input?: Pick<PushSetupInput, 'onTrace'>,
): Promise<void> => {
  let err: unknown;
  note(input, 'recycleHost start');
  await postDispose(fetch, conn).catch((cause) => {
    err = cause;
  });
  try {
    await waitHost(fetch, conn, input);
    note(input, 'recycleHost ok');
  } catch (cause) {
    throw err ?? cause;
  }
};

const ensureHost = async (input: {
  platform: Pick<Platform, 'fetch'>;
  server: PushServerConnection;
  onTrace?: (value: string) => void;
}): Promise<void> => {
  const fetch = input.platform.fetch ?? globalThis.fetch;
  const conn = input.server;
  try {
    const cfg = await readCfg(fetch, conn);
    note(input, `ensureHost cfg=${listText(cfg?.plugin)}`);
    if (!hasPush(cfg?.plugin)) {
      const next = addPush(cfg?.plugin);
      note(input, `ensureHost patch=${listText(next)}`);
      await patchCfg(fetch, conn, { plugin: next });
    }
    await recycleHost(fetch, conn, input);
  } catch (err) {
    note(input, `ensureHost err=${text(err)}`);
    throw fail('host_install_failed', `Could not activate the OpenCode notification plugin on the host: ${text(err)}`);
  }
};

const waitClaim = async (
  fetch: typeof globalThis.fetch,
  relay: string,
  pairId: string,
  ms = CLAIM_WAIT,
  input?: Pick<PushSetupInput, 'onTrace'>,
): Promise<PairRes | undefined> => {
  const deadline = Date.now() + ms;
  let last: PairRes | undefined;
  let err: unknown;
  let seen = '';
  while (Date.now() < deadline) {
    try {
      last = await readPair(fetch, relay, pairId, CLAIM_GAP);
      err = undefined;
    } catch (cause) {
      if (limited(cause)) throw cause;
      err = cause;
    }
    const line = pairText({ id: pairId, status: last?.status, channel: last?.channel_id, device: last?.device_id, message: last?.message });
    if (line !== seen) {
      seen = line;
      note(input, `waitClaim ${line}`);
    }
    if (!last?.status || last.status === 'pending') {
      await wait(CLAIM_POLL);
      continue;
    }
    return last;
  }
  if (err && (!last?.status || last.status === 'pending')) throw err;
  return last;
};

export async function claimPush(input: {
  platform: Pick<Platform, 'fetch'>;
  server?: PushServerConnection;
  token: string;
  relay?: string;
  pairId?: string;
  mode?: Mode;
  onTrace?: (value: string) => void;
}): Promise<{ ok: true; pair?: PairRes }> {
  const conn = input.server;
  if (!conn) throw fail('server_required', 'Connect to an OpenCode server first.');
  const fetch = input.platform.fetch ?? globalThis.fetch;
  const relay = input.relay;
  const pairId = input.pairId;
  const mode = input.mode ?? 'pair';
  const path = await readPath(fetch, conn).catch(() => undefined);
  const prefix = path?.state;
  const cwd = prefix || path?.directory;
  const runs = [bunx(input.token, relay, mode), npx(input.token, prefix, relay, mode)].filter((item): item is Runner => !!item);
  note(input, `claim start mode=${mode} relay=${relay ?? '-'} pair=${brief(pairId)} cwd=${brief(cwd)} prefix=${brief(prefix)} runs=${runs.map((item) => item.name).join(',')}`);
  drop(relay, pairId);
  let last: PushFail | undefined;

  for (const runner of runs) {
    drop(relay, pairId);
    note(input, `claim runner=${runner.name}`);
    let id: string;
    try {
      id = await runPty(fetch, conn, runner.command, runner.args, cwd);
      note(input, `claim pty=${brief(id)}`);
    } catch (err) {
      note(input, `claim pty err=${text(err)}`);
      throw fail('host_install_failed', text(err));
    }
    const stream = watchPty(conn, id, input);
    if (!relay || !pairId) {
      const result = await stream.done;
      if (result.error && !result.opened) throw fail('host_install_failed', result.error.message);
      return { ok: true };
    }

    let done: { out: string; opened: boolean; error?: Error } | undefined;
    let pairSeen: PairRes | undefined;
    void stream.done.then((value) => {
      done = value;
      return value;
    }).catch((err) => {
      done = { out: '', opened: false, error: err instanceof Error ? err : new Error(text(err)) };
    });

    const deadline = Date.now() + PTY_TIMEOUT;
    let seen = '';
    for (;;) {
      if (Date.now() >= deadline) {
        stream.close();
        throw fail('host_install_failed', 'Push pairing command timed out. Check that the host is reachable and try again.');
      }
      const pair = await readPair(fetch, relay, pairId, CLAIM_GAP).catch((err) => {
        if (limited(err)) throw err;
        return undefined;
      });
      const line = pairText({ id: pairId, status: pair?.status, channel: pair?.channel_id, device: pair?.device_id, message: pair?.message });
      if (line !== seen) {
        seen = line;
        note(input, `claim poll ${line}`);
      }
      if (pair?.status === 'active' || pair?.status === 'claimed') pairSeen = pair;
      if (pair?.status === 'failed') {
        stream.close();
        throw fail('pair_failed', pair.message || 'The relay reported that push pairing failed.');
      }
      if (pair?.status === 'expired') {
        stream.close();
        throw fail('pair_expired', 'This pairing request expired before the host finished pairing this iPhone.');
      }
      if (done) break;
      await Promise.race([stream.done, wait(CLAIM_POLL)]);
    }

    const result = done ?? await stream.done;
    const out = clip(result.out);
    const good = okRun(out);
    note(input, `claim result runner=${runner.name} opened=${mark(result.opened)} good=${mark(good)} err=${result.error ? result.error.message : '-'} out=${out || '-'}`);
    const pair = pairSeen?.status === 'active'
      ? pairSeen
      : await waitClaim(fetch, relay, pairId, pairSeen?.status === 'claimed' || good || result.error ? WAIT_MS : out ? CLAIM_POLL : CLAIM_WAIT, input);
    if (pair?.status === 'active' || pair?.status === 'claimed') {
      note(input, `claim ok runner=${runner.name} ${pairText({ id: pairId, status: pair.status, message: pair.message })}`);
      return { ok: true, pair };
    }
    if (pair?.status === 'expired') throw fail('pair_expired', 'This pairing request expired before the host finished pairing this iPhone.');
    if (pair?.status === 'failed') throw fail('pair_failed', pair.message || 'The relay reported that push pairing failed.');
    if (good) {
      last = fail('pair_claim_timeout', `Push pairing command finished via ${runner.name}, but the relay never observed the claim.`, out || undefined);
      note(input, `claim timeout runner=${runner.name}`);
      break;
    }
    if (out) {
      last = fail('host_install_failed', failRun(runner.name, result.out), clip(result.out) || undefined);
      note(input, `claim fail runner=${runner.name} out`);
      continue;
    }
    if (result.error) {
      last = fail('host_install_failed', result.error.message);
      note(input, `claim fail runner=${runner.name} err=${result.error.message}`);
      continue;
    }
    last = fail('pair_claim_timeout', `Push pairing command ended via ${runner.name}, but the relay never observed the claim.`);
    note(input, `claim miss runner=${runner.name}`);
  }
  if (last) throw last;
  note(input, 'claim fail no_runner');
  throw fail('host_install_failed', `The OpenCode host could not finish pairing this iPhone. Run ${hostCmd(input.token, relay, mode)} or ${hostCmd(input.token, relay, mode, 'bunx')} on the host and try again.`);
}

export async function runPushSetup(input: PushSetupInput): Promise<PushSetupResult> {
  const platform = input.platform;
  if (!platform.beginPushPairing || !platform.getPushPairing || !platform.getPushState) throw fail('unsupported', 'Push pairing is unavailable on this device.');

  let push = await pull(platform);
  let phase: PushPhase | undefined;
  note(input, `start ${pushText(push)}`);

  try {
    if (push?.permission === 'unsupported') throw fail('unsupported', 'Notifications are unavailable on this device.');
    if (!push?.allowed) {
      if (push?.permission === 'denied') throw fail('permission_denied', 'Turn on notifications for Anemos in the iPhone Settings app.');
      if (!input.ask || !platform.requestPushPermission) throw fail('permission_required', 'Enable notifications for Anemos to finish setup.');
      phase = 'permission';
      input.onPhase?.(phase);
      note(input, 'phase permission');
      push = await platform.requestPushPermission();
      note(input, `permission ${pushText(push)}`);
      if (!push.allowed) {
        throw fail(push.permission === 'denied' ? 'permission_denied' : 'permission_required', push.permission === 'denied' ? 'Turn on notifications for Anemos in the iPhone Settings app.' : 'Enable notifications for Anemos to finish setup.');
      }
    }
    if (!push.registered) {
      phase = 'register';
      input.onPhase?.(phase);
      note(input, 'phase register');
      push = await waitPush(input);
      note(input, `register ${pushText(push)}`);
    }
    if (!input.server) throw fail('server_required', 'Connect to an OpenCode server first.');

    let pair = reuse(input.pair, input.relay);
    if (pair) note(input, `reuse ${pairText(pair)}`);
    if (!pair) {
      phase = 'begin';
      input.onPhase?.(phase);
      note(input, 'phase begin');
      pair = await platform.beginPushPairing();
      pair = { ...pair, command: pairCmd(pair.token, input.relay, pair.command) };
      note(input, `begin ${pairText(pair)}`);
      input.onPair?.(pair);
    }
    if (!pair.token) {
      note(input, 'pair token missing, polling native pair');
      const next = await pullPair(input);
      if (next) {
        pair = { ...next, command: pairCmd(next.token, input.relay, next.command) };
        note(input, `pair poll ${pairText(pair)}`);
        input.onPair?.(pair);
      }
    }
    if (!pair.token) throw fail('pair_token_missing', 'Push pairing token unavailable.');
    const token = pair.token;

    phase = 'claim';
    input.onPhase?.(phase);
    note(input, 'phase claim');
    let legacy = false;
    await ensureHost({ platform, server: input.server, onTrace: input.onTrace }).catch((err) => {
      legacy = true;
      note(input, `claim legacy err=${text(err)}`);
    });
    const mode: Mode = legacy ? 'install' : 'pair';
    if (legacy) {
      pair = { ...pair, command: hostCmd(token, input.relay, mode) };
      note(input, `claim legacy ${pair.command}`);
      input.onPair?.(pair);
    }
    const claim = await claimPush({ platform, server: input.server, token, relay: input.relay, pairId: pair.id, mode, onTrace: input.onTrace });
    note(input, 'claim done');

    phase = 'finish';
    input.onPhase?.(phase);
    note(input, 'phase finish');
    let limitedHit = false;
    let done: PairInfo | undefined = claim.pair?.status === 'active'
      ? { id: pair.id, status: 'active', channel: claim.pair.channel_id, device: claim.pair.device_id, message: claim.pair.message }
      : undefined;
    let relayDone = claim.pair;
    note(input, `finish seed ${pairText({ id: pair.id, status: relayDone?.status, message: relayDone?.message })}`);
    let synced = await syncPair(input, relayDone);
    if (!done) {
      note(input, `finish settle ms=${FINISH_SETTLE}`);
      await wait(FINISH_SETTLE);
    }
    if (!done) {
      note(input, 'finish pull start');
      done = await pullPair(input).catch((err) => {
        if (!limited(err)) throw err;
        limitedHit = true;
        note(input, `finish pull limited err=${text(err)}`);
        return undefined;
      });
    }
    if (done) {
      note(input, `finish pull ${pairText(done)}`);
      input.onPair?.(done);
    }
    if (!terminal(done?.status) && (done?.status === 'claimed' || relayDone?.status === 'claimed')) {
      note(input, 'finish pull relay');
      const relay = await pullRelay(input, pair.id);
      limitedHit = limitedHit || relay.limited;
      relayDone = relay.pair ?? relayDone;
      synced = await syncPair(input, relayDone);
      done = synced?.pair ?? done;
    }
    if (!terminal(done?.status)) {
      note(input, 'finish wait native');
      const native = await waitDone(input);
      limitedHit = limitedHit || native.limited;
      done = native.pair;
    }
    if (!terminal(done?.status)) {
      note(input, limitedHit ? 'finish relay once' : 'finish wait relay');
      const relay = limitedHit ? await pullRelay(input, pair.id) : await waitRelayDone(input, pair.id);
      limitedHit = limitedHit || relay.limited;
      relayDone = relay.pair;
      synced = await syncPair(input, relayDone);
      done = synced?.pair ?? done;
    } else {
      done = synced?.pair ?? done;
    }
    push = synced?.push ?? await pull(platform);
    note(input, `finish push ${pushText(push)}`);

    if (push?.paired || done?.status === 'active') {
      const next: PairInfo = {
        ...(pair ?? {}),
        ...(done ?? {}),
        id: done?.id ?? pair.id,
        status: 'active',
        token: undefined,
        message: undefined,
        channel: done?.channel ?? pair.channel,
        device: done?.device ?? pair.device,
      };
      input.onPair?.(next);
      note(input, `success ${pairText(next)} ${pushText(push)}`);
      return { ok: true, pair: next, push };
    }
    if (done?.status === 'expired') throw fail('pair_expired', 'This pairing request expired before the iPhone finished syncing.');
    if (done?.status === 'failed') throw fail('pair_failed', done.message || 'The OpenCode host could not finish pairing this iPhone.');
    if (limitedHit) throw fail('relay_rate_limited', limitMessage());
    throw fail('pair_claim_timeout', 'The OpenCode host claimed the pair, but this iPhone has not finished syncing yet.');
  } catch (err) {
    note(input, `fail phase=${phase ?? '-'} err=${text(err)}`);
    push = (await pull(platform).catch(() => undefined)) ?? push;
    note(input, `fail push ${pushText(push)}`);
    throw new PushFail(errIssue(err, push, phase));
  } finally {
    note(input, `stop phase=${phase ?? '-'}`);
    input.onPhase?.();
  }
}
