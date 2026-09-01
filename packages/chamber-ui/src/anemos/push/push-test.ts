// ANEMOS-PATCH: keep test-push dispatch independent from the settings component.

import type { Platform } from '@/anemos/platform-adapter';

export const sendPushTest = async (input: { platform: Pick<Platform, 'testPush'>; href?: string }): Promise<boolean> => {
  if (!input.platform.testPush) return false;
  return input.platform.testPush(input.href);
};
