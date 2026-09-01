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

  fs: { enabled: false, reason: 'Filesystem browsing currently depends on Chamber filesystem routes.' },
  git: { enabled: false, reason: 'Git surfaces currently depend on Chamber git routes.' },
  terminal: { enabled: false, reason: 'PTY and terminal rendering are deferred from the native core.' },
  tunnels: { enabled: false, reason: 'LAN and localhost connections do not require Chamber tunnels.' },
  knowledge: { enabled: false, reason: 'Session knowledge, recaps, goals, notes, and plans are deferred.' },
  folders: { enabled: false, reason: 'Project and session folder browsing is deferred with filesystem access.' },
  'scheduled-tasks': { enabled: false, reason: 'Scheduled tasks currently depend on Chamber task routes.' },
  'agent-memory': { enabled: false, reason: 'Agent memory currently depends on Chamber memory routes.' },
  'browser-control': { enabled: false, reason: 'Browser control and embedded browsing are deferred.' },
  'dev-servers': { enabled: false, reason: 'Dev-server discovery currently depends on filesystem and Chamber routes.' },
  quota: { enabled: false, reason: 'Quota and billing data are not part of the Phase 1 core.' },
  security: { enabled: false, reason: 'Chamber security settings are not part of the Phase 1 core.' },
  'small-model': { enabled: false, reason: 'Chamber small-model configuration is not part of the Phase 1 core.' },
  'system-prompt': { enabled: false, reason: 'Chamber system-prompt configuration is not part of the Phase 1 core.' },
  'skills-catalog': { enabled: false, reason: 'The skills catalog currently depends on Chamber config routes.' },
  walkthrough: { enabled: false, reason: 'Walkthrough generation and Git context are deferred.' },
  github: { enabled: false, reason: 'GitHub integration routes are not part of the Phase 1 core.' },
  linear: { enabled: false, reason: 'Linear integration routes are not part of the Phase 1 core.' },
  'tts-dictation': { enabled: false, reason: 'Voice and dictation are removed pending the Anemos voice replacement.' },
  'chamber-config': { enabled: false, reason: 'Chamber /api/config settings, themes, plugins, skills, and snippets routes are cut.' },
  'client-auth': { enabled: false, reason: 'Chamber client-token pairing is replaced by direct Anemos connection storage.' },
  'push-web': { enabled: false, reason: 'Web push and APNs registration are replaced by the Phase 5 fork relay.' },
  updates: { enabled: false, reason: 'Chamber update and upgrade routes are not part of the Phase 1 core.' },
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
