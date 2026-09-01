// ANEMOS-PATCH: cover the native scheme remap and typed deep-link parsing.

import { describe, expect, test } from 'bun:test';

import { parseDeepLink } from '@/apps/deepLinks';
import { remapDeepLinkScheme } from './deep-links';

describe('Anemos deep links', () => {
  test('remaps the legacy scheme without changing the route or query', () => {
    expect(remapDeepLinkScheme('openchamber://session/ses_123?directory=%2Frepo')).toBe(
      'opencode://session/ses_123?directory=%2Frepo',
    );
  });

  test('parses current and legacy session links', () => {
    expect(parseDeepLink('opencode://session/ses_123?dir=%2Frepo')).toEqual({
      type: 'session',
      sessionId: 'ses_123',
      directory: '/repo',
    });
    expect(parseDeepLink('openchamber://session/ses_legacy')).toEqual({
      type: 'session',
      sessionId: 'ses_legacy',
    });
  });
});
