import { describe, expect, it } from 'vitest';
import {
  buildScenario,
  confirmPharmaciesNeeded,
  countByGovernorate,
  DEFAULT_PARAMS,
  displayCount,
  evaluate,
  type ForeignNotice,
  type Level,
  type PharmacyReport,
  type PreviousState,
} from '../lib/signal';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = new Date('2026-03-01T08:00:00Z');
const at = (days: number) => new Date(T0.getTime() + days * DAY);
const MOL = 'levetiracetam';

let seq = 0;
function nd(pharmacy: string, gov: string, reportedDay: number, orderedHoursBefore = 80, molecule = MOL): PharmacyReport {
  const reportedAt = at(reportedDay);
  return {
    id: `r${++seq}`,
    pharmacyId: pharmacy,
    governorateCode: gov,
    moleculeId: molecule,
    kind: 'not_delivered',
    orderedAt: new Date(reportedAt.getTime() - orderedHoursBefore * HOUR),
    reportedAt,
    origin: 'simulated',
  };
}
function back(pharmacy: string, gov: string, reportedDay: number): PharmacyReport {
  return {
    id: `r${++seq}`,
    pharmacyId: pharmacy,
    governorateCode: gov,
    moleculeId: MOL,
    kind: 'delivered_again',
    orderedAt: null,
    reportedAt: at(reportedDay),
    origin: 'simulated',
  };
}
function notice(source: string, day: number, status: ForeignNotice['status'] = 'shortage'): ForeignNotice {
  return { id: `n${++seq}`, moleculeId: MOL, source, status, publishedAt: at(day), url: 'https://example.org', origin: 'simulated' };
}
const prev = (level: Level, sinceDay: number): PreviousState => ({ level, since: at(sinceDay) });

describe('basic levels', () => {
  it('no evidence gives none', () => {
    const e = evaluate({ moleculeId: MOL, reports: [], notices: [], now: at(1) });
    expect(e.level).toBe('none');
    expect(e.rule).toBe('no_evidence');
    expect(e.changed).toBe(false);
  });

  it('one valid report gives watch', () => {
    const e = evaluate({ moleculeId: MOL, reports: [nd('p1', 'TUN', 1)], notices: [], now: at(1) });
    expect(e.level).toBe('watch');
    expect(e.rule).toBe('local_reports_below_threshold');
    expect(e.direction).toBe('up');
  });

  it('two pharmacies within 7 days give likely', () => {
    const e = evaluate({ moleculeId: MOL, reports: [nd('p1', 'TUN', 1), nd('p2', 'TUN', 3)], notices: [], now: at(3) });
    expect(e.level).toBe('likely');
    expect(e.rule).toBe('two_pharmacies_7d');
  });

  it('one report plus an active foreign notice gives likely', () => {
    const e = evaluate({ moleculeId: MOL, reports: [nd('p1', 'TUN', 1)], notices: [notice('ANSM', 0)], now: at(1) });
    expect(e.level).toBe('likely');
    expect(e.rule).toBe('local_report_plus_foreign_notice');
  });

  it('reports for another molecule are ignored', () => {
    const e = evaluate({ moleculeId: MOL, reports: [nd('p1', 'TUN', 1, 80, 'carbamazepine')], notices: [], now: at(1) });
    expect(e.level).toBe('none');
  });

  it('reports dated after now are ignored', () => {
    const e = evaluate({ moleculeId: MOL, reports: [nd('p1', 'TUN', 5)], notices: [], now: at(1) });
    expect(e.level).toBe('none');
  });
});

describe('the 72-hour rule', () => {
  it('an order younger than 72 hours does not count', () => {
    const e = evaluate({ moleculeId: MOL, reports: [nd('p1', 'TUN', 1, 48)], notices: [], now: at(1) });
    expect(e.level).toBe('none');
    expect(e.evidence.ignoredTooEarly).toBe(1);
  });

  it('exactly 72 hours counts', () => {
    const e = evaluate({ moleculeId: MOL, reports: [nd('p1', 'TUN', 1, 72)], notices: [], now: at(1) });
    expect(e.level).toBe('watch');
  });

  it('a not_delivered report without an order date does not count', () => {
    const r = { ...nd('p1', 'TUN', 1), orderedAt: null };
    const e = evaluate({ moleculeId: MOL, reports: [r], notices: [], now: at(1) });
    expect(e.level).toBe('none');
  });
});

