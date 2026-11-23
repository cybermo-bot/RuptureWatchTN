import { translator, type Locale } from '@/lib/i18n';

// At the top of every Library page (CLAUDE.md rule 12). Strong, not loud: a full band with a
// heavy rule and bold text, in ink, no alarm colour.
export function FrenchStatusBanner({ locale }: { locale: Locale }) {
  const t = translator(locale);
  return (
    <p role="note" className="border-y-2 border-ink bg-surface-subtle px-4 py-4 text-lg font-semibold text-ink">
      {t('library.banner')}
    </p>
  );
}
