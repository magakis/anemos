// ANEMOS-PATCH: cover Basic credential derivation for direct mobile instances.

import { describe, expect, test } from 'bun:test';

import { deriveBasicAuthorization } from './auth';

describe('Basic authorization derivation', () => {
  test('encodes instance username and password as a Basic header', () => {
    expect(deriveBasicAuthorization('alice', 'secret')).toBe(`Basic ${btoa('alice:secret')}`);
  });

  test('uses the OpenCode username when only a password is supplied', () => {
    expect(deriveBasicAuthorization(undefined, 'secret')).toBe(`Basic ${btoa('opencode:secret')}`);
  });

  test('clears the header when an instance has no credentials', () => {
    expect(deriveBasicAuthorization('', '')).toBeNull();
  });
});
