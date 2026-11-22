// The visitor's language on public pages, read from a cookie. Professional spaces stay in French.
import 'server-only';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, dirOf, isLocale, LOCALE_COOKIE, translator, type Locale, type Translate } from '@/lib/i18n';

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getTranslator(): Promise<{ locale: Locale; dir: 'ltr' | 'rtl'; t: Translate }> {
  const locale = await getLocale();
  return { locale, dir: dirOf(locale), t: translator(locale) };
}
