'use client';

import { Printer } from 'lucide-react';
import { t } from '@/lib/i18n';

/** Opens the browser's print dialog ("Enregistrer au format PDF" keeps a copy). */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-12 items-center gap-2 rounded-md bg-brand px-4 font-medium text-white transition-colors duration-150 hover:bg-brand-strong"
    >
      <Printer size={18} aria-hidden="true" />
      {t('core.note.print')}
    </button>
  );
}
