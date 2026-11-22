// The signal service with an in-memory store: no network, no database.
// The store mirrors apply_signal_evaluation's compare-and-set; tests/db/signal-service.test.ts
// runs the same service against the real SQL function.

import { describe, expect, it } from 'vitest';
import type { ForeignNotice, Level, PharmacyReport } from '@/lib/signal';
import {
  recomputeAll,
  recomputeSignal,
  RecomputeConflictError,
  type ApplyInput,
  type CurrentSignal,
  type SignalStore,
} from '@/lib/signals/recompute';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MOL = 'mol-levetiracetam';
const T0 = new Date('2026-11-22T09:00:00Z');

interface Event {
  from: Level;
  to: Level;
  rule: string;
  at: Date;
  alerted: boolean;
}

class MemoryStore implements SignalStore {
  reports: PharmacyReport[] = [];
  notices: ForeignNotice[] = [];
  signal: (CurrentSignal & { rule: string; evidence: unknown }) | null = null;
  events: Event[] = [];
  private clock = 0;

  async load(moleculeId: string, from: Date, to: Date) {
    return {
      reports: this.reports.filter(
        (r) => r.moleculeId === moleculeId && r.reportedAt > from && r.reportedAt <= to,
      ),
      notices: this.notices.filter((n) => n.moleculeId === moleculeId),
      current: this.signal ? { level: this.signal.level, since: this.signal.since, updatedAt: this.signal.updatedAt } : null,
    };
  }

  async apply(input: ApplyInput) {
    const matches = input.expected
      ? this.signal !== null &&
        this.signal.level === input.expected.level &&
        this.signal.updatedAt === input.expected.updatedAt
      : this.signal === null;
    if (!matches) return { applied: false, eventId: null };
    const from = input.expected?.level ?? 'none';
    this.signal = {
      level: input.level,
      since: input.since,
      updatedAt: `v${++this.clock}`,
      rule: input.rule,
      evidence: input.evidence,
    };
    if (input.level !== from) {
      this.events.push({ from, to: input.level, rule: input.rule, at: input.at, alerted: input.alert });
      return { applied: true, eventId: this.events.length };
    }
    return { applied: true, eventId: null };
  }

  async moleculesWithSignal() {
    return this.signal ? [MOL] : [];
  }

  report(pharmacy: string, gov: string, at: Date, kind: PharmacyReport['kind'] = 'not_delivered', orderedDaysBefore = 3) {
    this.reports.push({
      id: `r${this.reports.length + 1}`,
      pharmacyId: pharmacy,
      governorateCode: gov,
      moleculeId: MOL,
      kind,
      orderedAt: kind === 'not_delivered' ? new Date(at.getTime() - orderedDaysBefore * DAY) : null,
      reportedAt: at,
      origin: 'simulated',
    });
  }
}

const levels = (s: MemoryStore) => s.events.map((e) => `${e.from}>${e.to}`);

