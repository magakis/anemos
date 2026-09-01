// ANEMOS-PATCH: expose fork relay permission, pairing, preferences, and test delivery in UI 3.

import * as React from 'react';
import { getPlatformAdapter, type Platform, type PushPrefs } from '@/anemos/platform-adapter';
import { getRuntimeApiBaseUrl } from '@/lib/runtime-switch';
import { getRuntimeAuthorizationHeaderSync, getRuntimeBearerTokenSync } from '@/lib/runtime-auth';
import { runtimeFetch } from '@/lib/runtime-fetch';
import { toast } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SettingsCheckboxRow,
  SettingsFieldRow,
  SettingsSection,
  SettingsInset,
  SETTINGS_OPTION_STACK_CLASS,
} from '@/components/sections/shared/SettingsSection';
import {
  DEFAULT_PUSH_PREFS,
  getPushPreferences,
  initializePushPreferences,
  setPushPreferences,
  subscribePushPreferences,
} from './push-preferences';
import { DEFAULT_PUSH_RELAY_URL, normalizePushRelayURL, usePushRelay } from './push-relay';
import { sendPushTest } from './push-test';
import { canClearPair, usePushPair, type Pair } from './use-push-pair';
import { PushFail, type PushIssue } from './push-pair';

const getServer = (): { type: 'http'; http: { url: string; username?: string; password?: string; authorization?: string } } | undefined => {
  const url = getRuntimeApiBaseUrl().trim();
  if (!url) return undefined;
  const authorization = getRuntimeAuthorizationHeaderSync() || (
    getRuntimeBearerTokenSync() ? `Bearer ${getRuntimeBearerTokenSync()}` : ''
  );
  let username: string | undefined;
  let password: string | undefined;
  if (/^Basic\s+/i.test(authorization)) {
    try {
      const decoded = atob(authorization.replace(/^Basic\s+/i, ''));
      const separator = decoded.indexOf(':');
      if (separator >= 0) {
        username = decoded.slice(0, separator);
        password = decoded.slice(separator + 1);
      }
    } catch {
      // Keep the raw authorization header for the HTTP transport.
    }
  }
  return {
    type: 'http',
    http: {
      url,
      ...(username !== undefined ? { username, password } : {}),
      ...(authorization ? { authorization } : {}),
    },
  };
};

const useRuntimePlatform = (): Platform => React.useMemo(() => getPlatformAdapter(), []);

const usePushPrefs = (platform: Platform): PushPrefs => {
  const prefs = React.useSyncExternalStore(subscribePushPreferences, getPushPreferences, getPushPreferences);
  React.useEffect(() => {
    void initializePushPreferences(platform);
  }, [platform]);
  return prefs;
};

const issueVariant = (issue?: PushIssue): string => {
  if (issue?.action === 'settings') return 'border-[var(--status-warning)]/30 bg-[var(--status-warning)]/10';
  if (issue) return 'border-[var(--status-error)]/30 bg-[var(--status-error)]/10';
  return 'border-[var(--status-info)]/30 bg-[var(--status-info)]/10';
};

const statusText = (pair: Pair, paired: boolean, running: boolean, issue?: PushIssue): string => {
  if (running) return 'Pairing with the OpenCode host…';
  if (paired) return 'This device is paired and can receive fork relay notifications.';
  if (issue) return issue.message;
  if (pair.status === 'pending' || pair.status === 'claimed') return 'A pairing request is waiting for the host to finish.';
  return 'Pair this device with the OpenCode host to receive notifications while the app is closed.';
};

const phaseText = (phase?: string): string => {
  switch (phase) {
    case 'permission': return 'Requesting notification permission…';
    case 'register': return 'Registering this device with the notification service…';
    case 'begin': return 'Creating a pairing request…';
    case 'claim': return 'Activating the host notification plugin…';
    case 'finish': return 'Finishing device pairing…';
    default: return 'Working…';
  }
};

