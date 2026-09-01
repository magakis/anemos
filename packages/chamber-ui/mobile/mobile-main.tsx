import { createConfiguredWebAPIs } from './runtimeConfig';
import type { RuntimeAPIs } from '@openchamber/ui/lib/api/types';
import '@openchamber/ui/index.css';
import '@openchamber/ui/styles/fonts';

declare global {
  interface Window {
    __OPENCHAMBER_API_BASE_URL__?: string;
    __OPENCHAMBER_RUNTIME_APIS__?: RuntimeAPIs;
  }
}

const configuredApiBaseUrl = typeof import.meta.env.VITE_OPENCODE_URL === 'string'
  ? import.meta.env.VITE_OPENCODE_URL.trim()
  : '';

if (configuredApiBaseUrl) {
  // ANEMOS-PATCH: route browser development directly to the configured OpenCode backend.
  window.__OPENCHAMBER_API_BASE_URL__ = configuredApiBaseUrl;
}

window.__OPENCHAMBER_RUNTIME_APIS__ = createConfiguredWebAPIs();

void import('@openchamber/ui/apps/renderMobileApp')
  .then(({ renderMobileApp }) => {
    renderMobileApp(window.__OPENCHAMBER_RUNTIME_APIS__ ?? createConfiguredWebAPIs());
  });
