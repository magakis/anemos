// ANEMOS-PATCH: provide one storage contract for browser, WKWebView, and Tauri persistence.

export const ANEMOS_INSTANCE_STORAGE_NAME = 'openchamber.mobile.dat';
export const ANEMOS_INSTANCE_STORAGE_KEY = 'openchamber.mobile.connections.v1';
export const ANEMOS_DEFAULT_SERVER_MIGRATION_KEY = 'anemos.default-server-migrated.v1';

export interface AnemosStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  key(index: number): Promise<string | null>;
  getLength(): Promise<number>;
  readonly length: Promise<number>;
  getItemSync?(key: string): string | null;
  setItemSync?(key: string, value: string): void;
  removeItemSync?(key: string): void;
}

export type AnemosStorageLike = {
  getItem: (key: string) => string | null | Promise<string | null | undefined>;
  setItem: (key: string, value: string) => void | Promise<unknown>;
  removeItem: (key: string) => void | Promise<unknown>;
  clear: () => void | Promise<unknown>;
  key: (index: number) => string | null | Promise<string | null | undefined>;
  getLength?: () => number | Promise<number>;
  readonly length?: number | Promise<number>;
};

export type AnemosStorageSource = AnemosStorage | ((name?: string) => AnemosStorageLike);

export type AnemosLegacySettings = {
  defaultServerUrl?: string;
  defaultServerUsername?: string;
  defaultServerPassword?: string;
};

const hasStorage = (): boolean => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const createBrowserStorage = (): AnemosStorage => {
  const get = (): Storage | null => {
    if (!hasStorage()) return null;
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  };

  return {
    getItem: async (key) => {
      try {
        return get()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        get()?.setItem(key, value);
      } catch {
        return;
      }
    },
    removeItem: async (key) => {
      try {
        get()?.removeItem(key);
      } catch {
        return;
      }
    },
    clear: async () => {
      try {
        get()?.clear();
      } catch {
        return;
      }
    },
    key: async (index) => {
      try {
        return get()?.key(index) ?? null;
      } catch {
        return null;
      }
    },
    getLength: async () => {
      try {
        return get()?.length ?? 0;
      } catch {
        return 0;
      }
    },
    get length() {
      return this.getLength();
    },
    getItemSync: (key) => {
      try {
        return get()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItemSync: (key, value) => {
      try {
        get()?.setItem(key, value);
      } catch {
        return;
      }
    },
    removeItemSync: (key) => {
      try {
        get()?.removeItem(key);
      } catch {
        return;
      }
    },
  };
};

const isAnemosStorage = (value: AnemosStorageLike): value is AnemosStorage =>
  typeof value.getLength === 'function' && value.length instanceof Promise;

export const adaptAnemosStorage = (storage: AnemosStorageLike): AnemosStorage => {
  if (isAnemosStorage(storage)) return storage;

  return {
    getItem: async (key) => (await storage.getItem(key)) ?? null,
    setItem: async (key, value) => {
      await storage.setItem(key, value);
    },
    removeItem: async (key) => {
      await storage.removeItem(key);
    },
    clear: async () => {
      await storage.clear();
    },
    key: async (index) => (await storage.key(index)) ?? null,
    getLength: async () => {
      if (typeof storage.getLength === 'function') return await storage.getLength();
      const length = storage.length;
      return typeof length === 'number' ? length : await (length ?? 0);
    },
    get length() {
      return this.getLength();
    },
  };
};

// ANEMOS-PATCH: expose native legacy settings through the same read-only storage
// shape as localStorage, while keeping localStorage available as a dev fallback.
export const createAnemosLegacySettingsStorage = (
  read: () => Promise<AnemosLegacySettings | null | undefined>,
  fallback?: AnemosStorage,
): AnemosStorage => {
  let values: Promise<AnemosLegacySettings | null> | null = null;
  const load = (): Promise<AnemosLegacySettings | null> => {
    if (!values) values = read().then((result) => result ?? null).catch(() => null);
    return values;
  };
  const settingKey = (key: string): keyof AnemosLegacySettings => key.slice(key.lastIndexOf(':') + 1) as keyof AnemosLegacySettings;

  return adaptAnemosStorage({
    getItem: async (key) => {
      const value = (await load())?.[settingKey(key)];
      if (typeof value === 'string' && value.trim()) return value;
      return fallback?.getItem(key) ?? null;
    },
    setItem: async () => undefined,
    removeItem: async () => undefined,
    clear: async () => undefined,
    key: async () => null,
    getLength: async () => 0,
  });
};

export const createAnemosStorage = (source?: string | AnemosStorageLike): AnemosStorage =>
  typeof source === 'string' || source === undefined ? createBrowserStorage() : adaptAnemosStorage(source);

export const createStorageAdapter = createAnemosStorage;

let storageSource: AnemosStorageSource = () => createBrowserStorage();
let legacyStorageSource: AnemosStorageSource = storageSource;
let legacyStorageConfigured = false;

export const configureAnemosStorage = (options: {
  storage?: AnemosStorageSource;
  legacyStorage?: AnemosStorageSource;
} = {}): void => {
  if (options.storage) {
    storageSource = options.storage;
    if (!legacyStorageConfigured) legacyStorageSource = options.storage;
  }
  if (options.legacyStorage) {
    legacyStorageSource = options.legacyStorage;
    legacyStorageConfigured = true;
  }
};

const resolveStorage = (source: AnemosStorageSource, name: string): AnemosStorage => {
  const storage = typeof source === 'function' ? source(name) : source;
  return adaptAnemosStorage(storage);
};

export const getAnemosStorage = (name = ANEMOS_INSTANCE_STORAGE_NAME): AnemosStorage =>
  resolveStorage(storageSource, name);

const getLegacyStorage = (name: string): AnemosStorage => resolveStorage(legacyStorageSource, name);

const normalizeServerUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    url.search = '';
    url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
};

const sameServerUrl = (left: string, right: string): boolean => {
  const normalizedLeft = normalizeServerUrl(left);
  const normalizedRight = normalizeServerUrl(right);
  return normalizedLeft !== null && normalizedLeft === normalizedRight;
};

const parseStoredInstances = (value: string | null): Array<Record<string, unknown>> => {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
  } catch {
    return [];
  }
};

