import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const recomputeAll = vi.fn();
vi.mock('@/lib/signals/store', () => ({ supabaseSignalStore: () => ({}) }));
vi.mock('@/lib/signals/recompute', () => ({ recomputeAll: (...args: unknown[]) => recomputeAll(...args) }));

const { GET } = await import('@/app/api/cron/recompute/route');
const call = (auth?: string) =>
  GET(new NextRequest('https://example.test/api/cron/recompute', { headers: auth ? { authorization: auth } : {} }));

beforeEach(() => {
  process.env.CRON_SECRET = 'cron-test-secret';
  recomputeAll.mockReset();
  recomputeAll.mockResolvedValue({ checked: 2, changed: 1, failed: 0 });
});
afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe('GET /api/cron/recompute', () => {
  it('refuses a missing or wrong secret and runs nothing', async () => {
    expect((await call()).status).toBe(401);
    expect((await call('Bearer wrong')).status).toBe(401);
    expect((await call('cron-test-secret')).status).toBe(401);
    expect(recomputeAll).not.toHaveBeenCalled();
  });

  it('refuses everything when CRON_SECRET is not set', async () => {
    delete process.env.CRON_SECRET;
    expect((await call('Bearer ')).status).toBe(401);
    expect((await call('Bearer undefined')).status).toBe(401);
  });

  it('re-evaluates every molecule with the right secret', async () => {
    const res = await call('Bearer cron-test-secret');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ checked: 2, changed: 1, failed: 0 });
    expect(recomputeAll).toHaveBeenCalledTimes(1);
  });
});
