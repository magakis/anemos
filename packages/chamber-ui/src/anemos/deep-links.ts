// ANEMOS-PATCH: replace OpenChamber's registered URL scheme while accepting legacy links.

export const ANEMOS_DEEP_LINK_SCHEME = 'opencode';
export const LEGACY_DEEP_LINK_SCHEME = 'openchamber';

export const remapDeepLinkScheme = (raw: string): string =>
  raw.replace(new RegExp(`^${LEGACY_DEEP_LINK_SCHEME}:`, 'i'), `${ANEMOS_DEEP_LINK_SCHEME}:`);

export const isAnemosDeepLink = (raw: string | null | undefined): boolean => {
  if (typeof raw !== 'string') return false;
  const normalized = remapDeepLinkScheme(raw.trim());
  return normalized.toLowerCase().startsWith(`${ANEMOS_DEEP_LINK_SCHEME}:`);
};
