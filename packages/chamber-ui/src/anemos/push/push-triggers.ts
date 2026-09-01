// ANEMOS-PATCH: normalize Chamber notification events to the fork PushPrefs contract.

import type { AnemosNotifyKind, Platform, PushPrefs } from '@/anemos/platform-adapter';
import { getPushPreferences, initializePushPreferences, isPushPreferenceEnabled } from './push-preferences';

export const normalizePushKind = (value: unknown): AnemosNotifyKind | undefined => {
  if (value === 'complete' || value === 'completion' || value === 'subtask') return 'complete';
  if (value === 'error') return 'error';
  if (value === 'approval' || value === 'permission' || value === 'permissions') return 'approval';
  if (value === 'question') return 'question';
  return undefined;
};

export const pushPreferenceForKind = (kind: AnemosNotifyKind): keyof PushPrefs | undefined => {
  if (kind === 'complete') return 'complete';
  if (kind === 'approval') return 'approval';
  if (kind === 'question') return 'question';
  if (kind === 'error') return 'error';
  return undefined;
};

export const shouldSendPush = (kind: AnemosNotifyKind | undefined): boolean => {
  const preference = kind ? pushPreferenceForKind(kind) : undefined;
  return preference ? isPushPreferenceEnabled(preference) : true;
};

export const preparePushPreferences = async (platform: Platform): Promise<PushPrefs> => initializePushPreferences(platform);

export const currentPushPreferences = (): PushPrefs => getPushPreferences();
