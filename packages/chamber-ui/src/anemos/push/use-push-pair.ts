// ANEMOS-PATCH: React shell for the fork relay pairing state machine.

import * as React from 'react';
import type { PairInfo, PairState, Platform, PushState } from '@/anemos/platform-adapter';
import {
  mergePushIssue,
  PushFail,
  type PushIssue,
  type PushPhase,
  runPushSetup,
  type PushServerConnection,
} from './push-pair';

const RETRY_MS = 15_000;
const POLL_MS = 5_000;
const PAIR_STORAGE_KEY = 'anemos.push.pair.v1';

export type Pair = {
  id?: string;
  status?: PairState;
  token?: string;
  command?: string;
  expires?: string;
  channel?: string;
  device?: string;
  message?: string;
  code?: PushIssue['code'];
  detail?: string;
  action?: PushIssue['action'];
  auto: boolean;
  updated: number;
};

const emptyPair = (): Pair => ({ auto: false, updated: 0 });

const expired = (value?: string): boolean => {
  if (!value) return false;
  const time = Date.parse(value);
  return !Number.isNaN(time) && time <= Date.now();
};

export const canPollPair = (input: {
  id?: string;
  status?: PairState;
  expires?: string;
  paired: boolean;
  show: boolean;
}): boolean => {
  if (!input.show || input.paired || !input.id) return false;
  if (expired(input.expires)) return false;
  return input.status === 'pending' || input.status === 'claimed';
};

export const canReusePair = (input: { id?: string; status?: PairState; token?: string; expires?: string }): boolean => {
  if (!input.id || !input.token) return false;
  if (expired(input.expires)) return false;
  return input.status !== 'active' && input.status !== 'expired';
};

export const canSyncPair = (input: { id?: string; status?: PairState; expires?: string; paired: boolean }): boolean => {
  if (input.paired) return false;
  if (!input.id) return true;
  if (input.status === 'active') return false;
  return !canPollPair({ id: input.id, status: input.status, expires: input.expires, paired: false, show: true });
};

export const canClearPair = (input: { paired: boolean; id?: string; status?: PairState }): boolean => {
  if (input.paired) return true;
  if (input.id) return true;
  return input.status === 'pending' || input.status === 'claimed';
};

export const canAutoPair = (input: {
  auto: boolean;
  show: boolean;
  run: boolean;
  clear: boolean;
  server: boolean;
  relay: boolean;
  retry: number;
  now: number;
  push?: {
    allowed?: boolean;
    registered?: boolean;
    paired?: boolean;
  };
}): boolean => {
  if (!input.auto) return false;
  if (!input.show || input.run || input.clear) return false;
  if (!input.server || !input.relay) return false;
  if (!input.push?.allowed || !input.push.registered || input.push.paired) return false;
  return input.now - input.retry >= RETRY_MS;
};

export const relaySwitched = (input: { prev?: string; next?: string }): boolean => input.prev !== undefined && input.prev !== input.next;

const limited = (err: unknown): boolean => {
  const value = (err instanceof Error ? err.message : String(err)).trim().toLowerCase();
  return value.includes('rate_limited') || value.includes('rate limited') || value.includes('too many requests') || value.includes('429');
};

export type PushPairController = {
  ready: boolean;
  pair: Pair;
  push?: PushState;
  issue?: PushIssue;
  auto: boolean;
  running: boolean;
  clearing: boolean;
  phase?: PushPhase;
  attempt: number;
  source?: 'settings' | 'auto';
  setup: (options?: { ask?: boolean; source?: 'settings' | 'auto' }) => Promise<boolean>;
  clear: () => Promise<PushState | undefined>;
  refresh: () => Promise<PushState | undefined>;
};

