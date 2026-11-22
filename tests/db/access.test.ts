// Access rules, tested on the real migrations in PGlite.
// Product rules 1 and 2: no pharmacy is named to another party; no pharmacy sees another's reports.

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { countByGovernorate, DEFAULT_PARAMS, type PharmacyReport } from '@/lib/signal';
import { as, createTestDatabase } from './harness';

const HOUR = 3_600_000;

const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

const MOL = id(0x100);
const MOL_PARITY = id(0x101);

const ORG = {
  p1: id(0xa1), // Tunis
  p2: id(0xa2), // Tunis
  p3: id(0xa3), // Tunis
  p4: id(0xa4), // Sfax
  p5: id(0xa5), // Sfax
  p6: id(0xa6), // Sousse
  coordinator: id(0xd1),
  wholesaler: id(0xb1),
  hospital: id(0xc1),
};

const USER = {
  p1: id(0x1a1),
  p2: id(0x1a2),
  p4: id(0x1a4),
  coordinator: id(0x1d1),
  wholesaler: id(0x1b1),
  hospital: id(0x1c1),
  orphan: id(0x1ff), // signed in, no profile
};

let db: PGlite;

async function seed(db: PGlite) {
  await db.query(`insert into public.molecules (id, name) values ($1, 'LEVETIRACETAM'), ($2, 'AMOXICILLINE')`, [MOL, MOL_PARITY]);
  const orgs: [string, string, string, string][] = [
    [ORG.p1, 'pharmacy', 'Pharmacie test 1', 'TN-11'],
    [ORG.p2, 'pharmacy', 'Pharmacie test 2', 'TN-11'],
    [ORG.p3, 'pharmacy', 'Pharmacie test 3', 'TN-11'],
    [ORG.p4, 'pharmacy', 'Pharmacie test 4', 'TN-61'],
    [ORG.p5, 'pharmacy', 'Pharmacie test 5', 'TN-61'],
    [ORG.p6, 'pharmacy', 'Pharmacie test 6', 'TN-51'],
    [ORG.coordinator, 'coordinator', 'Coordination test', 'TN-11'],
    [ORG.wholesaler, 'wholesaler', 'Grossiste test', 'TN-13'],
    [ORG.hospital, 'hospital_pharmacy', 'Hôpital test', 'TN-51'],
  ];
  for (const [oid, type, name, gov] of orgs) {
    await db.query(
      `insert into public.organisations (id, type, display_name, governorate_code, origin) values ($1, $2, $3, $4, 'simulated')`,
      [oid, type, name, gov],
    );
  }
  const profiles: [string, string, string][] = [
    [USER.p1, ORG.p1, 'pharmacist'],
    [USER.p2, ORG.p2, 'pharmacist'],
    [USER.p4, ORG.p4, 'pharmacist'],
    [USER.coordinator, ORG.coordinator, 'coordinator'],
    [USER.wholesaler, ORG.wholesaler, 'wholesaler'],
    [USER.hospital, ORG.hospital, 'hospital_pharmacist'],
  ];
  for (const [uid, oid, role] of profiles) {
    await db.query(`insert into auth.users (id) values ($1)`, [uid]);
    await db.query(`insert into public.profiles (user_id, organisation_id, role) values ($1, $2, $3)`, [uid, oid, role]);
  }
  await db.query(`insert into auth.users (id) values ($1)`, [USER.orphan]);

  // Three pharmacies in Tunis and one in Sfax report the same molecule, orders 80 hours old.
  for (const [oid, gov] of [
    [ORG.p1, 'TN-11'],
    [ORG.p2, 'TN-11'],
    [ORG.p3, 'TN-11'],
    [ORG.p4, 'TN-61'],
  ]) {
    await db.query(
      `insert into public.reports (organisation_id, governorate_code, molecule_id, kind, ordered_at, reported_at, origin)
       values ($1, $2, $3, 'not_delivered', now() - interval '80 hours', now() - interval '1 hour', 'simulated')`,
      [oid, gov, MOL],
    );
  }
}

beforeAll(async () => {
  db = await createTestDatabase();
  await seed(db);
}, 60_000);

