// Who counts as an active member pharmacy, for the network share of the "confirmed" bar.
// Plain constant (no server-only import), so the methods page can show it.

/**
 * A member pharmacy is active if it reported or signed in within this many days, simulated
 * accounts excluded. The count raises the "confirmed" bar on a large network (confirmMemberShare).
 */
export const ACTIVE_MEMBER_DAYS = 90;