const instanceServerUrl = (instance: Record<string, unknown>): string | null => {
  if (typeof instance.url === 'string') return instance.url;
  if (!Array.isArray(instance.candidates)) return null;
  const direct = instance.candidates.find((candidate): candidate is Record<string, unknown> =>
    Boolean(candidate) && typeof candidate === 'object' && (candidate as Record<string, unknown>).kind === 'direct',
  );
  return typeof direct?.url === 'string' ? direct.url : null;
};

const readFirst = async (sources: AnemosStorage[], keys: string[]): Promise<string | null> => {
  for (const source of sources) {
    for (const key of keys) {
      const value = await source.getItem(key).catch(() => null);
      if (typeof value === 'string' && value.trim()) return value;
    }
  }
  return null;
};

const legacyKeys = (key: string): string[] => [
  `opencode.settings.dat:${key}`,
  key,
  `settings.dat:${key}`,
];

export interface DefaultServerMigrationResult {
  migrated: boolean;
  alreadyMigrated: boolean;
  url: string | null;
  instanceCount: number;
}

/**
 * Move the legacy default server into Chamber's saved mobile instances once.
 * The old settings keys are deliberately read-only: Solid and Chamber can
 * coexist while the frontend switch is rolled out.
 */
export const migrateLegacyDefaultServer = async (options: {
  storage?: AnemosStorage;
  legacyStorage?: AnemosStorage;
} = {}): Promise<DefaultServerMigrationResult> => {
  const storage = options.storage ?? getAnemosStorage();
  const migrated = await storage.getItem(ANEMOS_DEFAULT_SERVER_MIGRATION_KEY).catch(() => null);
  if (migrated === '1') {
    const instances = parseStoredInstances(await storage.getItem(ANEMOS_INSTANCE_STORAGE_KEY).catch(() => null));
    return { migrated: false, alreadyMigrated: true, url: null, instanceCount: instances.length };
  }

  const sources = options.legacyStorage
    ? [options.legacyStorage]
    : [
        getLegacyStorage('settings.dat'),
        getLegacyStorage('opencode.settings.dat'),
        getLegacyStorage('default.dat'),
        storage,
      ];
  const rawUrl = await readFirst(sources, legacyKeys('defaultServerUrl'));
  const url = rawUrl ? normalizeServerUrl(rawUrl) : null;
  if (!url) {
    // An invalid or unavailable legacy URL must remain retryable. In particular,
    // a native store may be read before its old settings have become available.
    const instances = parseStoredInstances(await storage.getItem(ANEMOS_INSTANCE_STORAGE_KEY).catch(() => null));
    return { migrated: false, alreadyMigrated: false, url: null, instanceCount: instances.length };
  }

  const current = parseStoredInstances(await storage.getItem(ANEMOS_INSTANCE_STORAGE_KEY).catch(() => null));
  const hasExisting = current.some((item) => {
    const existingUrl = instanceServerUrl(item);
    return existingUrl !== null && sameServerUrl(existingUrl, url);
  });
  if (hasExisting) {
    await storage.setItem(ANEMOS_DEFAULT_SERVER_MIGRATION_KEY, '1').catch(() => undefined);
    return { migrated: false, alreadyMigrated: false, url, instanceCount: current.length };
  }

  const username = await readFirst(sources, legacyKeys('defaultServerUsername'));
  const password = await readFirst(sources, legacyKeys('defaultServerPassword'));
  const label = (() => {
    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  })();
  const instance = {
    id: `legacy-${encodeURIComponent(url)}`,
    label,
    url,
    candidates: [{ kind: 'direct', url }],
    lastUsedAt: Date.now(),
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
  };

  const nextInstances = JSON.stringify([instance, ...current]);
  await storage.setItem(ANEMOS_INSTANCE_STORAGE_KEY, nextInstances).catch(() => undefined);
  const storedInstances = await storage.getItem(ANEMOS_INSTANCE_STORAGE_KEY).catch(() => null);
  if (storedInstances !== nextInstances) {
    return { migrated: false, alreadyMigrated: false, url, instanceCount: current.length };
  }
  await storage.setItem(ANEMOS_DEFAULT_SERVER_MIGRATION_KEY, '1').catch(() => undefined);
  return { migrated: true, alreadyMigrated: false, url, instanceCount: current.length + 1 };
};

export const migrateDefaultServerToInstances = migrateLegacyDefaultServer;