const user = (userId: string) => ({ kind: 'user' as const, userId });

describe('reports: who can read', () => {
  it('a pharmacy reads only its own reports', async () => {
    const rows = await as(db, user(USER.p1), (tx) =>
      tx.query<{ organisation_id: string }>('select organisation_id from public.reports'),
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].organisation_id).toBe(ORG.p1);
  });

  it('a demo pharmacy cannot read another organisation’s reports, even by asking for them', async () => {
    const rows = await as(db, user(USER.p4), (tx) =>
      tx.query('select * from public.reports where organisation_id = $1', [ORG.p1]),
    );
    expect(rows.rows).toHaveLength(0);
  });

  it.each([
    ['coordinator', USER.coordinator],
    ['wholesaler', USER.wholesaler],
    ['hospital pharmacy', USER.hospital],
    ['account without profile', USER.orphan],
  ])('a %s cannot select from reports at all', async (_label, uid) => {
    const rows = await as(db, user(uid), (tx) => tx.query('select * from public.reports'));
    expect(rows.rows).toHaveLength(0);
    const count = await as(db, user(uid), (tx) =>
      tx.query<{ n: number }>('select count(*)::int as n from public.reports'),
    );
    expect(count.rows[0].n).toBe(0);
  });

  it('an anonymous visitor has no access to reports', async () => {
    await expect(as(db, { kind: 'anon' }, (tx) => tx.query('select * from public.reports'))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('reports: who can write', () => {
  const insert = `insert into public.reports (organisation_id, governorate_code, molecule_id, kind, ordered_at, origin)
                  values ($1, $2, $3, 'not_delivered', now() - interval '4 days', 'simulated') returning id`;

  it('a pharmacy can insert a report for itself', async () => {
    const result = await as(db, user(USER.p1), (tx) => tx.query(insert, [ORG.p1, 'TN-11', MOL]));
    expect(result.rows).toHaveLength(1);
  });

  it('a pharmacy cannot insert a report in another pharmacy’s name', async () => {
    await expect(as(db, user(USER.p1), (tx) => tx.query(insert, [ORG.p2, 'TN-11', MOL]))).rejects.toThrow(
      /row-level security/,
    );
  });

  it('a pharmacy cannot place its report in another governorate', async () => {
    await expect(as(db, user(USER.p1), (tx) => tx.query(insert, [ORG.p1, 'TN-61', MOL]))).rejects.toThrow(
      /row-level security/,
    );
  });

  it('a pharmacy cannot backdate a report or mark it as an official source', async () => {
    await expect(
      as(db, user(USER.p1), (tx) =>
        tx.query(
          `insert into public.reports (organisation_id, governorate_code, molecule_id, kind, ordered_at, reported_at, origin)
           values ($1, 'TN-11', $2, 'not_delivered', now() - interval '20 days', now() - interval '10 days', 'tester')`,
          [ORG.p1, MOL],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(db, user(USER.p1), (tx) =>
        tx.query(
          `insert into public.reports (organisation_id, governorate_code, molecule_id, kind, ordered_at, origin)
           values ($1, 'TN-11', $2, 'not_delivered', now() - interval '4 days', 'official_source')`,
          [ORG.p1, MOL],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('a report carries its organisation’s own origin: a demo pharmacy cannot file a tester report', async () => {
    await expect(
      as(db, user(USER.p1), (tx) => tx.query(insert.replace("'simulated'", "'tester'"), [ORG.p1, 'TN-11', MOL])),
    ).rejects.toThrow(/row-level security/);
  });

  it('a coordinator cannot insert reports', async () => {
    await expect(
      as(db, user(USER.coordinator), (tx) => tx.query(insert, [ORG.coordinator, 'TN-11', MOL])),
    ).rejects.toThrow(/row-level security/);
  });

  it('reports are insert only: no update, no delete', async () => {
    await expect(
      as(db, user(USER.p1), (tx) => tx.query(`update public.reports set kind = 'delivered_again'`)),
    ).rejects.toThrow(/permission denied/);
    await expect(as(db, user(USER.p1), (tx) => tx.query('delete from public.reports'))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('organisations and profiles', () => {
  it('a pharmacy sees its own organisation and no other', async () => {
    const rows = await as(db, user(USER.p1), (tx) =>
      tx.query<{ id: string }>('select id from public.organisations'),
    );
    expect(rows.rows.map((r) => r.id)).toEqual([ORG.p1]);
  });

  it('a coordinator cannot list pharmacies', async () => {
    const rows = await as(db, user(USER.coordinator), (tx) =>
      tx.query<{ id: string }>(`select id from public.organisations where type = 'pharmacy'`),
    );
    expect(rows.rows).toHaveLength(0);
  });

  it('a user reads only their own profile', async () => {
    const rows = await as(db, user(USER.p2), (tx) =>
      tx.query<{ user_id: string }>('select user_id from public.profiles'),
    );
    expect(rows.rows.map((r) => r.user_id)).toEqual([USER.p2]);
  });

  it('an anonymous visitor reads no organisation', async () => {
    await expect(
      as(db, { kind: 'anon' }, (tx) => tx.query('select * from public.organisations')),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('governorate_counts', () => {
  const call = 'select * from public.governorate_counts($1, $2, $3)';
  const args = [MOL, DEFAULT_PARAMS.confirmWindowDays, DEFAULT_PARAMS.minUndeliveredHours];

  it('gives the coordinator counts by governorate, with counts under 3 shown as <3', async () => {
    const rows = await as(db, user(USER.coordinator), (tx) =>
      tx.query<{ governorate_code: string; governorate_name: string; pharmacies: string }>(call, args),
    );
    expect(rows.rows).toEqual([
      { governorate_code: 'TN-11', governorate_name: 'Tunis', pharmacies: '3' },
      { governorate_code: 'TN-61', governorate_name: 'Sfax', pharmacies: '<3' },
    ]);
  });

  it('returns no identifier: only governorate and count columns', async () => {
    const rows = await as(db, user(USER.wholesaler), (tx) => tx.query(call, args));
    expect(rows.fields.map((f) => f.name)).toEqual(['governorate_code', 'governorate_name', 'pharmacies']);
    const text = JSON.stringify(rows.rows);
    for (const orgId of Object.values(ORG)) expect(text).not.toContain(orgId);
    expect(text).not.toMatch(/Pharmacie test/);
  });

  it('is open to wholesalers and hospital pharmacies', async () => {
    for (const uid of [USER.wholesaler, USER.hospital]) {
      const rows = await as(db, user(uid), (tx) => tx.query(call, args));
      expect(rows.rows.length).toBeGreaterThan(0);
    }
  });

  it('is refused to pharmacies, anonymous visitors and accounts without a profile', async () => {
    await expect(as(db, user(USER.p1), (tx) => tx.query(call, args))).rejects.toThrow(/not allowed/);
    await expect(as(db, user(USER.orphan), (tx) => tx.query(call, args))).rejects.toThrow(/not allowed/);
    await expect(as(db, { kind: 'anon' }, (tx) => tx.query(call, args))).rejects.toThrow(/permission denied/);
  });

  it('gives the same counts as countByGovernorate in lib/signal, edges included', async () => {
    // Deterministic dataset around the window and delay edges.
    const now = new Date('2026-11-20T12:00:00Z');
    const pharmacies = [
      { id: ORG.p1, gov: 'TN-11' },
      { id: ORG.p2, gov: 'TN-11' },
      { id: ORG.p3, gov: 'TN-11' },
      { id: ORG.p4, gov: 'TN-61' },
      { id: ORG.p5, gov: 'TN-61' },
      { id: ORG.p6, gov: 'TN-51' },
    ];
    const reportAgesHours = [1, 24, 13 * 24, 14 * 24 - 1, 14 * 24, 14 * 24 + 1, 20 * 24, -2];
    const orderDelaysHours = [71, 72, 73, 80, 200];
    const reports: PharmacyReport[] = [];
    let k = 0;
    for (const p of pharmacies) {
      for (let i = 0; i < 6; i++) {
        const age = reportAgesHours[(k * 7 + i * 3) % reportAgesHours.length];
        const delay = orderDelaysHours[(k * 5 + i) % orderDelaysHours.length];
        const reportedAt = new Date(now.getTime() - age * HOUR);
        const kind = (k + i) % 5 === 0 ? 'delivered_again' : 'not_delivered';
        reports.push({
          id: `parity-${k}-${i}`,
          pharmacyId: p.id,
          governorateCode: p.gov,
          moleculeId: MOL_PARITY,
          kind,
          orderedAt: kind === 'not_delivered' ? new Date(reportedAt.getTime() - delay * HOUR) : null,
          reportedAt,
          origin: 'simulated',
        });
      }
      k++;
    }

    const expected = countByGovernorate(reports, MOL_PARITY, now)
      .map((c) => ({ governorate_code: c.governorateCode, pharmacies: c.display }))
      .sort((a, b) => a.governorate_code.localeCompare(b.governorate_code));
    expect(expected.length).toBeGreaterThan(1);

    const actual = await as(db, { kind: 'service' }, async (tx) => {
      for (const r of reports) {
        await tx.query(
          `insert into public.reports (organisation_id, governorate_code, molecule_id, kind, ordered_at, reported_at, origin)
           values ($1, $2, $3, $4, $5, $6, 'simulated')`,
          [r.pharmacyId, r.governorateCode, r.moleculeId, r.kind, r.orderedAt, r.reportedAt],
        );
      }
      const res = await tx.query<{ governorate_code: string; pharmacies: string }>(
        'select governorate_code, pharmacies from public.governorate_counts($1, $2, $3, $4)',
        [MOL_PARITY, DEFAULT_PARAMS.confirmWindowDays, DEFAULT_PARAMS.minUndeliveredHours, now],
      );
      return res.rows.sort((a, b) => a.governorate_code.localeCompare(b.governorate_code));
    });

    expect(actual).toEqual(expected);
  });
});

describe('signals and the event log', () => {
  it('rejects evidence that carries pharmacy identifiers', async () => {
    await expect(
      as(db, { kind: 'service' }, (tx) =>
        tx.query(
          `insert into public.signals (molecule_id, level, since, rule, evidence) values ($1, 'watch', now(), 'x', $2)`,
          [MOL, JSON.stringify({ pharmacies14d: 1, reports: [{ pharmacyId: ORG.p1 }] })],
        ),
      ),
    ).rejects.toThrow(/evidence/);
  });

  it('accepts evidence made of counts', async () => {
    const res = await as(db, { kind: 'service' }, (tx) =>
      tx.query(
        `insert into public.signal_events (molecule_id, from_level, to_level, rule, evidence)
         values ($1, 'none', 'watch', 'local_reports_below_threshold', $2) returning id`,
        [MOL, JSON.stringify({ pharmacies14d: 1, governorates14d: 1, pharmacies7d: 1 })],
      ),
    );
    expect(res.rows).toHaveLength(1);
  });

  it('the event log is append only, even for the service role', async () => {
    await expect(
      as(db, { kind: 'service' }, async (tx) => {
        await tx.query(
          `insert into public.signal_events (molecule_id, from_level, to_level, rule) values ($1, 'none', 'watch', 'x')`,
          [MOL],
        );
        await tx.query(`update public.signal_events set rule = 'changed'`);
      }),
      // The service role has no update grant (000700); the trigger is the second barrier.
    ).rejects.toThrow(/append only|permission denied/);
    await expect(
      as(db, { kind: 'service' }, async (tx) => {
        await tx.query(
          `insert into public.signal_events (molecule_id, from_level, to_level, rule) values ($1, 'none', 'watch', 'x')`,
          [MOL],
        );
        await tx.query(`delete from public.signal_events`);
      }),
    ).rejects.toThrow(/append only/);
  });

  it('signals are not visible to anonymous visitors', async () => {
    await expect(as(db, { kind: 'anon' }, (tx) => tx.query('select * from public.signals'))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe('whatsapp inbound', () => {
  it('is closed to every role except the service role', async () => {
    for (const caller of [{ kind: 'anon' as const }, user(USER.coordinator)]) {
      await expect(as(db, caller, (tx) => tx.query('select * from public.wa_inbound'))).rejects.toThrow(
        /permission denied/,
      );
    }
  });
});