describe('one count per pharmacy', () => {
  it('the same pharmacy reporting five times counts once', () => {
    const reports = [1, 2, 3, 4, 5].map((d) => nd('p1', 'TUN', d / 2));
    const e = evaluate({ moleculeId: MOL, reports, notices: [], now: at(3) });
    expect(e.evidence.pharmacies14d).toBe(1);
    expect(e.level).toBe('watch');
  });
});

describe('gate one: foreign evidence alone never goes past watch', () => {
  it('one notice gives watch', () => {
    const e = evaluate({ moleculeId: MOL, reports: [], notices: [notice('ANSM', 0)], now: at(1) });
    expect(e.level).toBe('watch');
    expect(e.rule).toBe('foreign_notice_only');
  });

  it('notices from several regulators still give watch', () => {
    const notices = [notice('ANSM', 0), notice('BfArM', 1), notice('AEMPS', 2), notice('MHRA', 3)];
    const e = evaluate({ moleculeId: MOL, reports: [], notices, now: at(4) });
    expect(e.level).toBe('watch');
  });

  it('a resolved notice no longer counts', () => {
    const e = evaluate({ moleculeId: MOL, reports: [], notices: [notice('ANSM', 0), notice('ANSM', 10, 'resolved')], now: at(11) });
    expect(e.level).toBe('none');
  });

  it('a notice older than 90 days no longer counts', () => {
    const e = evaluate({ moleculeId: MOL, reports: [], notices: [notice('ANSM', 0)], now: at(91) });
    expect(e.level).toBe('none');
  });
});

describe('gate two: confirmed needs four pharmacies in two governorates', () => {
  it('three pharmacies in two governorates is not confirmed', () => {
    const reports = [nd('p1', 'TUN', 1), nd('p2', 'TUN', 2), nd('p3', 'SFA', 3)];
    const e = evaluate({ moleculeId: MOL, reports, notices: [], now: at(3) });
    expect(e.level).toBe('likely');
  });

  it('four pharmacies in two governorates is confirmed', () => {
    const reports = [nd('p1', 'TUN', 1), nd('p2', 'TUN', 2), nd('p3', 'TUN', 3), nd('p4', 'SFA', 4)];
    const e = evaluate({ moleculeId: MOL, reports, notices: [], now: at(4) });
    expect(e.level).toBe('confirmed');
    expect(e.rule).toBe('confirmed_threshold');
  });

  it('six pharmacies in one governorate stay likely', () => {
    const reports = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((p, i) => nd(p, 'TUN', 1 + i / 3));
    const e = evaluate({ moleculeId: MOL, reports, notices: [notice('ANSM', 0)], now: at(3) });
    expect(e.level).toBe('likely');
    expect(e.rule).toBe('single_governorate_cap');
  });

  it('reports older than 14 days do not count toward confirmed', () => {
    const reports = [nd('p1', 'TUN', 0), nd('p2', 'TUN', 1), nd('p3', 'TUN', 16), nd('p4', 'SFA', 17)];
    const e = evaluate({ moleculeId: MOL, reports, notices: [], now: at(17) });
    expect(e.evidence.pharmacies14d).toBe(2);
    expect(e.level).toBe('likely');
  });
});

