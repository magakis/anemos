import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/fonts';
import '@/index.css';
import '@/lib/debug';
import { DiffWorkerProvider } from '@/contexts/DiffWorkerProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ThemeSystemProvider } from '@/contexts/ThemeSystemContext';
import type { RuntimeAPIs } from '@/lib/api/types';
import { startAppearanceAutoSave } from '@/lib/appearanceAutoSave';
import { getDeviceInfo } from '@/lib/device';
import { markAppBootReady } from './appBootReady';
import { installMobileWidgetSnapshotBridge } from './mobileWidgetSnapshot';
import { applyPersistedDirectoryPreferences } from '@/lib/directoryPersistence';
import { initializeLocale, I18nProvider } from '@/lib/i18n';
import { initializeAppearancePreferences, syncDesktopSettings } from '@/lib/persistence';
import { startModelPrefsAutoSave } from '@/lib/modelPrefsAutoSave';
import { startTypographyWatcher } from '@/lib/typographyWatcher';
import { preloadMarkdownRenderer } from '@/components/chat/markdownRendererLoader';
import { SessionAuthGate } from '@/components/auth/SessionAuthGate';
import { AnemosBootGuard } from '@/anemos/boot-guard';
import { isAnemosRuntimeActive } from '@/anemos/server-env';
import { createAnemosRuntimeAPIs } from '@/anemos/runtime-apis';
import { configureAnemosStorage, migrateLegacyDefaultServer } from '@/anemos/storage';
import { getPlatformAdapter, installAnemosPlatformEventBridge } from '@/anemos/platform-adapter';
import { isAnemosNativeShell } from '@/lib/platform';
import { loadMobileConnections } from './mobileConnections';
import { getRuntimeApiBaseUrl } from '@/lib/runtime-switch';
import { MobileApp } from './MobileApp';

const initializeSharedPreferences = () => {
  initializeLocale();

  void initializeAppearancePreferences().then(() => {
    void Promise.all([
      syncDesktopSettings(),
      applyPersistedDirectoryPreferences(),
    ]).catch((err) => {
      console.error('[mobile-main] settings init failed:', err);
    });

    startAppearanceAutoSave();
    startModelPrefsAutoSave();
    startTypographyWatcher();
  }).catch((err) => {
    console.error('[mobile-main] appearance init failed:', err);
  }).finally(() => {
    // Persisted typography/appearance is now applied — release the splash gate so the
    // first UI paint is already at its final sizes.
    markAppBootReady();
  });
};

export function renderMobileApp(apis: RuntimeAPIs) {
  // Stamp the surface before anything else reads it: perf tuning, sync paging,
  // and device info all key off isMobileSurfaceRuntime(), and without the stamp
  // a wide native device (iPad landscape) would fall out of the mobile branch.
  window.__OPENCHAMBER_SURFACE__ = 'mobile';
  preloadMarkdownRenderer();

  // Expose the widget snapshot builder so the native shell can read the session overview
  // (attention count + recent sessions) and feed the home/lock-screen/Control Center widgets.
  installMobileWidgetSnapshotBridge();

  // Apply the device classes (`device-mobile`, `mobile-pointer`) to <html> BEFORE the
  // first React paint. They gate the mobile typography rules in mobile.css (larger
  // --text-* sizes); applied late from a hook effect, they bumped text size a frame
  // after mount and shifted the layout (connect / scan / saved-connection labels).
  getDeviceInfo();

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  // ANEMOS-PATCH: native shells use the injected Anemos platform instead of Chamber's Capacitor no-op.
  const isNativeShell = isAnemosNativeShell();
  const platform = getPlatformAdapter();
  configureAnemosStorage({ storage: platform.storage });
  installAnemosPlatformEventBridge();
  const isAnemosRuntime = isAnemosRuntimeActive();
  const resolvedApis = isNativeShell ? createAnemosRuntimeAPIs(apis, platform) : apis;

  // Auth gating differs by shell: the native Capacitor app authenticates via
  // its own instance-connect flow (MobileConnectionWelcome asks for the
  // password per instance), while the plain mobile BROWSER against a
  // --ui-password server must keep the classic SessionAuthGate unlock page.
  const app = <MobileApp apis={resolvedApis} />;
  const anemosBaseUrl = isAnemosRuntime ? getRuntimeApiBaseUrl() : null;
  const storageReady = isNativeShell || isAnemosRuntime
    ? migrateLegacyDefaultServer()
      .then(() => loadMobileConnections())
      .catch(() => undefined)
    : Promise.resolve();

  const AnemosStorageBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [ready, setReady] = React.useState(false);
    React.useEffect(() => {
      let active = true;
      void storageReady.then(() => {
        if (active) setReady(true);
      });
      return () => {
        active = false;
      };
    }, []);
    return ready ? <>{children}</> : null;
  };

  const SharedPreferencesBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const started = React.useRef(false);
    React.useEffect(() => {
      if (started.current) return;
      started.current = true;
      initializeSharedPreferences();
    }, []);
    return <>{children}</>;
  };

  createRoot(rootElement).render(
    <StrictMode>
      <AnemosBootGuard baseUrl={anemosBaseUrl} enabled={isAnemosRuntime}>
        <AnemosStorageBootstrap>
          <SharedPreferencesBootstrap>
            <I18nProvider>
              <ThemeSystemProvider>
                <ThemeProvider>
                  <DiffWorkerProvider>
                    {isNativeShell || isAnemosRuntime ? app : <SessionAuthGate>{app}</SessionAuthGate>}
                  </DiffWorkerProvider>
                </ThemeProvider>
              </ThemeSystemProvider>
            </I18nProvider>
          </SharedPreferencesBootstrap>
        </AnemosStorageBootstrap>
      </AnemosBootGuard>
    </StrictMode>,
  );
}
