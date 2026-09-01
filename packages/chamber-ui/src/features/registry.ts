// ANEMOS-PATCH: centralize the reversible Phase 4 feature dispositions.

import { isAnemosRuntimeActive } from '@/anemos/server-env';

export type FeatureDefinition = {
  enabled: boolean;
  reason: string;
};

export const FEATURE_REGISTRY = {
  sessions: { enabled: true, reason: 'Session listing and selection use the OpenCode SDK.' },
  chat: { enabled: true, reason: 'Chat timelines and streaming use the OpenCode SDK.' },
  composer: { enabled: true, reason: 'Prompt composition and standard attachments are client-side or SDK-backed.' },
  commands: { enabled: true, reason: 'Slash command execution uses the OpenCode SDK.' },
  providers: { enabled: true, reason: 'Provider and model data use the OpenCode SDK.' },
  models: { enabled: true, reason: 'Model selection uses the OpenCode SDK and local preferences.' },
  agents: { enabled: true, reason: 'Agent selection uses the OpenCode SDK.' },
  mcp: { enabled: true, reason: 'MCP runtime status and actions use the OpenCode SDK.' },
  permissions: { enabled: true, reason: 'Permission requests are part of the OpenCode SDK session flow.' },
  questions: { enabled: true, reason: 'Question requests are part of the OpenCode SDK session flow.' },
  i18n: { enabled: true, reason: 'Locale selection is client-side.' },
  appearance: { enabled: true, reason: 'Theme and typography preferences are client-side.' },
  instances: { enabled: true, reason: 'Direct instance connection uses the Anemos adapter.' },
  push: { enabled: true, reason: 'Fork relay push uses the Anemos platform adapter.' },

  fs: { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  git: { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  terminal: { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  tunnels: { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  knowledge: { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  folders: { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  'scheduled-tasks': { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  'agent-memory': { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  'browser-control': { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  'dev-servers': { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  quota: { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  security: { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  'small-model': { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  'system-prompt': { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  'skills-catalog': { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  walkthrough: { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  github: { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  linear: { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  'tts-dictation': { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  'chamber-config': { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  'client-auth': { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  'push-web': { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
  updates: { enabled: false, reason: 'Not available in anemos — available in Chamber Full (UI 1) or Classic (UI 2)' },
} as const satisfies Record<string, FeatureDefinition>;

export type FeatureKey = keyof typeof FEATURE_REGISTRY;

export const FEATURES = FEATURE_REGISTRY;

export const getFeature = (key: FeatureKey): FeatureDefinition => FEATURE_REGISTRY[key];

export const isFeatureEnabled = (key: FeatureKey): boolean => FEATURE_REGISTRY[key].enabled;

export const isFeatureCutRuntime = (): boolean => {
  if (typeof window !== 'undefined') {
    const surface = (window as typeof window & { __OPENCHAMBER_SURFACE__?: string }).__OPENCHAMBER_SURFACE__;
    if (surface === 'mobile') return true;
  }
  return isAnemosRuntimeActive();
};

export const isFeatureAvailable = (key: FeatureKey): boolean =>
  !isFeatureCutRuntime() || isFeatureEnabled(key);

export const featureCounts = (): { enabled: number; cut: number } => {
  const entries = Object.values(FEATURE_REGISTRY);
  const enabled = entries.filter((feature) => feature.enabled).length;
  return { enabled, cut: entries.length - enabled };
};

export const CONTEXT_MODE_FEATURES = {
  context: 'sessions',
  chat: 'chat',
  file: 'fs',
  git: 'git',
  pr: 'github',
  diff: 'git',
  walkthrough: 'walkthrough',
  terminal: 'terminal',
  notes: 'knowledge',
  plan: 'knowledge',
  browser: 'browser-control',
  linear: 'linear',
} as const satisfies Record<string, FeatureKey>;

export const featureForContextMode = (mode: string): FeatureKey | null =>
  CONTEXT_MODE_FEATURES[mode as keyof typeof CONTEXT_MODE_FEATURES] ?? null;

export const SETTINGS_PAGE_FEATURES = {
  general: 'chamber-config',
  projects: 'folders',
  'remote-instances': 'client-auth',
  providers: 'providers',
  usage: 'quota',
  agents: 'chamber-config',
  behavior: 'system-prompt',
  commands: 'chamber-config',
  mcp: 'chamber-config',
  plugins: 'chamber-config',
  'skills.installed': 'chamber-config',
  'skills.catalog': 'skills-catalog',
  git: 'git',
  appearance: 'appearance',
  chat: 'chat',
  shortcuts: 'appearance',
  sessions: 'chamber-config',
  'magic-prompts': 'chamber-config',
  snippets: 'chamber-config',
  notifications: 'push',
  voice: 'tts-dictation',
  tunnel: 'tunnels',
  about: 'updates',
  integrations: 'chamber-config',
} as const satisfies Record<string, FeatureKey>;

export const featureForSettingsPage = (slug: string): FeatureKey | null =>
  SETTINGS_PAGE_FEATURES[slug as keyof typeof SETTINGS_PAGE_FEATURES] ?? null;
