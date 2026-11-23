// "Ce qui manque": one line beside a level, saying which condition is still missing for the next
// level. Computed from the evaluator's result (its level, the rule that fired) and its evidence,
// against the evaluator's own parameters (lib/signal/params.ts): never a second copy of a
// threshold. Usable on the server and in the browser (the scenario).
//
// Two modes. On real data (`exact: false`) the evidence arrives as screens receive it
// (lib/signals/shown.ts): the line names the missing condition and never prints a computed count
// of pharmacies, so nothing below 3 can leak. In the scenario (`exact: true`) counts are exact
// and the line says how many are missing.

import { t } from '@/lib/i18n';
import { confirmPharmaciesNeeded, DEFAULT_PARAMS, type Level, type RuleId, type SignalParams } from '@/lib/signal';
import type { ShownCount } from './shown';

const DAY = 86_400_000;

/** The evidence fields this needs: an evaluation's (exact numbers) or a screen's (shown counts). */
export interface MissingEvidence {
  pharmacies14d: ShownCount;
  /** Null when withheld (fewer than 3 pharmacies). */
  governorates14d: number | null;
  pharmacies7d: ShownCount;
  deliveredAgainPharmacies: ShownCount;
  lastNotDeliveredAt: string | Date | null;
}

export type MissingItem =
  /** Nothing yet: a first report or a foreign notice. */
  | { kind: 'firstEvidence' }
  /** A foreign notice alone: Tunisian reports are needed (gate one). */
  | { kind: 'localReports' }
  /** More pharmacies in the likely window. `more` only in exact mode. */
  | { kind: 'likelyPharmacies'; more: number | null }
  /** More pharmacies in the confirm window. `more` only in exact mode. */
  | { kind: 'confirmPharmacies'; more: number | null; governoratesUnknown: boolean }
  /** More governorates (gate two). `more` is known whenever the governorate count is shown. */
  | { kind: 'governorates'; more: number }
  /**
   * "Livré à nouveau" reports. `more` only in exact mode. `uncertain`: the shown count is "<3" and
   * the bar is 2 or less, so it may already be met; the line then says it is needed "if not yet".
   */
  | { kind: 'deliveredAgain'; more: number | null; uncertain: boolean }
  /** Days without a new "not delivered" report. */
  | { kind: 'quietDays'; days: number };

export interface Missing {
  next: Level;
  items: MissingItem[];
}

export interface MissingOptions {
  exact: boolean;
  now: Date;
  params?: SignalParams;
  /** Active member pharmacies, if known (the confirm bar grows with the network). */
  activeMemberPharmacies?: number | null;
}

const num = (c: ShownCount): number | null => (c === '<3' ? null : c);
const atLeast = (c: ShownCount, n: number): boolean | null => {
  if (c === '<3') return n <= 0 ? true : n >= 3 ? false : null; // 1 or 2: unknown against 1 or 2
  return c >= n;
};