describe('holding and clearing', () => {
  const confirmedReports = [nd('p1', 'TUN', 1), nd('p2', 'TUN', 2), nd('p3', 'TUN', 3), nd('p4', 'SFA', 4)];

  it('confirmed is held when reports age out without deliveries', () => {
    const e = evaluate({ moleculeId: MOL, reports: confirmedReports, notices: [], now: at(20), previous: prev('confirmed', 4) });
    expect(e.level).toBe('confirmed');
    expect(e.rule).toBe('hold_until_delivered');
    expect(e.changed).toBe(false);
    expect(e.since).toEqual(at(4));
  });

  it('two deliveries after a quiet period clear the signal and send a stand-down', () => {
    const reports = [...confirmedReports, back('p1', 'TUN', 15), back('p4', 'SFA', 17)];
    const e = evaluate({ moleculeId: MOL, reports, notices: [], now: at(19), previous: prev('confirmed', 4) });
    expect(e.level).toBe('cleared');
    expect(e.rule).toBe('delivered_again_cleared');
    expect(e.standDown).toBe(true);
    expect(e.direction).toBe('down');
  });

  it('one delivery is not enough to clear', () => {
    const reports = [...confirmedReports, back('p1', 'TUN', 15)];
    const e = evaluate({ moleculeId: MOL, reports, notices: [], now: at(19), previous: prev('confirmed', 4) });
    expect(e.level).toBe('confirmed');
  });

  it('deliveries do not clear before the quiet period ends', () => {
    const reports = [...confirmedReports, back('p1', 'TUN', 6), back('p4', 'SFA', 7)];
    const e = evaluate({ moleculeId: MOL, reports, notices: [], now: at(10), previous: prev('confirmed', 4) });
    expect(e.level).toBe('confirmed');
  });

  it('a delivery reported before the last unfilled order does not count', () => {
    const reports = [nd('p1', 'TUN', 1), back('p2', 'TUN', 2), back('p3', 'SFA', 2), nd('p4', 'SFA', 3), nd('p5', 'TUN', 3), nd('p6', 'TUN', 4)];
    const e = evaluate({ moleculeId: MOL, reports, notices: [], now: at(20), previous: prev('confirmed', 4) });
    expect(e.evidence.deliveredAgainPharmacies).toBe(0);
    expect(e.level).toBe('confirmed');
  });

  it('after 30 quiet days without deliveries the level is lowered, with a stand-down', () => {
    const e = evaluate({ moleculeId: MOL, reports: confirmedReports, notices: [], now: at(35), previous: prev('confirmed', 4) });
    expect(e.level).toBe('none');
    expect(e.rule).toBe('quiet_period_downgrade');
    expect(e.standDown).toBe(true);
  });

  it('cleared stays visible for 7 days, then returns to none', () => {
    const shown = evaluate({ moleculeId: MOL, reports: [], notices: [], now: at(23), previous: prev('cleared', 19) });
    expect(shown.level).toBe('cleared');
    const gone = evaluate({ moleculeId: MOL, reports: [], notices: [], now: at(26), previous: prev('cleared', 19) });
    expect(gone.level).toBe('none');
    expect(gone.rule).toBe('cleared_expired');
    expect(gone.standDown).toBe(false);
  });

  it('a watch that ends sends a stand-down', () => {
    const e = evaluate({ moleculeId: MOL, reports: [nd('p1', 'TUN', 0)], notices: [], now: at(15), previous: prev('watch', 0) });
    expect(e.level).toBe('none');
    expect(e.standDown).toBe(true);
  });

  it('a new report after clearing raises the level again', () => {
    const e = evaluate({ moleculeId: MOL, reports: [nd('p9', 'BIZ', 20)], notices: [], now: at(20), previous: prev('cleared', 19) });
    expect(e.level).toBe('watch');
    expect(e.direction).toBe('up');
  });
});

