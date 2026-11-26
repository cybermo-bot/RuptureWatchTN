// Pilot-3 item 1: the report action stores the product the pharmacist chose, only a
// presentation of the reported molecule, and none for « Plusieurs ou je ne sais pas ».

import { beforeEach, describe, expect, it, vi } from 'vitest';

const MOLECULE = '75077225-938d-4278-9e21-51de44d88a9f';
const PRODUCT = '0b6f1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d';
const ORG = '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f';

let inserts: { table: string; row: Record<string, unknown> }[] = [];
let productBelongs = true;

function from(table: string) {
  const query = {
    select: () => query,
    eq: () => query,
    gte: async () => ({ count: 0, error: null }),
    maybeSingle: async () => ({ data: table === 'medicines' && productBelongs ? { id: PRODUCT } : null, error: null }),
    insert: async (row: Record<string, unknown>) => {
      inserts.push({ table, row });
      return { error: null };
    },
  };
  return query;
}

vi.mock('@/lib/db/server', () => ({ createUserClient: async () => ({ from }) }));
vi.mock('@/lib/auth/session', () => ({
  getCurrentSession: async () => ({
    userId: 'u',
    role: 'pharmacist',
    organisation: { id: ORG, type: 'pharmacy', displayName: 'Pharmacie test', governorateCode: 'TN-11', governorateName: 'Tunis', origin: 'tester' },
  }),
}));
vi.mock('@/lib/pharmacy/data', () => ({ hasReportedNotDelivered: vi.fn(), signalsFor: vi.fn() }));
vi.mock('@/lib/signals/recompute', () => ({
  recomputeSignal: async () => ({ eventId: null, previous: 'none', evaluation: { level: 'watch' } }),
}));
vi.mock('@/lib/signals/store', () => ({ supabaseSignalStore: () => ({}) }));
vi.mock('@/lib/whatsapp/notify', () => ({ notifyLevelChange: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/server', () => ({ after: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));

const { submitReport } = await import('@/app/actions/pharmacy');

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

const reportRow = () => inserts.find((i) => i.table === 'reports')?.row;

beforeEach(() => {
  inserts = [];
  productBelongs = true;
});

describe('submitReport with a product', () => {
  it('stores the chosen presentation with the report', async () => {
    await expect(submitReport({ status: 'idle' }, form({ molecule_id: MOLECULE, medicine_id: PRODUCT, delay: 'd3' }))).rejects.toThrow(
      `redirect /pharmacie/molecule/${MOLECULE}/resultat`,
    );
    expect(reportRow()).toMatchObject({ molecule_id: MOLECULE, medicine_id: PRODUCT, kind: 'not_delivered' });
  });

  it('stores no product for « Plusieurs ou je ne sais pas »', async () => {
    await expect(submitReport({ status: 'idle' }, form({ molecule_id: MOLECULE, medicine_id: '', delay: 'd5' }))).rejects.toThrow('redirect');
    expect(reportRow()).toMatchObject({ molecule_id: MOLECULE, medicine_id: null });
  });

  it('refuses a product that is not a presentation of the molecule, and a malformed id', async () => {
    productBelongs = false;
    expect(await submitReport({ status: 'idle' }, form({ molecule_id: MOLECULE, medicine_id: PRODUCT, delay: 'd3' }))).toEqual({ status: 'error' });
    productBelongs = true;
    expect(await submitReport({ status: 'idle' }, form({ molecule_id: MOLECULE, medicine_id: 'EPITAM', delay: 'd3' }))).toEqual({ status: 'error' });
    expect(reportRow()).toBeUndefined();
  });

  it('still sends nothing for « Moins de 3 jours »', async () => {
    expect(await submitReport({ status: 'idle' }, form({ molecule_id: MOLECULE, medicine_id: PRODUCT, delay: 'lt3' }))).toEqual({ status: 'too_early' });
    expect(inserts).toHaveLength(0);
  });
});
