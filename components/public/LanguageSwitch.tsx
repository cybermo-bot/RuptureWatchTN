'use client';

import { usePathname } from 'next/navigation';
import { setLocale } from '@/app/actions/locale';
import { LOCALES, translator, type Locale } from '@/lib/i18n';

// FR / عربي. Each name is written in its own language and script; the chosen one is marked
// as current. A plain form: it works before JavaScript loads.
const NAMES: Record<Locale, string> = { fr: 'FR', ar: 'عربي' };

export function LanguageSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const t = translator(locale);
  return (
    <form action={setLocale} aria-label={t('public.shell.languageLabel')}>
      <input type="hidden" name="path" value={pathname} />
      <ul className="flex items-center">
        {LOCALES.map((l) => (
          <li key={l}>
            <button
              type="submit"
              name="locale"
              value={l}
              lang={l}
              aria-current={l === locale ? 'true' : undefined}
              className="inline-flex min-h-12 min-w-12 items-center justify-center px-2 text-sm text-ink-muted hover:text-ink aria-[current=true]:font-semibold aria-[current=true]:text-ink aria-[current=true]:underline aria-[current=true]:underline-offset-4"
            >
              {NAMES[l]}
            </button>
          </li>
        ))}
      </ul>
    </form>
  );
}
