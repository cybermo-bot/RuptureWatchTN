import { t } from '@/lib/i18n';

/** What report_impact returns, as the result screen uses it. */
export interface Impact {
  /** "<3" below 3 pharmacies, otherwise the number. The reporting pharmacy is included. */
  pharmacies: string;
  /** Withheld (null) below 3 pharmacies. */
  governorates: number | null;
  windowDays: number;
}

/**
 * The impact sentence of the result screen. The count includes the reporting pharmacy, so the
 * sentence says so: "Avec la vôtre, N pharmacies…", and "moins de 3" below 3 (session 4, fix 3).
 */
export function impactText(impact: Impact | null): string {
  if (!impact) return t('core.result.impactUnavailable');
  if (impact.governorates === null || impact.pharmacies === '<3') {
    return t('core.result.impactFew', { days: impact.windowDays });
  }
  if (impact.governorates === 1) {
    return t('core.result.impactOneGovernorate', { pharmacies: impact.pharmacies, days: impact.windowDays });
  }
  return t('core.result.impact', { pharmacies: impact.pharmacies, governorates: impact.governorates, days: impact.windowDays });
}
