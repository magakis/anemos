// ANEMOS-PATCH: cover one-way, idempotent migration of Solid's default server settings.

import { describe, expect, test } from 'bun:test';

import type { AnemosStorage } from './storage';
import { migrateLegacyDefaultServer } from './storage';

const createMemoryStorage = (): AnemosStorage => {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    },
    clear: async () => {
      values.clear();
    },
    key: async (index) => Array.from(values.keys())[index] ?? null,
    getLength: async () => values.size,
    get length() {
      return this.getLength();
    },
  };
};

describe('legacy default-server migration', () => {
  test('copies the default server and credentials once without touching old keys', async () => {
    const legacy = createMemoryStorage();
    const target = createMemoryStorage();
    await legacy.setItem('opencode.settings.dat:defaultServerUrl', 'http://localhost:42447/');
    await legacy.setItem('opencode.settings.dat:defaultServerUsername', 'alice');
    await legacy.setItem('opencode.settings.dat:defaultServerPassword', 'secret');

    const first = await migrateLegacyDefaultServer({ storage: target, legacyStorage: legacy });
    // ANEMOS-PATCH: assert migration fields with Bun's supported matcher API.
    expect(first.migrated).toBe(true);
    expect(first.url).toBe('http://localhost:42447');
    expect(await legacy.getItem('opencode.settings.dat:defaultServerUrl')).toBe('http://localhost:42447/');

    const instances = JSON.parse(
      (await target.getItem('openchamber.mobile.connections.v1')) ?? '[]',
    ) as Array<Record<string, unknown>>;
    expect(instances).toHaveLength(1);
    // ANEMOS-PATCH: assert migrated instance fields with Bun's supported matcher API.
    expect(instances[0]?.url).toBe('http://localhost:42447');
    expect(instances[0]?.username).toBe('alice');
    expect(instances[0]?.password).toBe('secret');
    expect(instances[0]?.candidates).toEqual([{ kind: 'direct', url: 'http://localhost:42447' }]);

    const second = await migrateLegacyDefaultServer({ storage: target, legacyStorage: legacy });
    expect(second.alreadyMigrated).toBe(true);
    expect(JSON.parse((await target.getItem('openchamber.mobile.connections.v1')) ?? '[]')).toHaveLength(1);
  });

  test('prefers the native legacy source over the target storage fallback', async () => {
    const legacy = createMemoryStorage();
    const target = createMemoryStorage();
    await legacy.setItem('defaultServerUrl', 'https://native.example/');
    await target.setItem('defaultServerUrl', 'https://browser.example/');

    const result = await migrateLegacyDefaultServer({ storage: target, legacyStorage: legacy });

    expect(result.url).toBe('https://native.example');
    const instances = JSON.parse((await target.getItem('openchamber.mobile.connections.v1')) ?? '[]') as Array<Record<string, unknown>>;
    expect(instances[0]?.url).toBe('https://native.example');
  });

  test('leaves migration retryable when the legacy URL is invalid', async () => {
    const legacy = createMemoryStorage();
    const target = createMemoryStorage();
    await legacy.setItem('defaultServerUrl', 'file:///not-a-server');

    await migrateLegacyDefaultServer({ storage: target, legacyStorage: legacy });

    expect(await target.getItem('anemos.default-server-migrated.v1')).toBeNull();
  });

  test('leaves migration retryable when the instance write cannot be verified', async () => {
    const legacy = createMemoryStorage();
    const target = createMemoryStorage();
    await legacy.setItem('defaultServerUrl', 'https://native.example/');
    const originalSetItem = target.setItem;
    target.setItem = async (key, value) => {
      if (key === 'openchamber.mobile.connections.v1') return;
      await originalSetItem(key, value);
    };

    await migrateLegacyDefaultServer({ storage: target, legacyStorage: legacy });

    expect(await target.getItem('anemos.default-server-migrated.v1')).toBeNull();
  });
});
