// ANEMOS-PATCH: adapt the two native shell bridge protocols to the shared UI 3 bridge contract.

import {
  type AnemosStorageLike,
  type AnemosStorageSource,
} from './storage';
import type { AnemosBridge } from './platform-adapter';

type BridgeRequest = {
  id: string;
  method: string;
  params?: unknown;
};

type NativeWindow = Window & {
  webkit?: {
    messageHandlers?: {
      opencode?: {
        postMessage: (message: BridgeRequest) => void;
      };
    };
  };
  __OPENCODE_BRIDGE__?: {
    onResponse: (id: string, result?: unknown, error?: string) => void;
    onEvent: (type: string, payload?: unknown) => void;
  };
  __TAURI_INTERNALS__?: {
    invoke?: <T = unknown>(command: string, args?: Record<string, unknown>) => Promise<T>;
  };
};

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
};

const IOS_BRIDGE_METHODS = new Set([
  'openLink',
  'notify',
  'haptic',
  'share',
  'readLegacySettings',
  'storageGet',
  'storageSet',
  'storageRemove',
  'storageClear',
  'storageKey',
  'storageLength',
]);

const ANDROID_BRIDGE_COMMANDS: Record<string, string> = {
  openLink: 'open_link',
  notify: 'notify',
  haptic: 'haptic',
  share: 'share',
  readLegacySettings: 'read_legacy_settings',
};

const createIosBridge = (root: NativeWindow): AnemosBridge => {
  const pending = new Map<string, Pending>();
  let counter = 0;

  const nextId = () => `bridge:${Date.now()}:${counter++}`;
  const post = (message: BridgeRequest): boolean => {
    const handler = root.webkit?.messageHandlers?.opencode;
    if (!handler?.postMessage) return false;
    handler.postMessage(message);
    return true;
  };

  root.__OPENCODE_BRIDGE__ = {
    onResponse: (id, result, error) => {
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);
      if (error) entry.reject(new Error(error));
      else entry.resolve(result);
    },
    onEvent: () => undefined,
  };

  const api: AnemosBridge = {
    available: () => Boolean(root.webkit?.messageHandlers?.opencode?.postMessage),
    send: (method, params) => {
      if (!IOS_BRIDGE_METHODS.has(method)) return;
      void api.sendAsync(method, params);
    },
    sendAsync: <T = unknown>(method: string, params?: unknown) => {
      if (!IOS_BRIDGE_METHODS.has(method)) return Promise.resolve(null);
      const id = nextId();
      return new Promise<T | null>((resolve) => {
        pending.set(id, {
          resolve: (value) => resolve(value as T | null),
          reject: () => resolve(null),
        });
        try {
          if (post({ id, method, params })) return;
        } catch {
          // Fall through to the same null result used for an unavailable bridge.
        }
        pending.delete(id);
        resolve(null);
      });
    },
  };
  return api;
};

const createTauriBridge = (root: NativeWindow): AnemosBridge => {
  const invoke = root.__TAURI_INTERNALS__?.invoke;
  const resolve = (method: string) => ANDROID_BRIDGE_COMMANDS[method];
  const api: AnemosBridge = {
    available: () => typeof invoke === 'function',
    send: (method, params) => {
      void api.sendAsync(method, params);
    },
    sendAsync: <T = unknown>(method: string, params?: unknown) => {
      const command = resolve(method);
      if (!invoke || !command) return Promise.resolve(null);
      return invoke<T>(`plugin:mobile-bridge|${command}`, (params ?? {}) as Record<string, unknown>)
        .then((value) => value ?? null)
        .catch(() => null);
    },
  };
  return api;
};

const createBridgeStorage = (bridge: AnemosBridge): AnemosStorageSource => (name = 'default.dat') => {
  const storage: AnemosStorageLike = {
    getItem: async (key) => {
      const value = await bridge.sendAsync<string | null>('storageGet', { name, key });
      return value ?? null;
    },
    setItem: async (key, value) => {
      await bridge.sendAsync('storageSet', { name, key, value });
    },
    removeItem: async (key) => {
      await bridge.sendAsync('storageRemove', { name, key });
    },
    clear: async () => {
      await bridge.sendAsync('storageClear', { name });
    },
    key: async (index) => {
      const value = await bridge.sendAsync<string | null>('storageKey', { name, index });
      return value ?? null;
    },
    getLength: async () => {
      const value = await bridge.sendAsync<number>('storageLength', { name });
      return typeof value === 'number' ? value : 0;
    },
  };
  return storage;
};

const createTauriStorage = (root: NativeWindow): AnemosStorageSource => {
  const invoke = root.__TAURI_INTERNALS__?.invoke;
  const resourceIds = new Map<string, Promise<number>>();

  const getResourceId = (name: string): Promise<number> => {
    const existing = resourceIds.get(name);
    if (existing) return existing;
    if (!invoke) return Promise.reject(new Error('Tauri invoke is unavailable'));
    const resource = invoke<number>('plugin:store|load', { path: name });
    resourceIds.set(name, resource);
    return resource;
  };

  return (name = 'default.dat') => {
    const storage: AnemosStorageLike = {
      getItem: async (key) => {
        const rid = await getResourceId(name);
        const [value, exists] = await invoke?.<[unknown, boolean]>('plugin:store|get', { rid, key }) ?? [null, false];
        return exists && typeof value === 'string' ? value : null;
      },
      setItem: async (key, value) => {
        const rid = await getResourceId(name);
        await invoke?.('plugin:store|set', { rid, key, value });
        await invoke?.('plugin:store|save', { rid });
      },
      removeItem: async (key) => {
        const rid = await getResourceId(name);
        await invoke?.('plugin:store|delete', { rid, key });
        await invoke?.('plugin:store|save', { rid });
      },
      clear: async () => {
        const rid = await getResourceId(name);
        await invoke?.('plugin:store|clear', { rid });
        await invoke?.('plugin:store|save', { rid });
      },
      key: async (index) => {
        const rid = await getResourceId(name);
        const keys = await invoke?.<string[]>('plugin:store|keys', { rid }) ?? [];
        return keys[index] ?? null;
      },
      getLength: async () => {
        const rid = await getResourceId(name);
        return await invoke?.<number>('plugin:store|length', { rid }) ?? 0;
      },
    };
    return storage;
  };
};

export const createNativeBridge = (platform: 'ios' | 'android', root: NativeWindow = window): AnemosBridge =>
  platform === 'ios' ? createIosBridge(root) : createTauriBridge(root);

export const createNativeStorage = (platform: 'ios' | 'android', bridge: AnemosBridge, root: NativeWindow = window): AnemosStorageSource =>
  platform === 'ios' ? createBridgeStorage(bridge) : createTauriStorage(root);
