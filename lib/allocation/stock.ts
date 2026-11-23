// The stock a wholesaler types, shared by the split page (browser) and the decision action (server).

export const MAX_STOCK = 10_000_000;

/** A typed stock, or null when it is not a whole number of boxes in range. */
export function parseStock(value: unknown): number | null {
  const s = String(value ?? '').replace(/[\s  ]/g, '');
  if (!/^\d{1,8}$/.test(s)) return null;
  const n = Number(s);
  return n >= 1 && n <= MAX_STOCK ? n : null;
}

/** The example stock the comparison starts from (the handoff's fixture figure). */
export const EXAMPLE_STOCK = 2500;
