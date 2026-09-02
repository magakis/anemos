import './platform-bootstrap';
import { createConfiguredWebAPIs } from './runtimeConfig';
import { consumeAuthTokenFromLocation } from '@openchamber/ui/anemos/auth';
import { resolveServerEnv } from '@openchamber/ui/anemos/server-env';
import type { RuntimeAPIs } from '@openchamber/ui/lib/api/types';
import '@openchamber/ui/index.css';
import '@openchamber/ui/styles/fonts';

declare global {
  interface Window {
    __OPENCHAMBER_API_BASE_URL__?: string;
    __OPENCHAMBER_RUNTIME_APIS__?: RuntimeAPIs;
    __ANEMOS_RUNTIME_ACTIVE__?: boolean;
  }
}

const serverEnv = resolveServerEnv();

// ANEMOS-PATCH: resolve the direct OpenCode target before Chamber's runtime bootstrap.
window.__ANEMOS_RUNTIME_ACTIVE__ = serverEnv.active;
consumeAuthTokenFromLocation();

const configuredApiBaseUrl = serverEnv.active ? serverEnv.baseUrl : null;

if (configuredApiBaseUrl) {
  // ANEMOS-PATCH: route browser development directly to the configured OpenCode backend.
  window.__OPENCHAMBER_API_BASE_URL__ = configuredApiBaseUrl;
}

window.__OPENCHAMBER_RUNTIME_APIS__ = createConfiguredWebAPIs();

void import('@openchamber/ui/apps/renderMobileApp')
  .then(({ renderMobileApp }) => {
    renderMobileApp(window.__OPENCHAMBER_RUNTIME_APIS__ ?? createConfiguredWebAPIs());
  });
