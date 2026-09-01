// ANEMOS-PATCH: keep relay notification preferences shared by settings and runtime triggers.

import type { Platform, PushPrefs } from '@/anemos/platform-adapter';

export const PUSH_PREFS_STORAGE_KEY = 'anemos.push.preferences.v1';
export const DEFAULT_PUSH_PREFS: PushPrefs = {
  complete: true,
  approval: true,
  question: true,
  error: true,
};

const listeners = new Set<() => void>();
let current: PushPrefs = { ...DEFAULT_PUSH_PREFS };
let loaded = false;
let revision = 0;

const normalize = (value: unknown): PushPrefs => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_PUSH_PREFS };
  const candidate = value as Partial<Record<keyof PushPrefs, unknown>>;
  return {
    complete: candidate.complete !== false,
    approval: candidate.approval !== false,
    question: candidate.question !== false,
    error: candidate.error !== false,
  };
};

const notifyListeners = (): void => {
  for (const listener of listeners) listener();
};

export const getPushPreferences = (): PushPrefs => current;

export const subscribePushPreferences = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const isPushPreferenceEnabled = (kind: keyof PushPrefs): boolean => current[kind];

export const setPushPreferences = (value: PushPrefs, platform?: Platform): PushPrefs => {
  revision += 1;
  current = normalize(value);
  notifyListeners();
  if (platform?.setPushPreferences) void platform.setPushPreferences(current);
  if (platform) {
    void platform.storage('openchamber.push').setItem(PUSH_PREFS_STORAGE_KEY, JSON.stringify(current));
  }
  return getPushPreferences();
};

export const initializePushPreferences = async (platform: Platform): Promise<PushPrefs> => {
  if (loaded) return getPushPreferences();
  loaded = true;
  const initialRevision = revision;
  const stored = await platform.storage('openchamber.push').getItem(PUSH_PREFS_STORAGE_KEY).catch(() => null);
  let parsed: unknown;
  if (stored) {
    try {
      parsed = JSON.parse(stored) as unknown;
    } catch {
      parsed = undefined;
    }
  }
  if (revision === initialRevision) current = normalize(parsed);
  notifyListeners();
  if (platform.setPushPreferences) await platform.setPushPreferences(current).catch(() => undefined);
  return getPushPreferences();
};

export const resetPushPreferencesForTests = (): void => {
  revision += 1;
  current = { ...DEFAULT_PUSH_PREFS };
  loaded = false;
  notifyListeners();
};
