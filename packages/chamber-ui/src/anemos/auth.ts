// ANEMOS-PATCH: derive direct-instance Basic credentials for runtime requests.

export interface AnemosTokenProvider {
  getToken(): string | null;
  setToken(value: string | null): void;
}

const AUTH_TOKEN_STORAGE_KEY = 'anemos.authToken';

const encodeBase64 = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.slice(index, index + 0x8000));
  }
  return btoa(binary);
};

// ANEMOS-PATCH: derive the Basic header used by direct OpenCode instances from
// the credentials saved with the instance metadata.
export const deriveBasicAuthorization = (username?: unknown, password?: unknown): string | null => {
  const normalizedUsername = typeof username === 'string' ? username.trim() : '';
  const normalizedPassword = typeof password === 'string' ? password : '';
  if (!normalizedUsername && !normalizedPassword) return null;
  return `Basic ${encodeBase64(`${normalizedUsername || 'opencode'}:${normalizedPassword}`)}`;
};

const normalizeToken = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  if (!token || !/^[A-Za-z0-9+/]+={0,2}$/.test(token) || token.length % 4 !== 0) return null;

  try {
    const decoded = atob(token);
    return decoded.includes(':') ? token : null;
  } catch {
    return null;
  }
};

export const localStorageTokenProvider: AnemosTokenProvider = {
  getToken: () => {
    if (typeof window === 'undefined') return null;
    try {
      return normalizeToken(window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY));
    } catch {
      return null;
    }
  },
  setToken: (value) => {
    if (typeof window === 'undefined') return;
    try {
      if (value === null) {
        window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        return;
      }
      const token = normalizeToken(value);
      if (token) window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } catch {
      return;
    }
  },
};

export const consumeAuthTokenFromLocation = (provider: AnemosTokenProvider = localStorageTokenProvider): string | null => {
  if (typeof window === 'undefined') return null;

  const url = new URL(window.location.href);
  const queryToken = url.searchParams.get('auth_token');
  if (queryToken === null) return provider.getToken();

  const token = normalizeToken(queryToken);
  if (token) provider.setToken(token);
  url.searchParams.delete('auth_token');
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  return token;
};
