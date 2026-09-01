// ANEMOS-PATCH: persist the fork relay URL without coupling the React UI to Solid persistence.

import * as React from 'react';
import type { Platform } from '@/anemos/platform-adapter';

export const DEFAULT_PUSH_RELAY_URL = 'https://whisper.clankercontext.com';
export const PUSH_RELAY_STORAGE_KEY = 'anemos.push.relay.v1';

export const normalizePushRelayURL = (input?: string): string | undefined => {
  const value = input?.trim();
  if (!value) return undefined;
  const next = /^https?:\/\//.test(value) ? value : `http://${value}`;
  try {
    const url = new URL(next);
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/+$/, '');
  } catch {
    return undefined;
  }
};

export type PushRelayController = {
  ready: boolean;
  current: string;
  custom?: string;
  set: (value?: string) => void;
  clear: () => void;
};

export const usePushRelay = (platform: Platform): PushRelayController => {
  const [custom, setCustom] = React.useState<string | undefined>(undefined);
  const [ready, setReady] = React.useState(false);
  const storage = React.useMemo(() => platform.storage('openchamber.push'), [platform]);

  React.useEffect(() => {
    let active = true;
    void storage.getItem(PUSH_RELAY_STORAGE_KEY).then((value) => {
      if (!active) return;
      setCustom(normalizePushRelayURL(value ?? undefined));
      setReady(true);
    }).catch(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, [storage]);

  const current = custom ?? DEFAULT_PUSH_RELAY_URL;

  React.useEffect(() => {
    if (!ready) return;
    void platform.setPushRelayURL?.(current);
  }, [current, platform, ready]);

  const set = React.useCallback((value?: string) => {
    const next = normalizePushRelayURL(value);
    setCustom(next);
    void (next ? storage.setItem(PUSH_RELAY_STORAGE_KEY, next) : storage.removeItem(PUSH_RELAY_STORAGE_KEY));
  }, [storage]);

  const clear = React.useCallback(() => set(undefined), [set]);

  return { ready, current, custom, set, clear };
};
