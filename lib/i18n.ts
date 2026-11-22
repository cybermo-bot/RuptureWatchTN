// All interface text lives in messages/fr.json. Components call t(key), never inline strings.
// Works in server and client components. Arabic can be added later as messages/ar.json.

import fr from '@/messages/fr.json';

type Messages = typeof fr;

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends readonly unknown[]
      ? never
      : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

type Lists<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends readonly string[]
    ? `${P}${K}`
    : T[K] extends string
      ? never
      : Lists<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;
export type MessageListKey = Lists<Messages>;

export const locale = 'fr';
export const dir: 'ltr' | 'rtl' = 'ltr';

function lookup(key: string): unknown {
  let node: unknown = fr;
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown> | undefined)?.[part];
  }
  return node;
}

function fill(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const node = lookup(key);
  if (typeof node !== 'string') {
    throw new Error(`Missing message: ${key}`);
  }
  return fill(node, vars);
}

/** A list of sentences, such as the guidance for a level. */
export function tList(key: MessageListKey): string[] {
  const node = lookup(key);
  if (!Array.isArray(node) || !node.every((s) => typeof s === 'string')) {
    throw new Error(`Missing message list: ${key}`);
  }
  return node as string[];
}