export const AnemosPushSettings: React.FC = () => {
  const basePlatform = useRuntimePlatform();
  const platform = React.useMemo(() => ({ ...basePlatform, fetch: basePlatform.fetch ?? runtimeFetch }), [basePlatform]);
  const relay = usePushRelay(platform);
  const server = React.useMemo(() => getServer(), []);
  const pairing = usePushPair(platform, server, relay.current);
  const prefs = usePushPrefs(platform);
  const [relayDraft, setRelayDraft] = React.useState(relay.current);
  const [permissionBusy, setPermissionBusy] = React.useState(false);
  const [testBusy, setTestBusy] = React.useState(false);

  React.useEffect(() => {
    setRelayDraft(relay.current);
  }, [relay.current]);

  React.useEffect(() => {
    void pairing.refresh();
  }, [pairing.refresh]);

  const push = pairing.push;
  const paired = push?.paired === true || pairing.pair.status === 'active';
  const mobile = platform.platform === 'ios' || platform.platform === 'android';
  const supported = mobile && push?.supported !== false;
  const permission = push?.permission;
  const clearable = canClearPair({ paired, id: pairing.pair.id ?? push?.diag?.pairID, status: pairing.pair.status ?? push?.diag?.pairStatus });

  const requestPermission = async () => {
    if (!platform.requestPushPermission) return;
    setPermissionBusy(true);
    try {
      await platform.requestPushPermission();
      await pairing.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not request notification permission.');
    } finally {
      setPermissionBusy(false);
    }
  };

  const openSettings = async () => {
    if (!platform.openSystemSettings) return;
    setPermissionBusy(true);
    try {
      await platform.openSystemSettings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not open system settings.');
    } finally {
      setPermissionBusy(false);
    }
  };

  const testPush = async () => {
    if (!platform.testPush) return;
    setTestBusy(true);
    try {
      const href = typeof window === 'undefined' ? undefined : `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const ok = await sendPushTest({ platform, href });
      if (ok) toast.success('Test notification sent.');
      else toast.error('The test notification could not be sent.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The test notification could not be sent.');
    } finally {
      setTestBusy(false);
    }
  };

  const saveRelay = () => {
    const normalized = normalizePushRelayURL(relayDraft);
    if (!normalized) {
      setRelayDraft(relay.current);
      toast.error('Enter a valid HTTP or HTTPS relay URL.');
      return;
    }
    relay.set(normalized);
  };

  const updatePref = (key: keyof PushPrefs, value: boolean) => {
    setPushPreferences({ ...prefs, [key]: value }, platform);
  };

  const clearPair = async () => {
    try {
      await pairing.clear();
      toast.success('Push pairing cleared.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not clear push pairing.');
    }
  };

  const permissionLabel = !push
    ? 'Checking…'
    : permission === 'denied'
      ? 'Open System Settings'
      : permission === 'authorized' || permission === 'provisional' || permission === 'ephemeral'
        ? 'Enabled'
        : permission === 'unsupported'
          ? 'Unavailable'
          : 'Enable Notifications';
  const permissionAction = permission === 'denied' ? openSettings : requestPermission;
  const permissionDisabled = permissionBusy || !push || permission === 'unsupported'
    || (permission === 'denied' ? !platform.openSystemSettings : !platform.requestPushPermission);
  const pairingDisabled = !pairing.ready || pairing.running || pairing.clearing || !supported || !server || !push?.allowed || !push.registered || permission === 'denied';
  const pairingLabel = pairing.running
    ? phaseText(pairing.phase)
    : paired
      ? 'Repair Pairing'
      : pairing.pair.status === 'pending' || pairing.pair.status === 'claimed'
        ? 'Finish Pairing'
        : 'Pair Device';

  return (
    <SettingsSection
      settingsItem="anemos.notifications"
      title="Anemos Notifications"
      description="Use the Anemos fork relay for native notifications, including completion, approval, question, and error alerts."
    >
      <div className="space-y-5">
        {!mobile ? (
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 typography-meta text-muted-foreground">
            Fork relay push is available in the Anemos iOS and Android shells. Browser notifications remain available above.
          </div>
        ) : null}

        <div className={`rounded-lg border px-4 py-3 ${issueVariant(pairing.issue)}`} data-component="anemos-push-status">
          <div className="space-y-1">
            <div className="typography-settings-field-label text-foreground">
              {paired ? 'Phone paired' : pairing.issue ? 'Pairing needs attention' : 'Push pairing'}
            </div>
            <div className="typography-meta text-muted-foreground">
              {pairing.running ? phaseText(pairing.phase) : statusText(pairing.pair, paired, pairing.running, pairing.issue)}
            </div>
            {pairing.issue?.detail ? <div className="mt-2 break-words typography-meta text-muted-foreground">{pairing.issue.detail}</div> : null}
            {pairing.pair.command && pairing.issue?.code === 'host_install_failed' ? (
              <code className="mt-2 block overflow-x-auto rounded bg-background/70 px-2 py-1 typography-micro text-muted-foreground">
                {pairing.pair.command}
              </code>
            ) : null}
          </div>
        </div>

        <SettingsFieldRow
          settingsItem="anemos.notifications.permission"
          label="Permission"
          description={
            !push
              ? 'Checking notification permission…'
              : permission === 'denied'
                ? 'Enable notifications for Anemos in system settings.'
                : permission === 'unsupported'
                  ? 'Native notifications are unavailable in this shell.'
                  : push.allowed && !push.registered
                    ? 'Permission is granted; waiting for device registration.'
                    : `Permission: ${permission}.`
          }
        >
          <Button type="button" size="sm" variant="outline" disabled={permissionDisabled} onClick={() => void permissionAction()}>
            {permissionBusy ? 'Working…' : permissionLabel}
          </Button>
        </SettingsFieldRow>

        <SettingsFieldRow
          settingsItem="anemos.notifications.relay"
          label="Push relay URL"
          description="The relay endpoint used by the host plugin and this device."
          alignEnd={false}
          controlClassName="@xl:w-[30rem]"
        >
          <Input
            value={relayDraft}
            onChange={(event) => setRelayDraft(event.target.value)}
            onBlur={saveRelay}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                saveRelay();
              }
            }}
            placeholder={DEFAULT_PUSH_RELAY_URL}
            disabled={pairing.running}
            aria-label="Push relay URL"
            className="h-8 min-w-0 flex-1 font-mono text-xs"
          />
          <Button type="button" size="xs" variant="outline" disabled={pairing.running || relayDraft === relay.current} onClick={() => { relay.clear(); setRelayDraft(DEFAULT_PUSH_RELAY_URL); }}>
            Reset
          </Button>
        </SettingsFieldRow>

        <SettingsFieldRow
          settingsItem="anemos.notifications.pairing"
          label="Device pairing"
          description={!server ? 'Connect to an OpenCode server before pairing this device.' : supported ? statusText(pairing.pair, paired, pairing.running, pairing.issue) : 'Native push pairing is unavailable.'}
          alignEnd={false}
        >
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={pairingDisabled} onClick={() => void pairing.setup({ ask: true, source: 'settings' }).then((ok) => { if (ok) toast.success('Push pairing complete.'); }).catch((error) => { if (!(error instanceof PushFail)) toast.error(error instanceof Error ? error.message : 'Push pairing failed.'); })}>
              {pairingLabel}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={pairing.running || pairing.clearing || !platform.clearPushPairing || !clearable} onClick={() => void clearPair()}>
              {pairing.clearing ? 'Clearing…' : 'Clear Pairing'}
            </Button>
          </div>
        </SettingsFieldRow>

        <SettingsSection title="Relay notification types" settingsItem="anemos.notifications.preferences">
          <SettingsInset className={SETTINGS_OPTION_STACK_CLASS}>
            <SettingsCheckboxRow checked={prefs.complete} onChange={(value) => updatePref('complete', value)} label="Agent completion" description="Notify when an agent finishes a task." />
            <SettingsCheckboxRow checked={prefs.approval} onChange={(value) => updatePref('approval', value)} label="Approvals" description="Notify when an action is waiting for approval." />
            <SettingsCheckboxRow checked={prefs.question} onChange={(value) => updatePref('question', value)} label="Questions" description="Notify when an agent needs an answer." />
            <SettingsCheckboxRow checked={prefs.error} onChange={(value) => updatePref('error', value)} label="Errors" description="Notify when an agent or tool reports an error." />
            <div className="pt-1">
              <Button type="button" size="xs" variant="outline" onClick={() => setPushPreferences(DEFAULT_PUSH_PREFS, platform)}>Reset notification types</Button>
            </div>
          </SettingsInset>
        </SettingsSection>

        <SettingsFieldRow
          settingsItem="anemos.notifications.test"
          label="Test push"
          description="Send a native notification through the configured relay pairing."
        >
          <Button type="button" size="sm" variant="outline" disabled={testBusy || !paired || !platform.testPush} onClick={() => void testPush()}>
            {testBusy ? 'Sending…' : 'Send Test Push'}
          </Button>
        </SettingsFieldRow>
      </div>
    </SettingsSection>
  );
};
