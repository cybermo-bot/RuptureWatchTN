// All interface text lives in messages/fr.json. Components call t(key), never inline strings.
// Works in server and client components. Arabic can be added later as messages/ar.json.

import fr from '@/messages/fr.json';

type Messages = typeof fr;

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;

export const locale = 'fr';
export const dir: 'ltr' | 'rtl' = 'ltr';

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  let node: unknown = fr;
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown> | undefined)?.[part];
  }
  if (typeof node !== 'string') {
    throw new Error(`Missing message: ${key}`);
  }
  if (!vars) return node;
  return node.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
