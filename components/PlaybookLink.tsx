import Link from 'next/link';
import { FileText } from 'lucide-react';
import { t } from '@/lib/i18n';
import { playbookForMolecule, playbookPath } from '@/lib/playbooks';

// "Voir le protocole appliqué", where a decision about a medicine is made: the coordination and
// hospital medicine panel, the wholesaler's split, the pharmacy's alert. Shown only for a molecule
// with a draft playbook. No event records a playbook version yet, so the link says "Paramètres
// actuels" and the page opens with that notice (?contexte=).
export function PlaybookLink({ molecule, context, className = '' }: { molecule: string | null | undefined; context: string; className?: string }) {
  const p = playbookForMolecule(molecule);
  if (!p) return null;
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-0 text-sm ${className}`}>
      <Link href={`${playbookPath(p)}?contexte=${encodeURIComponent(context)}`} className="inline-flex min-h-12 items-center gap-1.5 font-medium">
        <FileText aria-hidden="true" size={16} />
        {t('core.playbook.link')}
      </Link>
      <span className="text-ink-muted">
        {t('core.playbook.statusDraft')} v{p.version} · {t('core.playbook.currentParams')}
      </span>
    </p>
  );
}
