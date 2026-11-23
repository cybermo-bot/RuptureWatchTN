// A comparison key for substance names, shared by scripts/build-dpm-list.ts (the in_cnam_vei
// flag) and lib/dpm/match.ts (the "registered in Tunisia" answer). The DPM list mixes French and
// English forms and salts ("AMLODIPINE BESYLATE", "FLUORESCEIN SODIUM"); the CNAM list names the
// molecule ("AMLODIPINE"). The key: no accents, upper case, salt and hydrate words removed, a
// final E dropped from long words (FLUORESCEINE = FLUORESCEIN), words sorted.

/** Salt, ester, hydrate and form words that do not change which molecule it is. */
const SALT_WORDS = new Set([
  'ACETATE', 'ACETONIDE', 'ANHYDRE', 'ANHYDROUS', 'BASE', 'BENZOATE', 'BESILATE', 'BESYLATE', 'BITARTRATE',
  'BROMHYDRATE', 'BROMIDE', 'BROMURE', 'CALCIQUE', 'CALCIUM', 'CHLORHYDRATE', 'CHLORIDE', 'CHLORURE', 'CITRATE',
  'DICHLORHYDRATE', 'DIHYDRATE', 'DIHYDROCHLORIDE', 'DIPROPIONATE', 'DISODIQUE', 'DISODIUM', 'ESTOLATE', 'FUMARATE',
  'FUROATE', 'HEMIFUMARATE', 'HEMIHYDRATE', 'HYCLATE', 'HYDRATE', 'HYDROBROMIDE', 'HYDROCHLORIDE', 'HYDROCHLORURE',
  'LACTATE', 'MAGNESIUM', 'MALEATE', 'MESILATE', 'MESYLATE', 'MONOHYDRATE', 'NITRATE', 'OXALATE', 'PAMOATE', 'PHOSPHATE',
  'POTASSIQUE', 'POTASSIUM', 'PROPIONATE', 'SEL', 'SESQUIHYDRATE', 'SODIQUE', 'SODIUM', 'SUCCINATE', 'SULFATE',
  'SULPHATE', 'TARTRATE', 'TOSILATE', 'TRIHYDRATE', 'VALERATE',
]);

export function plain(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

/** Always dropped: "CHLORURE DE POTASSIUM" and "POTASSIUM CHLORURE" are the same name. */
const ARTICLES = new Set(['D', 'DE', 'DES', 'DU', 'L', 'LA', 'LE']);

const stem = (w: string) => (w.length > 4 && w.endsWith('E') ? w.slice(0, -1) : w);
// A salt word also when misspelt with a doubled final E ("TRIHYDRATEE").
const isSalt = (w: string) => SALT_WORDS.has(w) || SALT_WORDS.has(stem(w));

/**
 * The comparison key of one substance name. Salt words go when another word remains, so
 * "ROSUVASTATINE CALCIUM" is ROSUVASTATINE but "CALCIUM" stays CALCIUM. Never empty for a
 * non-empty name.
 */
export function substanceKey(name: string): string {
  const all = plain(name).split(' ').filter(Boolean);
  const words = all.filter((w) => !ARTICLES.has(w));
  const kept = words.filter((w) => !isSalt(w));
  return (kept.length ? kept : words.length ? words : all).map(stem).sort().join(' ');
}

/** The keys of a CNAM molecule: the whole name and, for a combination, each component. */
export function moleculeKeys(molecule: string): string[] {
  const parts = molecule.split('+').map((p) => p.trim()).filter(Boolean);
  return [...new Set([substanceKey(molecule), ...parts.map(substanceKey)])];
}
