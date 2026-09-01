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

export type PushKind = 'complete' | 'error' | 'approval' | 'question' | 'test';
export type AnemosNotifyKind = Exclude<PushKind, 'test'>;

// ANEMOS-PATCH: keep the fork relay contract local to UI 3 instead of importing
// the Solid app's Platform types into the vendored React bundle.
export type PushPerm = 'unsupported' | 'not-determined' | 'denied' | 'authorized' | 'provisional' | 'ephemeral';
export type PushCred = {
  channel: string;
  device?: string;
  secret?: string;
};
export type PairState = 'pending' | 'claimed' | 'active' | 'expired' | 'failed';
export type PairInfo = {
  id: string;
  status: PairState;
  token?: string;
  command?: string;
  expires?: string;
  channel?: string;
  device?: string;
  message?: string;
};
export type PushPrefs = {
  complete: boolean;
  approval: boolean;
  question: boolean;
  error: boolean;
};
export type PushDiag = {
  token?: boolean;
  tokenPending?: boolean;
  relay?: string;
  device?: string;
  pairID?: string;
  pairStatus?: PairState;
  pairExpires?: string;
  lastCode?: string;
  lastError?: string;
};
export type PushState = {
  supported: boolean;
  permission: PushPerm;
  allowed: boolean;
  registered: boolean;
  paired: boolean;
  generic: boolean;
  channel?: string;
  diag?: PushDiag;
};

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
  fetch?: typeof fetch;
  haptic?(style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'): void;
  share(data: AnemosShareData): Promise<boolean>;
  storage(name?: string): AnemosStorage;
  // ANEMOS-PATCH: optional native relay/pairing methods. Browser adapters expose
  // an unsupported state so settings can render without probing native APIs.
  pushState?: () => PushState | undefined;
  getPushState?(): Promise<PushState>;
  requestPushPermission?(): Promise<PushState>;
  openSystemSettings?(): Promise<void>;
  testPush?(href?: string): Promise<boolean>;
  beginPushPairing?(): Promise<PairInfo>;
  getPushPairing?(): Promise<PairInfo | undefined>;
  setPushPreferences?(prefs: PushPrefs): Promise<void>;
  setPushRelayURL?(url?: string): Promise<void>;
  setPushCredentials?(input: PushCred): Promise<PushState>;
  clearPushPairing?(): Promise<PushState>;
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

const unsupportedPushState = (): PushState => ({
  supported: false,
  permission: 'unsupported',
  allowed: false,
  registered: false,
  paired: false,
  generic: true,
});

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
    // ANEMOS-PATCH: the fork relay is native-only; keep browser settings safe
    // and deterministic instead of attempting Web Push registration.
    pushState: unsupportedPushState,
    getPushState: async () => unsupportedPushState(),
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

  // ANEMOS-PATCH: bridge native push methods through the same adapter used by
  // the React settings surface. Keep the last state synchronously readable for
  // pairing UI effects while all bridge calls remain asynchronous.
  let cachedPushState: PushState = {
    supported: true,
    permission: 'not-determined',
    allowed: false,
    registered: false,
    paired: false,
    generic: true,
  };
  const readPushState = () => cachedPushState;
  const updatePushState = (value: PushState | null | undefined): PushState => {
    if (value && typeof value === 'object') cachedPushState = value;
    return cachedPushState;
  };
  adapter.pushState = overrides.pushState ?? readPushState;
  adapter.getPushState = overrides.getPushState ?? (async () => updatePushState(await options.bridge.sendAsync<PushState>('getPushState')));
  adapter.requestPushPermission = overrides.requestPushPermission ?? (async () => updatePushState(await options.bridge.sendAsync<PushState>('requestPushPermission')));
  adapter.openSystemSettings = overrides.openSystemSettings ?? (async () => {
    await options.bridge.sendAsync('openSystemSettings');
  });
  adapter.testPush = overrides.testPush ?? (async (href) => (await options.bridge.sendAsync<boolean>('testPush', { href })) === true);
  adapter.beginPushPairing = overrides.beginPushPairing ?? (async () => {
    const value = await options.bridge.sendAsync<PairInfo>('beginPushPairing');
    if (!value) throw new Error('Push pairing is unavailable on this device.');
    return value;
  });
  adapter.getPushPairing = overrides.getPushPairing ?? (async () => {
    const value = await options.bridge.sendAsync<PairInfo>('getPushPairing');
    return value ?? undefined;
  });
  adapter.setPushPreferences = overrides.setPushPreferences ?? (async (prefs) => {
    await options.bridge.sendAsync('setPushPreferences', prefs);
  });
  adapter.setPushRelayURL = overrides.setPushRelayURL ?? (async (url) => {
    await options.bridge.sendAsync('setPushRelayURL', { url });
  });
  adapter.setPushCredentials = overrides.setPushCredentials ?? (async (input) => updatePushState(await options.bridge.sendAsync<PushState>('setPushCredentials', input)));
  adapter.clearPushPairing = overrides.clearPushPairing ?? (async () => updatePushState(await options.bridge.sendAsync<PushState>('clearPushPairing')));
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
