// Evidence as screens receive it: pharmacy counts 1 and 2 read "<3", and the number of
// governorates is withheld below 3 pharmacies ("<3 pharmacies in 2 governorates" would reveal
// exactly 2). The database applies the same rule in app.shown_evidence (migration 0011);
// tests/db/signal-views.test.ts checks that both agree. Usable on the server and in the
// browser (the in-memory scenario).

import { displayCount, type Evidence, type ForeignNotice } from '@/lib/signal';

/** A pharmacy count as shown: 0, '<3', or 3 and more. */
export type ShownCount = number | '<3';

export interface ShownNotice {
  source: string;
  status: ForeignNotice['status'];
  publishedAt: string;
  url: string;
}

export interface ShownEvidence {
  pharmacies14d: ShownCount;
  /** Withheld (null) when pharmacies14d is '<3'. */
  governorates14d: number | null;
  pharmacies7d: ShownCount;
  deliveredAgainPharmacies: ShownCount;
  ignoredTooEarly: ShownCount;
  lastNotDeliveredAt: string | null;
  notices: ShownNotice[];
}

export function shownCount(n: number): ShownCount {
  return displayCount(n).suppressed ? '<3' : n;
}

/** From an evaluation's evidence (the scenario and the time machine, in memory). */
export function shownEvidence(e: Evidence): ShownEvidence {
  const pharmacies14d = shownCount(e.pharmacies14d);
  return {
    pharmacies14d,
    governorates14d: pharmacies14d === '<3' ? null : e.governorates14d,
    pharmacies7d: shownCount(e.pharmacies7d),
    deliveredAgainPharmacies: shownCount(e.deliveredAgainPharmacies),
    ignoredTooEarly: shownCount(e.ignoredTooEarly),
    lastNotDeliveredAt: e.lastNotDeliveredAt ? e.lastNotDeliveredAt.toISOString() : null,
    notices: e.activeNotices.map((n) => ({
      source: n.source,
      status: n.status,
      publishedAt: n.publishedAt.toISOString(),
      url: n.url,
    })),
  };
}
