const patterns = {
  injectable: /\b(?:inj(?:ectable)?s?|perfusion|perf|parenteral)\b/,
  inhaler: /\b(?:inh|inha|inhal|inhalateur|inhalation)\b/,
  drops: /\b(?:gtt|gttes?|gouttes?|collyres?)\b/,
  suppository: /\b(?:supp|suppo|suppositoires?)\b/,
  topical: /\b(?:cremes?|pommades?|pde)\b|\bgel\s+(?:derm\w*|cutan\w*)\b/,
  capsule: /\b(?:gelules?|gelu|gles|caps?|capsules?)\b/,
  tablet: /\b(?:comp|comprimes?)\b/,
  sachet: /\b(?:sach|sachets?)\b/,
  oralLiquid: /\b(?:sirop|sirops|buv|buvables?)\b|\b(?:solution|sol|suspension|susp)\s+orale?\b/,
} satisfies Record<string, RegExp>;

export type DosageForm = keyof typeof patterns | 'unknown';

function normalise(text: string): string {
  return text.normalize('NFC')
    .replace(/\bgél(?=[.\s]|$)/giu, 'gelu')
    .normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Classify only labels that name a form or a route covered by the illustrations. */
export function dosageForm(label?: string | null, brand?: string | null): DosageForm {
  const source = normalise(label ?? '');
  const prefix = normalise(brand ?? '');
  const text = prefix && (source === prefix || source.startsWith(`${prefix} `))
    ? source.slice(prefix.length).trimStart()
    : source;
  for (const [kind, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) return kind as keyof typeof patterns;
  }
  return 'unknown';
}