describe('"levée" holds against a foreign notice from before it', () => {
  // Confirmed from day 1 to 4, with an ANSM notice from day 0 (active 90 days); delivered again
  // on days 15 and 17; "levée" on day 19.
  const reports = [
    nd('p1', 'TUN', 1), nd('p2', 'TUN', 2), nd('p3', 'TUN', 3), nd('p4', 'SFA', 4),
    back('p1', 'TUN', 15), back('p4', 'SFA', 17),
  ];
  const oldNotice = notice('ANSM', 0);

  it('the evaluation that clears records when the levée happened', () => {
    const e = evaluate({ moleculeId: MOL, reports, notices: [oldNotice], now: at(19), previous: prev('confirmed', 4) });
    expect(e.level).toBe('cleared');
    expect(e.clearedAt).toEqual(at(19));
  });

  it('a notice already active before the levée does not raise it again', () => {
    const e = evaluate({ moleculeId: MOL, reports, notices: [oldNotice], now: at(20), previous: { level: 'cleared', since: at(19), clearedAt: at(19) } });
    expect(e.level).toBe('cleared');
    expect(e.rule).toBe('delivered_again_cleared');
    expect(e.changed).toBe(false);
    expect(e.clearedAt).toEqual(at(19));
  });

  it('without a stored levée time, a shown "levée" counts from its start', () => {
    const e = evaluate({ moleculeId: MOL, reports, notices: [oldNotice], now: at(20), previous: prev('cleared', 19) });
    expect(e.level).toBe('cleared');
    expect(e.clearedAt).toEqual(at(19));
  });

  it('once "levée" has expired, the old notice still does not count alone', () => {
    const gone = evaluate({ moleculeId: MOL, reports, notices: [oldNotice], now: at(26), previous: { level: 'cleared', since: at(19), clearedAt: at(19) } });
    expect(gone.level).toBe('none');
    expect(gone.rule).toBe('cleared_expired');
    expect(gone.clearedAt).toEqual(at(19));
    const later = evaluate({ moleculeId: MOL, reports, notices: [oldNotice], now: at(33), previous: { level: 'none', since: at(26), clearedAt: at(19) } });
    expect(later.level).toBe('none');
    expect(later.clearedAt).toEqual(at(19));
  });

  it('a notice published after the levée raises it to watch, never further (gate one)', () => {
    const e = evaluate({ moleculeId: MOL, reports, notices: [oldNotice, notice('BfArM', 21)], now: at(21), previous: { level: 'cleared', since: at(19), clearedAt: at(19) } });
    expect(e.level).toBe('watch');
    expect(e.rule).toBe('foreign_notice_only');
  });

  it('a new report from the same regulator after the levée counts again', () => {
    const e = evaluate({ moleculeId: MOL, reports, notices: [oldNotice, notice('ANSM', 22)], now: at(22), previous: { level: 'cleared', since: at(19), clearedAt: at(19) } });
    expect(e.level).toBe('watch');
  });

  it('new Tunisian reports raise the level as before, with the old notice beside them', () => {
    const e = evaluate({ moleculeId: MOL, reports: [...reports, nd('p9', 'BIZ', 21)], notices: [oldNotice], now: at(21), previous: { level: 'cleared', since: at(19), clearedAt: at(19) } });
    expect(e.level).toBe('likely');
    expect(e.rule).toBe('local_report_plus_foreign_notice');
  });
});

describe('small-cell suppression on the map', () => {
  it('counts below 3 are shown as <3', () => {
    expect(displayCount(0)).toEqual({ display: '0', suppressed: false });
    expect(displayCount(1)).toEqual({ display: '<3', suppressed: true });
    expect(displayCount(2)).toEqual({ display: '<3', suppressed: true });
    expect(displayCount(3)).toEqual({ display: '3', suppressed: false });
  });

  it('counts distinct pharmacies per governorate and never returns pharmacy ids', () => {
    const reports = [nd('p1', 'TUN', 1), nd('p1', 'TUN', 2), nd('p2', 'TUN', 2), nd('p3', 'TUN', 2), nd('p4', 'SFA', 2), nd('p5', 'SFA', 2, 10)];
    const rows = countByGovernorate(reports, MOL, at(3));
    expect(rows).toEqual([
      { governorateCode: 'TUN', pharmacies: 3, display: '3', suppressed: false },
      { governorateCode: 'SFA', pharmacies: 1, display: '<3', suppressed: true },
    ]);
    expect(JSON.stringify(rows)).not.toContain('p1');
  });
});

