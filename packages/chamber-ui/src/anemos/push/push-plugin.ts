// ANEMOS-PATCH: keep host-side fork relay command generation local to UI 3.

const spec = '@anemos/push';
const bin = 'opencode-push';

const relayArg = (relay?: string): string => (relay ? ` --relay ${relay}` : '');

const name = (value: string): string => {
  const index = value.lastIndexOf('@');
  return index > 0 ? value.slice(0, index) : value;
};

export const hasPush = (list?: string[]): boolean => (list ?? []).some((item) => name(item) === spec);

export const addPush = (list?: string[]): string[] => {
  const next = (list ?? []).filter((item) => name(item) !== spec);
  next.push(spec);
  return next;
};

export const dropPush = (list?: string[]): string[] => (list ?? []).filter((item) => name(item) !== spec);

export const installPush = (tool: 'npx' | 'bunx' = 'npx'): string => {
  if (tool === 'bunx') return `bunx ${spec} install`;
  return `npx --yes --prefix . --package=${spec} ${bin} install`;
};

export const installPair = (token: string, relay?: string, tool: 'npx' | 'bunx' = 'npx'): string => {
  if (tool === 'bunx') return `bunx ${spec} install --pair ${token}${relayArg(relay)}`;
  return `npx --yes --prefix . --package=${spec} ${bin} install --pair ${token}${relayArg(relay)}`;
};

export const pairPush = (token: string, relay?: string, tool: 'npx' | 'bunx' = 'npx'): string => {
  if (tool === 'bunx') return `bunx ${spec} pair --pair ${token}${relayArg(relay)}`;
  return `npx --yes --prefix . --package=${spec} ${bin} pair --pair ${token}${relayArg(relay)}`;
};

export const PushPlugin = {
  pkg: spec,
  spec,
  bin,
} as const;
