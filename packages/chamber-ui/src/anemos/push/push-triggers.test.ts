// ANEMOS-PATCH: verify Chamber event kinds map to fork relay preference keys.

import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_PUSH_PREFS,
  resetPushPreferencesForTests,
  setPushPreferences,
} from './push-preferences';
import { normalizePushKind, pushPreferenceForKind, shouldSendPush } from './push-triggers';

describe('push trigger mapping', () => {
  test('normalizes completion, permission, question, and error events', () => {
    expect(normalizePushKind('completion')).toBe('complete');
    expect(normalizePushKind('permission')).toBe('approval');
    expect(normalizePushKind('question')).toBe('question');
    expect(normalizePushKind('error')).toBe('error');
    expect(pushPreferenceForKind('approval')).toBe('approval');
  });

  test('honors PushPrefs while leaving unknown events enabled', () => {
    try {
      setPushPreferences({ ...DEFAULT_PUSH_PREFS, error: false });
      expect(shouldSendPush('error')).toBe(false);
      expect(shouldSendPush('complete')).toBe(true);
      expect(shouldSendPush(undefined)).toBe(true);
    } finally {
      resetPushPreferencesForTests();
    }
  });
});