describe('the simulated scenario tells the intended story', () => {
  const pharmacies = [
    { id: 'demo-tun-1', governorateCode: 'TUN' },
    { id: 'demo-tun-2', governorateCode: 'TUN' },
    { id: 'demo-tun-3', governorateCode: 'TUN' },
    { id: 'demo-sfa-1', governorateCode: 'SFA' },
    { id: 'demo-sfa-2', governorateCode: 'SFA' },
    { id: 'demo-sou-1', governorateCode: 'SOU' },
  ];
  const steps = buildScenario({ moleculeId: MOL, start: T0, pharmacies, notice: { source: 'ANSM', url: 'https://example.org' } });

  it('every row is marked simulated', () => {
    for (const s of steps) expect((s.report ?? s.notice)!.origin).toBe('simulated');
  });

  it('walks watch, likely, confirmed, held, cleared', () => {
    const reports: PharmacyReport[] = [];
    const notices: ForeignNotice[] = [];
    let state: PreviousState = { level: 'none', since: T0 };
    const levels: Level[] = [];
    for (const s of steps) {
      if (s.report) reports.push(s.report);
      if (s.notice) notices.push(s.notice);
      const e = evaluate({ moleculeId: MOL, reports, notices, now: at(s.atHours / 24), previous: state });
      state = { level: e.level, since: e.since };
      levels.push(e.level);
    }
    expect(levels).toEqual(['watch', 'likely', 'likely', 'likely', 'confirmed', 'confirmed', 'confirmed', 'cleared']);
  });
});

describe('the confirmed bar scales with the network', () => {
  const P = DEFAULT_PARAMS;
  // Enough pharmacies for the floor, in enough governorates, within the likely window.
  const floorReports = () =>
    Array.from({ length: P.confirmMinPharmacies }, (_, i) =>
      nd(`f${i}`, i < P.confirmMinGovernorates ? `G${i}` : 'G0', 1 + i * 0.25),
    );

  it('the floor wins on a pilot-sized network (100 active members)', () => {
    expect(confirmPharmaciesNeeded(P, 100)).toBe(P.confirmMinPharmacies);
    const e = evaluate({ moleculeId: MOL, reports: floorReports(), notices: [], now: at(3), activeMemberPharmacies: 100 });
    expect(e.level).toBe('confirmed');
    expect(e.rule).toBe('confirmed_threshold');
  });

  it('the share wins on a large network (1,500 active members): 30 pharmacies needed', () => {
    const needed = Math.ceil(P.confirmMemberShare * 1500);
    expect(needed).toBe(30);
    expect(confirmPharmaciesNeeded(P, 1500)).toBe(needed);
    const few = evaluate({ moleculeId: MOL, reports: floorReports(), notices: [], now: at(3), activeMemberPharmacies: 1500 });
    expect(few.level).toBe('likely');
    expect(few.rule).toBe('two_pharmacies_7d');

    const many = Array.from({ length: needed }, (_, i) => nd(`m${i}`, `G${i % P.confirmMinGovernorates}`, 1 + (i % 5) * 0.2));
    const justBelow = many.slice(0, needed - 1);
    expect(evaluate({ moleculeId: MOL, reports: justBelow, notices: [], now: at(3), activeMemberPharmacies: 1500 }).level).toBe('likely');
    const e = evaluate({ moleculeId: MOL, reports: many, notices: [], now: at(3), activeMemberPharmacies: 1500 });
    expect(e.level).toBe('confirmed');
  });

  it('on a large network, enough pharmacies in one governorate still stop at likely (gate two)', () => {
    const oneGov = Array.from({ length: 30 }, (_, i) => nd(`o${i}`, 'TUN', 1 + (i % 5) * 0.2));
    const e = evaluate({ moleculeId: MOL, reports: oneGov, notices: [], now: at(3), activeMemberPharmacies: 1500 });
    expect(e.level).toBe('likely');
    expect(e.rule).toBe('single_governorate_cap');
  });

  it('a missing, zero or invalid member count means the floor', () => {
    for (const n of [undefined, null, 0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(confirmPharmaciesNeeded(P, n)).toBe(P.confirmMinPharmacies);
    }
    const without = evaluate({ moleculeId: MOL, reports: floorReports(), notices: [], now: at(3) });
    expect(without.level).toBe('confirmed');
  });

  it('the share follows the parameters, never a typed number', () => {
    expect(confirmPharmaciesNeeded({ ...P, confirmMemberShare: 0.1 }, 100)).toBe(Math.max(P.confirmMinPharmacies, 10));
    expect(confirmPharmaciesNeeded({ ...P, confirmMinPharmacies: 50 }, 1500)).toBe(50);
  });
});
