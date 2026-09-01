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
    expect(first).toMatchObject({ migrated: true, url: 'http://localhost:42447' });
    expect(await legacy.getItem('opencode.settings.dat:defaultServerUrl')).toBe('http://localhost:42447/');

    const instances = JSON.parse(
      (await target.getItem('openchamber.mobile.connections.v1')) ?? '[]',
    ) as Array<Record<string, unknown>>;
    expect(instances).toHaveLength(1);
    expect(instances[0]).toMatchObject({
      url: 'http://localhost:42447',
      username: 'alice',
      password: 'secret',
      candidates: [{ kind: 'direct', url: 'http://localhost:42447' }],
    });

    const second = await migrateLegacyDefaultServer({ storage: target, legacyStorage: legacy });
    expect(second.alreadyMigrated).toBe(true);
    expect(JSON.parse((await target.getItem('openchamber.mobile.connections.v1')) ?? '[]')).toHaveLength(1);
  });
});