export const usePushPair = (
  platform: Platform,
  server?: PushServerConnection,
  relay?: string,
): PushPairController => {
  const [pair, setPairState] = React.useState<Pair>(emptyPair);
  const [push, setPush] = React.useState<PushState | undefined>(() => platform.pushState?.());
  const [ready, setReady] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const [phase, setPhase] = React.useState<PushPhase | undefined>(undefined);
  const [attempt, setAttempt] = React.useState(0);
  const [source, setSource] = React.useState<'settings' | 'auto' | undefined>(undefined);
  const [show, setShow] = React.useState(() => typeof document === 'undefined' || document.visibilityState === 'visible');
  const [retry, setRetry] = React.useState(0);
  const [tick, setTick] = React.useState(0);
  const pairRef = React.useRef(pair);
  const pushRef = React.useRef(push);
  const relayRef = React.useRef<string | undefined>(relay);
  const runningRef = React.useRef(false);
  const clearingRef = React.useRef(false);
  const storage = React.useMemo(() => platform.storage('openchamber.push'), [platform]);

  pushRef.current = push;

  const commitPair = React.useCallback((value?: Partial<PairInfo>, options?: { auto?: boolean; updated?: number }) => {
    const previous = pairRef.current;
    let next: Pair = {
      id: value?.id,
      status: value?.status,
      token: value?.token,
      command: value?.command,
      expires: value?.expires,
      channel: value?.channel,
      device: value?.device,
      message: value?.message,
      code: undefined,
      detail: undefined,
      action: undefined,
      auto: options?.auto ?? previous.auto,
      updated: options?.updated ?? (value ? Date.now() : 0),
    };
    const sameValue = previous.id === next.id
      && previous.status === next.status
      && previous.token === next.token
      && previous.command === next.command
      && previous.expires === next.expires
      && previous.channel === next.channel
      && previous.device === next.device
      && previous.message === next.message
      && previous.code === next.code
      && previous.detail === next.detail
      && previous.action === next.action
      && previous.auto === next.auto;
    if (sameValue && options?.updated === undefined) next = { ...next, updated: previous.updated };
    if (
      previous.id === next.id
      && previous.status === next.status
      && previous.token === next.token
      && previous.command === next.command
      && previous.expires === next.expires
      && previous.channel === next.channel
      && previous.device === next.device
      && previous.message === next.message
      && previous.code === next.code
      && previous.detail === next.detail
      && previous.action === next.action
      && previous.auto === next.auto
      && previous.updated === next.updated
    ) return;
    pairRef.current = next;
    setPairState(next);
    void storage.setItem(PAIR_STORAGE_KEY, JSON.stringify(next));
  }, [storage]);

  const stop = React.useCallback((nextIssue: PushIssue, value?: Partial<PairInfo>) => {
    const previous = pairRef.current;
    const next: Pair = {
      id: value?.id ?? previous.id,
      status: value?.status ?? previous.status,
      token: value?.token ?? previous.token,
      command: value?.command ?? previous.command,
      expires: value?.expires ?? previous.expires,
      channel: value?.channel ?? previous.channel,
      device: value?.device ?? previous.device,
      message: nextIssue.message,
      code: nextIssue.code,
      detail: nextIssue.detail,
      action: nextIssue.action,
      auto: false,
      updated: Date.now(),
    };
    pairRef.current = next;
    setPairState(next);
    void storage.setItem(PAIR_STORAGE_KEY, JSON.stringify(next));
  }, [storage]);

  const sync = React.useCallback((value: PairInfo, options?: { auto?: boolean }) => {
    if (value.status === 'failed') {
      stop({ code: 'pair_failed', message: value.message || 'The OpenCode host could not finish pairing this iPhone.', action: 'retry' }, value);
      return;
    }
    if (value.status === 'expired') {
      stop({ code: 'pair_expired', message: value.message || 'This pairing request expired before the iPhone finished syncing.', action: 'retry' }, value);
      return;
    }
    commitPair(value, { auto: options?.auto ?? pairRef.current.auto });
    if (value.status === 'active' && platform.getPushState) void platform.getPushState().then(setPush).catch(() => undefined);
  }, [commitPair, platform, stop]);

  const refresh = React.useCallback(async (): Promise<PushState | undefined> => {
    const value = platform.getPushState ? await platform.getPushState().catch(() => undefined) : undefined;
    if (value) {
      pushRef.current = value;
      setPush(value);
    }
    setTick((current) => current + 1);
    return value;
  }, [platform]);

  React.useEffect(() => {
    let active = true;
    void storage.getItem(PAIR_STORAGE_KEY).then((value) => {
      if (!active) return;
      if (value) {
        try {
          const parsed = JSON.parse(value) as Partial<Pair>;
          const next: Pair = {
            ...emptyPair(),
            ...parsed,
            auto: parsed.auto === true,
            updated: typeof parsed.updated === 'number' ? parsed.updated : 0,
          };
          pairRef.current = next;
          setPairState(next);
        } catch {
          void storage.removeItem(PAIR_STORAGE_KEY);
        }
      }
      setReady(true);
    }).catch(() => {
      if (active) setReady(true);
    });
    void refresh();
    return () => {
      active = false;
    };
  }, [refresh, storage]);

  React.useEffect(() => {
    if (!relaySwitched({ prev: relayRef.current, next: relay })) {
      relayRef.current = relay;
      return;
    }
    relayRef.current = relay;
    commitPair(undefined, { auto: pairRef.current.auto, updated: pairRef.current.auto ? 0 : pairRef.current.updated });
    setRetry(0);
    setTick((current) => current + 1);
  }, [commitPair, relay]);

  React.useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const syncVisibility = () => {
      setShow(document.visibilityState === 'visible');
      setTick((current) => current + 1);
    };
    const wake = () => {
      setTick((current) => current + 1);
      void refresh();
    };
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    window.addEventListener('focus', wake);
    window.addEventListener('online', wake);
    window.addEventListener('opencode:resume', wake);
    return () => {
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('focus', wake);
      window.removeEventListener('online', wake);
      window.removeEventListener('opencode:resume', wake);
    };
  }, [refresh]);

  React.useEffect(() => {
    const value = push;
    if (value?.paired) {
      commitPair({ id: pairRef.current.id ?? 'active', status: 'active', channel: value.channel, device: pairRef.current.device }, { auto: true });
      return;
    }
    if (!value || pair.status !== 'active') return;
    commitPair(undefined, { auto: pair.auto });
  }, [commitPair, pair.auto, pair.status, push]);

  React.useEffect(() => {
    if (!platform.getPushPairing || running || clearing || !canSyncPair({ id: pair.id, status: pair.status, expires: pair.expires, paired: push?.paired === true })) return;
    let active = true;
    const getPairing = platform.getPushPairing;
    void getPairing().then((value) => {
      if (active && value) sync(value, { auto: false });
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [clearing, platform, pair, push?.paired, running, sync, tick]);

  React.useEffect(() => {
    if ((pair.status !== 'pending' && pair.status !== 'claimed') || !expired(pair.expires)) return;
    stop({ code: 'pair_expired', message: 'This pairing request expired before the iPhone finished syncing.', action: 'retry' }, { status: 'expired' });
  }, [pair.expires, pair.status, stop, tick]);

  React.useEffect(() => {
    if (!platform.getPushPairing || running || clearing || !canPollPair({ id: pair.id, status: pair.status, expires: pair.expires, paired: push?.paired === true, show })) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const step = async () => {
      if (!active || expired(pairRef.current.expires)) {
        if (active && !pushRef.current?.paired) stop({ code: 'pair_expired', message: 'This pairing request expired before the iPhone finished syncing.', action: 'retry' }, { status: 'expired' });
        return;
      }
      const getPairing = platform.getPushPairing;
      if (!getPairing) return;
      await getPairing().then((value) => {
        if (active && value) sync(value);
      }).catch((err) => {
        if (!active || !limited(err)) return;
        stop({ code: 'relay_rate_limited', message: 'Push relay is temporarily rate limited. Wait a minute and try again.', action: 'retry' }, { status: 'failed' });
      });
      if (active) timer = setTimeout(() => void step(), POLL_MS);
    };
    void step();
    return () => {
      active = false;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [clearing, pair, platform, push?.paired, running, show, stop, sync]);

  const clear = React.useCallback(async (): Promise<PushState | undefined> => {
    if (!platform.clearPushPairing || clearingRef.current) return undefined;
    clearingRef.current = true;
    setClearing(true);
    try {
      const value = await platform.clearPushPairing();
      commitPair(undefined, { auto: false, updated: Date.now() });
      setPush(value);
      return value;
    } finally {
      clearingRef.current = false;
      setClearing(false);
    }
  }, [commitPair, platform]);

  const setup = React.useCallback(async (options?: { ask?: boolean; source?: 'settings' | 'auto' }): Promise<boolean> => {
    if (runningRef.current || clearingRef.current) return false;
    runningRef.current = true;
    setRunning(true);
    setPhase(undefined);
    setAttempt((value) => value + 1);
    setSource(options?.source ?? 'settings');
    try {
      const result = await runPushSetup({
        platform,
        server,
        relay,
        pair: pairRef.current,
        ask: options?.ask,
        onPhase: setPhase,
        onPair: (value) => commitPair(value, { auto: options?.source === 'auto' ? true : pairRef.current.auto }),
      });
      commitPair(result.pair, { auto: true });
      if (result.push) setPush(result.push);
      return true;
    } catch (err) {
      if (err instanceof PushFail) {
        stop(err.issue);
        throw err;
      }
      throw err;
    } finally {
      runningRef.current = false;
      setRunning(false);
      setPhase(undefined);
    }
  }, [commitPair, platform, relay, server, stop]);

  React.useEffect(() => {
    if (!canAutoPair({
      auto: pair.auto,
      show,
      run: running,
      clear: clearing,
      server: !!server,
      relay: !!relay,
      retry,
      now: Date.now(),
      push,
    })) return;
    const now = Date.now();
    setRetry(now);
    void setup({ ask: false, source: 'auto' }).catch(() => undefined);
  }, [clearing, pair.auto, push, relay, retry, running, server, setup, show, tick]);

  const issueValue = React.useMemo(() => {
    const saved = pair.code
      ? { code: pair.code, message: pair.message ?? 'Notification setup failed.', detail: pair.detail, action: pair.action ?? 'retry' }
      : undefined;
    return mergePushIssue(saved, push);
  }, [pair.code, pair.detail, pair.action, pair.message, push]);

  return {
    ready,
    pair,
    push,
    issue: issueValue,
    auto: pair.auto,
    running,
    clearing,
    phase,
    attempt,
    source,
    setup,
    clear,
    refresh,
  };
};
