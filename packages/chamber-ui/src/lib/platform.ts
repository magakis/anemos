import { isDesktopShell, isVSCodeRuntime } from '@/lib/desktop';

export type AnemosShellPlatform = 'ios' | 'android' | 'web';

declare global {
  interface Window {
    __ANEMOS_SHELL__?: AnemosShellPlatform;
  }
}

// ANEMOS-PATCH: centralize native-shell detection for Capacitor, Tauri, and the Swift WKWebView.
export const isAnemosNativeShell = (): boolean => {
  if (typeof window === 'undefined') return false;
  const capacitor = (window as typeof window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  const origin = window.location.origin;
  return capacitor?.isNativePlatform?.() === true
    || '__TAURI_INTERNALS__' in window
    || window.location.protocol === 'capacitor:'
    || window.location.protocol === 'tauri:'
    || origin === 'http://tauri.localhost'
    || window.__ANEMOS_SHELL__ === 'ios'
    || window.__ANEMOS_SHELL__ === 'android';
};

export const isNativeShell = isAnemosNativeShell;

export const getAnemosShellPlatform = (): AnemosShellPlatform => {
  if (typeof window !== 'undefined') {
    const marker = window.__ANEMOS_SHELL__;
    if (marker === 'ios' || marker === 'android') {
      return marker;
    }
    const capacitor = (window as typeof window & { Capacitor?: { getPlatform?: () => string } }).Capacitor;
    const platform = capacitor?.getPlatform?.();
    if (platform === 'ios' || platform === 'android') return platform;
  }
  return 'web';
};

/** True when running inside any native mobile shell, not the web/PWA. */
export const isCapacitorApp = isAnemosNativeShell;

// TEMPORARY WORKAROUND — Windows ARM64: native opencode.exe fails with a Bun
// FFI/TinyCC dlopen error (https://github.com/anomalyco/opencode/issues/19130).
// Suppress OpenCode update UI on ARM64 so it can't self-upgrade to the broken
// ARM64 build. Remove this helper and its call sites when resolved upstream.
export const isWindowsArm64 = (): boolean => {
  if (typeof window === 'undefined') return false;

  const electronArch = window.__OPENCHAMBER_ELECTRON__?.arch?.toLowerCase?.();
  if (electronArch === 'arm64' || electronArch === 'aarch64') {
    const platform = (navigator.platform || '').toLowerCase();
    return platform.includes('win');
  }

  const vscodeArch = (window as { __VSCODE_CONFIG__?: { arch?: string } }).__VSCODE_CONFIG__?.arch?.toLowerCase?.();
  if (vscodeArch === 'arm64' || vscodeArch === 'aarch64') {
    const platform = (navigator.platform || '').toLowerCase();
    return platform.includes('win');
  }

  const nav = (navigator as Navigator & { userAgentData?: { architecture?: string; platform?: string } }).userAgentData;
  if (nav?.architecture?.toLowerCase?.() === 'arm64' || nav?.architecture?.toLowerCase?.() === 'aarch64') {
    const platform = (nav.platform || navigator.platform || '').toLowerCase();
    return platform.includes('win');
  }

  const ua = navigator.userAgent.toLowerCase();
  if ((ua.includes('aarch64') || ua.includes('arm64') || ua.includes('armv')) && ua.includes('windows')) {
    return true;
  }

  return false;
};

/**
 * True when running inside the native Capacitor shell on an iPad.
 * Capacitor reports 'ios' for both iPhone and iPad; iPadOS WKWebView
 * masquerades as macOS Safari, so the only reliable tell is a Mac-like
 * platform with real touch points (or a legacy explicit iPad UA).
 */
export const isIPadApp = (): boolean => {
  if (typeof window === 'undefined' || !isAnemosNativeShell()) return false;
  if (getAnemosShellPlatform() !== 'ios') return false;
  const userAgent = navigator.userAgent || '';
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;
  return /iPad/i.test(userAgent)
    || (/Macintosh|MacIntel/i.test(userAgent) && maxTouchPoints > 1);
};

export type ClientPlatform = 'ios' | 'android' | 'vscode' | 'desktop' | 'web';

/**
 * The runtime surface this client is. Used by the push presence model: only 'ios'/'android'
 * count as mobile (push recipients); everything else is an interactive surface that suppresses
 * mobile push while visible.
 */
export const getClientPlatform = (): ClientPlatform => {
  if (typeof window !== 'undefined') {
    if (window.__ANEMOS_SHELL__ === 'ios' || window.__ANEMOS_SHELL__ === 'android') {
      return window.__ANEMOS_SHELL__;
    }
    const capacitor = (window as typeof window & { Capacitor?: { getPlatform?: () => string } }).Capacitor;
    const native = capacitor?.getPlatform?.();
    if (native === 'ios' || native === 'android') return native;
  }
  if (isVSCodeRuntime()) return 'vscode';
  if (isDesktopShell()) return 'desktop';
  return 'web';
};
