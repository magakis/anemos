// ANEMOS-PATCH: map Chamber's injectable RuntimeAPIs onto the Anemos shell platform contract.

import type { NotificationPayload, RuntimeAPIs } from '@/lib/api/types';
import {
  getPlatformAdapter,
  type AnemosPlatform,
} from './platform-adapter';
import { normalizePushKind, preparePushPreferences, shouldSendPush } from './push/push-triggers';

const createNotificationsAPI = (platform: AnemosPlatform) => ({
  notifyAgentCompletion: async (payload?: NotificationPayload): Promise<boolean> => {
    const title = payload?.title?.trim() || 'OpenCode';
    const body = payload?.body?.trim();
    const kind = normalizePushKind(payload?.kind);
    if (!shouldSendPush(kind)) return true;
    const href = payload?.sessionId
      ? `opencode://session/${encodeURIComponent(payload.sessionId)}`
      : undefined;
    try {
      await platform.notify(title, body, {
        kind,
        href,
        requireHidden: payload?.requireHidden,
      });
      return true;
    } catch {
      return false;
    }
  },
  canNotify: (): boolean | Promise<boolean> => platform.canNotify?.() ?? true,
});

export const createAnemosRuntimeAPIs = (apis: RuntimeAPIs, platform: AnemosPlatform = getPlatformAdapter()): RuntimeAPIs => {
  void preparePushPreferences(platform);
  return {
    ...apis,
    runtime: {
      ...apis.runtime,
      // RuntimeDescriptor is intentionally limited to Chamber's existing host labels.
      // Native identity remains available through the Anemos platform adapter.
      platform: 'web',
      isDesktop: false,
      isVSCode: false,
      label: platform.platform,
    },
    notifications: createNotificationsAPI(platform),
  };
};

export const anemosRuntimeAPIs = createAnemosRuntimeAPIs;
