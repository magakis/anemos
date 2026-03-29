// UPSTREAM-DIVERGENCE-FILE: The app package re-exports fork-only mobile push contracts added after
// upstream sync 6b9ce5e63. Future merges must keep this surface stable for packages/ios and
// packages/android, which consume the shared app package instead of re-declaring these types.

export { AppBaseProviders, AppInterface } from "./app"
export { useCommand } from "./context/command"
// UPSTREAM-DIVERGENCE: Preserve the push-related platform exports so native wrappers can share the
// same types and helpers as the app package during upstream merges.
export {
  type DisplayBackend,
  type NotifyOpts,
  type PairInfo,
  type PairState,
  type Platform,
  type PushCred,
  type PushDiag,
  type PushKind,
  type PushPerm,
  type PushPrefs,
  type PushState,
  usePlatform,
  PlatformProvider,
} from "./context/platform"
export { ServerConnection } from "./context/server"
export { handleNotificationClick } from "./utils/notification-click"
// UPSTREAM-DIVERGENCE: These helpers power the fork's relay-backed pairing flow from outside the app
// bundle, so removing them during an upstream sync would break mobile setup.
export {
  PushFail,
  pushIssue,
  type PushIssue,
  type PushIssueCode,
  type PushPhase,
  runPushSetup,
} from "./utils/push-pair"
