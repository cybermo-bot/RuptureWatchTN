// "Essayez : ..." The first thing to try in each professional space, shown to demo accounts only
// (a jury clicks around without instructions; this is their instruction). One line per space,
// dismissible, the dismissal kept in the browser only (components/console/HintStrip.tsx).
// A hint whose action sits on another page links to it; the wholesaler's lands on the split
// panel of the medicine selected by default (the most serious one).

import type { OrganisationType } from '@/lib/demo/roles';
import type { MessageKey } from '@/lib/i18n';

export interface SpaceHint {
  text: MessageKey;
  link?: { label: MessageKey; href: string };
}

/** The prescriber's view is a public page, outside the console: no hint there. */
export const SPACE_HINTS: Record<Exclude<OrganisationType, 'prescriber'>, SpaceHint> = {
  pharmacy: { text: 'core.tryHint.pharmacy', link: { label: 'core.tryHint.pharmacyLink', href: '/pharmacie/signaler' } },
  wholesaler: { text: 'core.tryHint.wholesaler', link: { label: 'core.tryHint.wholesalerLink', href: '/grossiste#repartition-equitable' } },
  hospital_pharmacy: { text: 'core.tryHint.panel' },
  coordinator: { text: 'core.tryHint.panel' },
  central_pharmacy: { text: 'core.tryHint.central' },
  pharmacists_order: { text: 'core.tryHint.order', link: { label: 'core.tryHint.orderLink', href: '/ordre/message' } },
};

/** The hint for a session, or null: demo accounts only (testers and real members see none). */
export function hintFor(type: OrganisationType, origin: string): SpaceHint | null {
  if (origin !== 'simulated' || type === 'prescriber') return null;
  return SPACE_HINTS[type];
}

/** Browser storage key of a dismissed hint (one per space). */
export const hintStorageKey = (type: OrganisationType) => `rw-try-hint-dismissed-${type}`;

/** The hint is pointless on the page it links to (an anchor on the same page still counts as elsewhere). */
export function hintShownOn(hint: SpaceHint, pathname: string): boolean {
  const href = hint.link?.href;
  return !href || !(pathname === href || pathname.startsWith(`${href}/`));
}
