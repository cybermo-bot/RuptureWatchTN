// The sections of each professional space, shown in the console sidebar, the phone drawer and,
// for the pharmacy, the bottom tab bar. Icons come from one set (Lucide), always next to a word.

import { isPilot } from '@/lib/env';
import type { OrganisationType } from '@/lib/demo/roles';
import type { MessageKey } from '@/lib/i18n';

export type NavIcon =
  | 'today'
  | 'report'
  | 'followed'
  | 'alerts'
  | 'more'
  | 'whatsapp'
  | 'requests'
  | 'national'
  | 'signals'
  | 'export'
  | 'invite'
  | 'split'
  | 'note'
  | 'arrivals'
  | 'upstream'
  | 'network'
  | 'message';

export interface NavItem {
  href: string;
  label: MessageKey;
  icon: NavIcon;
  /**
   * Regular expression source of the paths where this item is current; default: its own path
   * exactly. A string, not a RegExp, so the item can cross to client components.
   */
  match?: string;
  /** Shows a count next to the item. */
  badge?: 'alerts' | 'requests';
}

const PHARMACY_HOME = '^/pharmacie(/molecule/.*)?$';
const PHARMACY_REPORT = '^/pharmacie/signaler';

export const NAV: Record<OrganisationType, NavItem[]> = {
  pharmacy: [
    { href: '/pharmacie', label: 'core.pharmacy.today.nav', icon: 'today', match: PHARMACY_HOME },
    { href: '/pharmacie/signaler', label: 'core.nav.items.report', icon: 'report', match: PHARMACY_REPORT },
    { href: '/pharmacie/demandes', label: 'core.nav.items.requests', icon: 'requests', badge: 'requests' },
    { href: '/pharmacie/alertes', label: 'core.nav.items.alerts', icon: 'alerts', badge: 'alerts' },
    { href: '/pharmacie/plus', label: 'core.nav.items.more', icon: 'more', match: '^/pharmacie/(plus|whatsapp)' },
  ],
  wholesaler: [{ href: '/grossiste', label: 'core.nav.items.signals', icon: 'signals', match: '^/grossiste' }],
  hospital_pharmacy: [{ href: '/hopital', label: 'core.nav.items.signals', icon: 'signals' }],
  coordinator: [
    { href: '/coordination', label: 'core.nav.items.national', icon: 'national' },
    { href: '/coordination/note', label: 'core.nav.items.note', icon: 'note' },
  ],
  // The prescriber's view is one public page (/prescripteurs), outside the console.
  prescriber: [],
  central_pharmacy: [
    { href: '/centrale', label: 'core.nav.items.risk', icon: 'arrivals' },
    { href: '/centrale/amont', label: 'core.nav.items.upstream', icon: 'upstream' },
  ],
  pharmacists_order: [
    { href: '/ordre', label: 'core.nav.items.network', icon: 'network' },
    { href: '/ordre/message', label: 'core.nav.items.message', icon: 'message' },
  ],
};

/**
 * The pharmacy's bottom tab bar on phones: four tabs, the report first. The requests tab reads
 * « Demandes » (its own key): « Demandes de patients », shared with the sidebar, overlapped its
 * neighbour at 375 px (pilot-1 item 7).
 */
export const PHARMACY_TABS: NavItem[] = [
  { href: '/pharmacie', label: 'core.pharmacy.tabs.home', icon: 'today', match: PHARMACY_HOME },
  { href: '/pharmacie/signaler', label: 'core.pharmacy.tabs.report', icon: 'report', match: PHARMACY_REPORT },
  { href: '/pharmacie/demandes', label: 'core.pharmacy.tabs.requests', icon: 'requests', badge: 'requests' },
  {
    href: '/pharmacie/plus',
    label: 'core.pharmacy.tabs.more',
    icon: 'more',
    match: '^/pharmacie/(plus|whatsapp|alertes)',
    badge: 'alerts',
  },
];

export const MORE_NAV: Partial<Record<OrganisationType, NavItem[]>> = {
  coordinator: [
    { href: '/coordination/export', label: 'core.nav.items.export', icon: 'export' },
    { href: '/coordination/invitation', label: 'core.nav.items.invite', icon: 'invite' },
  ],
  pharmacists_order: [{ href: '/ordre/invitation', label: 'core.nav.items.invite', icon: 'invite' }],
};

/** Showcase pages, listed under "Comprendre" in every sidebar. */
/** The « Comprendre » pages this site shows: the pilot has no scenario and no four views (pilot-2 item 1). */
export function understandLinks(): typeof UNDERSTAND {
  return isPilot() ? UNDERSTAND.filter(({ href }) => href !== '/scenario' && href !== '/vues') : UNDERSTAND;
}

export const UNDERSTAND: { href: string; label: MessageKey }[] = [
  { href: '/scenario', label: 'core.nav.items.scenario' },
  { href: '/vues', label: 'core.nav.items.views' },
  { href: '/methode', label: 'core.nav.items.method' },
  { href: '/retour', label: 'core.nav.items.replay' },
];

export function isCurrent(item: Pick<NavItem, 'href' | 'match'>, pathname: string): boolean {
  return item.match ? new RegExp(item.match).test(pathname) : pathname === item.href;
}
