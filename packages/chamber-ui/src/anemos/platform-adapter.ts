// ANEMOS-PATCH: define the shell-neutral platform contract shared by React and the native bridges.

import {
  configureAnemosStorage,
  createAnemosStorage,
  type AnemosStorage,
  type AnemosStorageLike,
  type AnemosStorageSource,
} from './storage';
import { getAnemosShellPlatform, isAnemosNativeShell } from '@/lib/platform';
import { triggerReconnectRecovery } from '@/sync/reconnect-recovery';

export type AnemosNotifyKind = 'complete' | 'error' | 'approval' | 'question';

export interface AnemosNotifyOpts {
  onClick?: () => void;
  href?: string;
  kind?: AnemosNotifyKind;
  generic?: boolean;
  requireHidden?: boolean;
}

export interface AnemosShareData {
  text?: string;
  url?: string;
  files?: File[];
}

export interface AnemosPlatform {
  platform: 'web' | 'ios' | 'android';
  openExternal(value: string): void;
  openLink(value: string): void;
  notify(title: string, description?: string, opts?: AnemosNotifyOpts): Promise<void>;
  canNotify?(): boolean | Promise<boolean>;
  back(): void;
  forward(): void;
  restart(): Promise<void>;
  haptic?(style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'): void;
  share(data: AnemosShareData): Promise<boolean>;
  storage(name?: string): AnemosStorage;
}

export type Platform = AnemosPlatform;
export type NativePlatform = AnemosPlatformOverrides;

export type AnemosPlatformOverrides = Partial<Omit<AnemosPlatform, 'platform' | 'storage'>> & {
  platform?: AnemosPlatform['platform'];
  storage?: (name?: string) => AnemosStorage | AnemosStorageLike;
};

export interface AnemosBridge {
  available?(): boolean;
  send(method: string, params?: unknown): void;
  sendAsync<T = unknown>(method: string, params?: unknown): Promise<T | null | undefined>;
}

const canOpenUrl = (value: string): URL | null => {
  try {
    const parsed = new URL(value);
    if (['javascript:', 'data:', 'vbscript:', 'blob:', 'filesystem:'].includes(parsed.protocol)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const openInBrowser = (value: string): void => {
  const parsed = canOpenUrl(value);
  if (!parsed || typeof window === 'undefined') return;
  window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
};

const browserNotify = async (title: string, description?: string, opts?: AnemosNotifyOpts): Promise<void> => {
  if (opts?.generic) return;
  if (typeof document === 'undefined') return;
  if (opts?.requireHidden && document.hasFocus()) return;
  if (typeof Notification === 'undefined') return;
  const permission = Notification.permission === 'default'
    ? await Notification.requestPermission().catch(() => 'denied')
    : Notification.permission;
  if (permission !== 'granted') return;
  if (document.visibilityState === 'visible' && document.hasFocus()) return;

  const notification = new Notification(title, { body: description ?? '' });
  notification.onclick = () => {
    window.focus();
    opts?.onClick?.();
    notification.close();
  };
};

const browserPlatform = (): AnemosPlatform => {
  const storage = (name?: string): AnemosStorage => createAnemosStorage(name);
  return {
    platform: 'web',
    openExternal: openInBrowser,
    openLink: openInBrowser,
    notify: browserNotify,
    canNotify: () => typeof Notification !== 'undefined' && Notification.permission === 'granted',
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    restart: async () => window.location.reload(),
    share: async (data) => {
      if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
      try {
        await navigator.share({ text: data.text, url: data.url, files: data.files });
        return true;
      } catch {
        return false;
      }
    },
    storage,
  };
};

export const createPlatformAdapter = (overrides: AnemosPlatformOverrides = {}): AnemosPlatform => {
  const fallback = browserPlatform();
  return {
    ...fallback,
    ...overrides,
    platform: overrides.platform ?? (isAnemosNativeShell() ? getAnemosShellPlatform() : fallback.platform),
    storage: (name?: string) => {
      if (!overrides.storage) return fallback.storage(name);
      return createAnemosStorage(overrides.storage(name));
    },
  };
};

export const createBridgePlatformAdapter = (options: {
  platform: 'ios' | 'android';
  bridge: AnemosBridge;
  storage?: AnemosStorageSource;
  overrides?: AnemosPlatformOverrides;
}): AnemosPlatform => {
  const bridgeAvailable = () => options.bridge.available?.() !== false;
  const overrides = options.overrides ?? {};
  const storage = options.storage
    ? (name?: string) => createAnemosStorage(typeof options.storage === 'function' ? options.storage(name) : options.storage)
    : overrides.storage;
  const adapter = createPlatformAdapter({
    ...overrides,
    platform: options.platform,
    ...(storage ? { storage } : {}),
    openExternal: overrides.openExternal ?? ((value) => {
      if (bridgeAvailable()) options.bridge.send('openLink', { url: value });
    }),
    openLink: overrides.openLink ?? ((value) => {
      if (bridgeAvailable()) options.bridge.send('openLink', { url: value });
    }),
    notify: overrides.notify ?? (async (title, description, notifyOptions) => {
      if (!bridgeAvailable()) return;
      await options.bridge.sendAsync('notify', {
        title,
        description,
        href: notifyOptions?.href,
        kind: notifyOptions?.kind,
        requireHidden: notifyOptions?.requireHidden,
        generic: notifyOptions?.generic,
      });
    }),
    canNotify: overrides.canNotify ?? (() => bridgeAvailable()),
    haptic: overrides.haptic ?? ((style) => {
      if (bridgeAvailable()) options.bridge.send('haptic', { style });
    }),
    share: overrides.share ?? (async (data) => {
      if (!bridgeAvailable()) return false;
      if (data.files?.length && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({ text: data.text, url: data.url, files: data.files });
          return true;
        } catch {
          return false;
        }
      }
      const result = await options.bridge.sendAsync<boolean>('share', { text: data.text, url: data.url });
      return result === true;
    }),
  });
  configureAnemosStorage({ storage: adapter.storage });
  return adapter;
};

export const createNativePlatformAdapter = createBridgePlatformAdapter;

declare global {
  interface Window {
    __ANEMOS_PLATFORM__?: AnemosPlatformOverrides;
  }
}

export const getPlatformAdapter = (): AnemosPlatform => {
  if (typeof window === 'undefined') return createPlatformAdapter();
  return createPlatformAdapter(window.__ANEMOS_PLATFORM__ ?? {});
};

/** Connect the native lifecycle event used by both existing shells to Chamber's event pipeline. */
export const installAnemosPlatformEventBridge = (): (() => void) => {
  if (typeof window === 'undefined' || !isAnemosNativeShell()) return () => undefined;
  const handleResume = () => triggerReconnectRecovery('native-resume');
  window.addEventListener('opencode:resume', handleResume);
  return () => window.removeEventListener('opencode:resume', handleResume);
};