/** What is missing for the next level, or null when there is nothing to say (none to show, or levée). */
export function missingForNextLevel(level: Level, rule: RuleId, e: MissingEvidence, opts: MissingOptions): Missing | null {
  const p = opts.params ?? DEFAULT_PARAMS;
  const exact = opts.exact;

  if (level === 'none') return { next: 'watch', items: [{ kind: 'firstEvidence' }] };
  if (level === 'cleared') return null;

  if (level === 'watch') {
    if (rule === 'foreign_notice_only') return { next: 'likely', items: [{ kind: 'localReports' }] };
    const n7 = num(e.pharmacies7d);
    return { next: 'likely', items: [{ kind: 'likelyPharmacies', more: exact && n7 !== null ? Math.max(1, p.likelyMinPharmacies - n7) : null }] };
  }

  if (level === 'likely') {
    const items: MissingItem[] = [];
    const needed = confirmPharmaciesNeeded(p, opts.activeMemberPharmacies);
    const enough = atLeast(e.pharmacies14d, needed);
    if (enough !== true) {
      const n14 = num(e.pharmacies14d);
      items.push({
        kind: 'confirmPharmacies',
        more: exact && n14 !== null ? needed - n14 : null,
        governoratesUnknown: e.governorates14d === null,
      });
    }
    if (e.governorates14d !== null && e.governorates14d < p.confirmMinGovernorates) {
      items.push({ kind: 'governorates', more: p.confirmMinGovernorates - e.governorates14d });
    }
    return items.length ? { next: 'confirmed', items } : null;
  }

  // confirmed: what "levée" needs.
  const items: MissingItem[] = [];
  const last = e.lastNotDeliveredAt ? new Date(e.lastNotDeliveredAt).getTime() : null;
  const quietSoFar = last === null ? Infinity : (opts.now.getTime() - last) / DAY;
  if (quietSoFar < p.quietDays) items.push({ kind: 'quietDays', days: Math.max(1, Math.ceil(p.quietDays - quietSoFar)) });
  const delivered = atLeast(e.deliveredAgainPharmacies, p.clearMinDeliveredPharmacies);
  // Still "confirmée" after the quiet period: the evaluator found too few "livré à nouveau".
  const quietMet = items.length === 0;
  if (delivered === false || (delivered === null && quietMet)) {
    const d = num(e.deliveredAgainPharmacies);
    items.push({ kind: 'deliveredAgain', more: exact && d !== null ? p.clearMinDeliveredPharmacies - d : null, uncertain: false });
  } else if (delivered === null) {
    items.push({ kind: 'deliveredAgain', more: null, uncertain: true });
  }
  return items.length ? { next: 'cleared', items } : null;
}

function itemText(item: MissingItem, p: SignalParams): string {
  switch (item.kind) {
    case 'firstEvidence':
      return t('core.missing.firstEvidence');
    case 'localReports':
      return t('core.missing.localReports');
    case 'likelyPharmacies':
      return item.more === null
        ? t('core.missing.likelyPharmacies', { days: p.likelyWindowDays })
        : t(item.more === 1 ? 'core.missing.likelyPharmaciesOne' : 'core.missing.likelyPharmaciesMany', { n: item.more, days: p.likelyWindowDays });
    case 'confirmPharmacies':
      if (item.more !== null) {
        return t(item.more === 1 ? 'core.missing.confirmPharmaciesOne' : 'core.missing.confirmPharmaciesMany', { n: item.more, days: p.confirmWindowDays });
      }
      return item.governoratesUnknown
        ? t('core.missing.confirmPharmaciesWithGovernorates', { gov: p.confirmMinGovernorates })
        : t('core.missing.confirmPharmacies');
    case 'governorates':
      return item.more === 1 && p.confirmMinGovernorates === 2
        ? t('core.missing.secondGovernorate')
        : t('core.missing.governorates', { n: item.more });
    case 'deliveredAgain':
      if (item.more !== null) {
        return t(item.more === 1 ? 'core.missing.deliveredOne' : 'core.missing.deliveredMany', { n: item.more });
      }
      return item.uncertain
        ? t('core.missing.deliveredIfNotYet', { n: p.clearMinDeliveredPharmacies })
        : t('core.missing.delivered', { n: p.clearMinDeliveredPharmacies });
    case 'quietDays':
      return t(item.days === 1 ? 'core.missing.quietOne' : 'core.missing.quietMany', { n: item.days });
  }
}

/** The line as shown: "Pour « Confirmée », il manque un deuxième gouvernorat." */
export function missingText(m: Missing, params: SignalParams = DEFAULT_PARAMS): string {
  const parts = m.items.map((i) => itemText(i, params));
  const list = parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} ${t('core.missing.and')} ${parts[parts.length - 1]}`;
  return t('core.missing.line', { level: t(`core.levels.${m.next}`), items: list });
}
