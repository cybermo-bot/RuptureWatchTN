// "Registered in Tunisia, not followed by RuptureWatch": does a search that found nothing in the
// catalogue match a name of the DPM list? Only names outside the CNAM VEI list count (the others
// are in the catalogue, so saying "not followed" would be wrong). Accepts half words and small
// misspellings, like the catalogue search. Names only: nothing here can be reported or followed.

import list from '@/data/reference/dpm-dci.json';
import { substanceKey } from './key';

const KEYS: string[] = [...new Set((list as [string, number][]).filter(([, inCnam]) => inCnam === 0).map(([name]) => substanceKey(name)))];

function withinDistance(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

/** True when the query is a DPM name outside the CNAM VEI list, a start of one, or one letter or two off. */
export function matchesDpm(query: string): boolean {
  const q = substanceKey(query.slice(0, 100));
  if (q.length < 4) return false;
  if (KEYS.includes(q)) return true;
  if (q.length >= 5 && KEYS.some((k) => k.startsWith(q))) return true;
  const max = q.length >= 9 ? 2 : q.length >= 5 ? 1 : 0;
  return max > 0 && KEYS.some((k) => withinDistance(q, k, max));
}