describe('recomputeSignal', () => {
  it('does nothing for a molecule with no evidence and no row', async () => {
    const store = new MemoryStore();
    const result = await recomputeSignal(store, MOL, T0);
    expect(result.skipped).toBe(true);
    expect(store.signal).toBeNull();
    expect(store.events).toHaveLength(0);
  });

  it('walks none, watch, likely, confirmed as pharmacies report, one event per change', async () => {
    const store = new MemoryStore();
    store.report('p1', 'TN-11', T0);
    expect((await recomputeSignal(store, MOL, T0)).evaluation.level).toBe('watch');
    store.report('p2', 'TN-11', new Date(T0.getTime() + HOUR));
    expect((await recomputeSignal(store, MOL, new Date(T0.getTime() + HOUR))).evaluation.level).toBe('likely');
    store.report('p3', 'TN-61', new Date(T0.getTime() + 2 * HOUR));
    await recomputeSignal(store, MOL, new Date(T0.getTime() + 2 * HOUR));
    store.report('p4', 'TN-61', new Date(T0.getTime() + 3 * HOUR));
    const last = await recomputeSignal(store, MOL, new Date(T0.getTime() + 3 * HOUR));
    expect(last.evaluation.level).toBe('confirmed');
    expect(last.previous).toBe('likely');
    expect(levels(store)).toEqual(['none>watch', 'watch>likely', 'likely>confirmed']);
    expect(store.events.every((e) => e.alerted)).toBe(true);
  });

  it('stores evidence as counts only, never pharmacy identifiers', async () => {
    const store = new MemoryStore();
    store.report('pharmacy-secret-id', 'TN-11', T0);
    await recomputeSignal(store, MOL, T0);
    const json = JSON.stringify(store.signal?.evidence);
    expect(json).not.toContain('pharmacy-secret-id');
    expect(json).not.toMatch(/pharmacyId|organisation|"reports"/);
    expect(store.signal?.evidence).toMatchObject({ pharmacies14d: 1, governorates14d: 1, pharmacies7d: 1 });
  });

  it('a report on an order younger than 72 hours changes nothing', async () => {
    const store = new MemoryStore();
    store.report('p1', 'TN-11', T0, 'not_delivered', 2);
    const result = await recomputeSignal(store, MOL, T0);
    expect(result.skipped).toBe(true);
    expect(result.evaluation.evidence.ignoredTooEarly).toBe(1);
  });

  it('delivered again from two pharmacies, then 15 days of quiet, clears and stands down', async () => {
    const store = new MemoryStore();
    const at = (h: number) => new Date(T0.getTime() + h * HOUR);
    store.report('p1', 'TN-11', at(0));
    store.report('p2', 'TN-11', at(1));
    store.report('p3', 'TN-61', at(2));
    store.report('p4', 'TN-61', at(3));
    await recomputeSignal(store, MOL, at(3));
    expect(store.signal?.level).toBe('confirmed');

    store.report('p1', 'TN-11', at(4), 'delivered_again');
    store.report('p3', 'TN-61', at(5), 'delivered_again');
    const held = await recomputeSignal(store, MOL, at(5));
    expect(held.evaluation.level).toBe('confirmed');
    expect(held.evaluation.rule).toBe('confirmed_threshold'); // the four reports are still within 14 days

    const later = await recomputeAll(store, new Date(at(3).getTime() + 15 * DAY));
    expect(later).toEqual({ checked: 1, changed: 1, failed: 0 });
    expect(store.signal?.level).toBe('cleared');
    const last = store.events.at(-1)!;
    expect(last).toMatchObject({ from: 'confirmed', to: 'cleared', rule: 'delivered_again_cleared', alerted: true });
  });

  it('logs the fading of "levée" back to none without alerting anyone', async () => {
    const store = new MemoryStore();
    store.signal = { level: 'cleared', since: T0, updatedAt: 'v0', rule: 'delivered_again_cleared', evidence: {} };
    await recomputeSignal(store, MOL, new Date(T0.getTime() + 8 * DAY));
    expect(store.events).toEqual([expect.objectContaining({ from: 'cleared', to: 'none', rule: 'cleared_expired', alerted: false })]);
  });
});

describe('recomputeSignal under concurrency', () => {
  /** Holds every load() until `n` loads are waiting, so both recomputes read the same state. */
  function interleaved(store: MemoryStore, n: number): SignalStore {
    let waiting: (() => void)[] = [];
    let first = true;
    return {
      load: async (...args) => {
        const snapshot = await store.load(...args);
        if (first) {
          await new Promise<void>((resolve) => {
            waiting.push(resolve);
            if (waiting.length === n) {
              first = false;
              waiting.forEach((r) => r());
              waiting = [];
            }
          });
        }
        return snapshot;
      },
      apply: (input) => store.apply(input),
      moleculesWithSignal: () => store.moleculesWithSignal(),
    };
  }

  it('two reports at the same moment produce one event, not two', async () => {
    const store = new MemoryStore();
    store.report('p1', 'TN-11', T0);
    store.report('p2', 'TN-61', T0);
    const shared = interleaved(store, 2);
    const [a, b] = await Promise.all([recomputeSignal(shared, MOL, T0), recomputeSignal(shared, MOL, T0)]);
    expect(levels(store)).toEqual(['none>likely']);
    expect([a.attempts, b.attempts].sort()).toEqual([1, 2]);
    expect(store.signal?.level).toBe('likely');
  });

  it('a stale evaluation never overwrites a newer level or skips its event', async () => {
    const store = new MemoryStore();
    store.report('p1', 'TN-11', T0);
    await recomputeSignal(store, MOL, T0); // watch

    // Recompute A read the state before p2 reported; B read it after. B writes first.
    const snapshotA = await store.load(MOL, new Date(0), T0);
    store.report('p2', 'TN-11', T0);
    await recomputeSignal(store, MOL, T0); // likely
    let replayed = false;
    const stale: SignalStore = {
      load: async (...args) => {
        if (!replayed) {
          replayed = true;
          return snapshotA; // A's stale read: one pharmacy, level watch
        }
        return store.load(...args);
      },
      apply: (input) => store.apply(input),
      moleculesWithSignal: () => store.moleculesWithSignal(),
    };
    const a = await recomputeSignal(stale, MOL, T0);
    expect(a.attempts).toBe(2);
    expect(store.signal?.level).toBe('likely');
    expect(levels(store)).toEqual(['none>watch', 'watch>likely']);
  });

  it('gives up with a clear error if the row never settles', async () => {
    const store = new MemoryStore();
    store.report('p1', 'TN-11', T0);
    const never: SignalStore = { ...store, load: store.load.bind(store), apply: async () => ({ applied: false, eventId: null }), moleculesWithSignal: async () => [] };
    await expect(recomputeSignal(never, MOL, T0, { maxAttempts: 3 })).rejects.toBeInstanceOf(RecomputeConflictError);
  });
});
