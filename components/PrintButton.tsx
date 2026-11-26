'use client';

import { Printer } from 'lucide-react';
import { buttonClass } from '@/components/Button';
import { t } from '@/lib/i18n';

/** Opens the browser's print dialog ("Enregistrer au format PDF" keeps a copy). */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={buttonClass()}
    >
      <Printer size={20} aria-hidden="true" />
      {t('core.note.print')}
    </button>
  );
}
