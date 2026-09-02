// ANEMOS-PATCH: install the native adapter before the Chamber application bundle evaluates.

import {
  configureAnemosStorage,
  createAnemosLegacySettingsStorage,
  createAnemosStorage,
  type AnemosLegacySettings,
} from '@openchamber/ui/anemos/storage';
import { createBridgePlatformAdapter, createPlatformAdapter } from '@openchamber/ui/anemos/platform-adapter';
import {
  createNativeBridge,
  createNativeStorage,
} from '@openchamber/ui/anemos/native-bridge';

const isLocalShellOrigin = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (window.location.protocol === 'tauri:' && window.location.host === 'localhost')
    || (window.location.protocol === 'http:' && window.location.host === 'tauri.localhost');
};

const installNativePlatform = (): void => {
  if (typeof window === 'undefined') return;

  const root = window as Window & {
    webkit?: { messageHandlers?: { opencode?: { postMessage: (message: unknown) => void } } };
    __TAURI_INTERNALS__?: unknown;
  };
  const ios = Boolean(root.webkit?.messageHandlers?.opencode?.postMessage);
  const android = !ios && '__TAURI_INTERNALS__' in window;
  if (!ios && !android) return;

  const platform = ios ? 'ios' : 'android';
  // ANEMOS-PATCH: provide a synchronous fallback for Android WebViews without
  // document-start user-script support; native shells also inject this marker.
  if (isLocalShellOrigin()) root.__ANEMOS_SHELL__ = platform;

  try {
    const bridge = createNativeBridge(platform);
    const adapter = createBridgePlatformAdapter({
      platform,
      bridge,
      storage: createNativeStorage(platform, bridge),
    });
    window.__ANEMOS_PLATFORM__ = adapter;
    configureAnemosStorage({
      storage: adapter.storage,
      legacyStorage: createAnemosLegacySettingsStorage(
        () => bridge.sendAsync<AnemosLegacySettings>('readLegacySettings'),
        createAnemosStorage(),
      ),
    });
  } catch (error) {
    // ANEMOS-PATCH: a bridge hiccup must not prevent the browser adapters and
    // the visible connection flow from rendering.
    console.warn('[platform-bootstrap] native bridge setup failed; using browser adapters', error);
    window.__ANEMOS_PLATFORM__ = createPlatformAdapter();
  }
};

installNativePlatform();
