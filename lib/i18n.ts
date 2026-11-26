// All interface text lives in messages/<locale>/<namespace>.json. Components call t(key),
// never inline strings. Keys start with their namespace, one per track, so parallel work
// never edits the same file:
//   core        professional spaces and shared pieces (track A)
//   public      public pages: medicine status, availability requests, archive (track B)
//   directory   pharmacies open near the patient (track C)
//   library     French over-the-counter status (track C)
//   wholesaler  wholesaler space (track D)
// French is complete. Arabic exists for the public namespaces only; a key missing in Arabic
// falls back to French and logs a warning in development.
// Works in server and client components. On public pages, use translator(locale) with the
// locale from getLocale() (lib/i18n-server.ts), or passed down to client components.

import frCore from '@/messages/fr/core.json';
import frPublic from '@/messages/fr/public.json';
import frDirectory from '@/messages/fr/directory.json';
import frLibrary from '@/messages/fr/library.json';
import frWholesaler from '@/messages/fr/wholesaler.json';
import arPublic from '@/messages/ar/public.json';
import arDirectory from '@/messages/ar/directory.json';
import arLibrary from '@/messages/ar/library.json';

const fr = {
  core: frCore,
  public: frPublic,
  directory: frDirectory,
  library: frLibrary,
  wholesaler: frWholesaler,
};

const ar = {
  public: arPublic,
  directory: arDirectory,
  library: arLibrary,
};

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
export type Namespace = keyof Messages;

export const LOCALES = ['fr', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';
/** Cookie holding the visitor's language on public pages. */
export const LOCALE_COOKIE = 'rw-lang';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

// The professional spaces are in French.
export const locale: Locale = DEFAULT_LOCALE;
export const dir = dirOf(DEFAULT_LOCALE);

function lookup(messages: unknown, key: string): unknown {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown> | undefined)?.[part];
  }
  return node;
}

function fill(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

const warned = new Set<string>();

function warnFallback(key: string): void {
  if (process.env.NODE_ENV !== 'development' || warned.has(key)) return;
  warned.add(key);
  console.warn(`[i18n] Arabic text missing for "${key}", showing French.`);
}

/** The message for a key in a locale, falling back to French when Arabic is missing. */
function resolve(target: Locale, key: string): unknown {
  if (target === 'ar') {
    const node = lookup(ar, key);
    if (node !== undefined) return node;
    warnFallback(key);
  }
  return lookup(fr, key);
}

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function translator(target: Locale): Translate {
  return (key, vars) => {
    const node = resolve(target, key);
    if (typeof node !== 'string') {
      throw new Error(`Missing message: ${key}`);
    }
    return fill(node, vars);
  };
}

export function listTranslator(target: Locale): (key: MessageListKey) => string[] {
  return (key) => {
    const node = resolve(target, key);
    if (!Array.isArray(node) || !node.every((s) => typeof s === 'string')) {
      throw new Error(`Missing message list: ${key}`);
    }
    return node as string[];
  };
}

/** French text, for the professional spaces and shared pieces. */
export const t: Translate = translator(DEFAULT_LOCALE);

/** A list of sentences in French, such as the guidance for a level. */
export const tList = listTranslator(DEFAULT_LOCALE);

/** The CLDR plural categories. A plural message has all six as children: Arabic uses them all. */
export const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const;

/** A message whose children are the plural categories (`public.freshness.hours`). */
export type PluralKey = { [K in MessageKey]: K extends `${infer Base}.other` ? Base : never }[MessageKey];

const pluralRules: Record<Locale, Intl.PluralRules> = { fr: new Intl.PluralRules('fr'), ar: new Intl.PluralRules('ar') };

/**
 * The message for a count, in the locale's plural form, with the count as {n}: « حُدِّث قبل 8
 * ساعات », not « 8 ساعة » (pilot-1 item 7). French has the same six keys, most of them alike.
 */
export function plural(target: Locale, key: PluralKey, n: number, vars?: Record<string, string | number>): string {
  const category = pluralRules[target].select(n);
  return translator(target)(`${key}.${category}` as MessageKey, { ...vars, n });
}
