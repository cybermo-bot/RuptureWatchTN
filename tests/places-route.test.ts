import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/places/nearby/route';

afterEach(() => vi.unstubAllEnvs());

describe('GET /api/places/nearby (stub for track C)', () => {
  it('answers 503 with a clear message when the server key is absent, and is never cached', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', '');
    const res = await GET();
    expect(res.status).toBe(503);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect((await res.json()).error).toBe('places_unavailable');
  });

  it('never returns the key', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'secret-test-key');
    const res = await GET();
    expect(await res.text()).not.toContain('secret-test-key');
  });
});
