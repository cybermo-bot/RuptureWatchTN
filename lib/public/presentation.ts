import type { Translate } from '@/lib/i18n';

// Expand the unambiguous CNAM tablet format. Preserve the full catalogue label for other forms,
// compound strengths, release profiles and packaging we cannot interpret confidently.
const boxedTablets = /^(?:(\d+(?:[.,]\d+)?)\s+)?(?:(comp\.?\s+pell\.?)\s+(\d+(?:[.,]\d+)?)\s*mg|(\d+(?:[.,]\d+)?)\s*mg\s+(comp\.?\s+pell\.?))\s+bt\.?\s*(\d+)$/i;

export function presentationText({ label, brand }: { label: string; brand: string }, t: Translate): string {
  const leadingBrand = `${brand} `;
  if (!label.toLocaleUpperCase('fr').startsWith(leadingBrand.toLocaleUpperCase('fr'))) return label;
  const match = boxedTablets.exec(label.slice(leadingBrand.length).trim());
  if (!match) return label;
  const [, abbreviatedStrength, , strengthAfterForm, strengthBeforeForm, , units] = match;
  const strength = strengthAfterForm ?? strengthBeforeForm;
  if (abbreviatedStrength && abbreviatedStrength !== strength) return label;
  return t('public.medicines.boxedTablet', { brand, strength, units });
}
