import type { FollowedMolecule } from '@/lib/pharmacy/data';

/**
 * « Vos médicaments » on the pharmacy's « Aujourd'hui » (pilot-4 step 4). Active: an unread
 * alert (« nouveau »), a level, or an active foreign notice (« avis étranger »); the unread ones
 * first, then the order getFollowed gives (highest level, then name). Quiet: everything else,
 * folded away. A foreign notice shows a tag; it never moves a medicine above its level.
 */
export function todayOrder(followed: FollowedMolecule[], unread: ReadonlySet<string>): { active: FollowedMolecule[]; quiet: FollowedMolecule[] } {
  const isActive = (m: FollowedMolecule) =>
    unread.has(m.moleculeId) || (m.signal?.level ?? 'none') !== 'none' || (m.signal?.evidence.notices.length ?? 0) > 0;
  const active = followed.filter(isActive).sort((a, b) => Number(unread.has(b.moleculeId)) - Number(unread.has(a.moleculeId)));
  return { active, quiet: followed.filter((m) => !isActive(m)) };
}
