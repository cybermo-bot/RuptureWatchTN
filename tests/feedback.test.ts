// Pilot-2 item 3: « Un problème ? Une idée ? ». Only a route pattern is stored, the way back stays
// on this site, and the action sends the trimmed message with an allowed rating or none.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { returnPath, routePattern } from '@/lib/feedback/path';

const rpc = vi.fn(async () => ({ error: null as null | { code: string } }));
vi.mock('@/lib/db/server', () => ({ createUserClient: vi.fn(async () => ({ rpc })) }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));

afterEach(() => rpc.mockClear());

describe('routePattern', () => {
  it('keeps plain route words and replaces ids, codes and names by [id]', () => {
    expect(routePattern('/medicaments/75077225-938d-4278-9e21-51de44d88a9f?presentation=abc#x')).toBe('/medicaments/[id]');
    expect(routePattern('/pharmacie/molecule/75077225-938d-4278-9e21-51de44d88a9f/resultat')).toBe('/pharmacie/molecule/[id]/resultat');
    expect(routePattern('/rejoindre/Xk29aQ')).toBe('/rejoindre/[id]');
    expect(routePattern('/connexion/pharmacie')).toBe('/connexion/pharmacie');
    expect(routePattern('/')).toBe('/');
    expect(routePattern('')).toBe('/');
  });
});

describe('returnPath', () => {
  it('accepts a path on this site only', () => {
    expect(returnPath('/medicaments/abc?x=1', '/f')).toBe('/medicaments/abc?x=1');
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil', 'medicaments', '/a b', 42, null]) {
      expect(returnPath(bad, '/f')).toBe('/f');
    }
  });
});

describe('submitFeedback', () => {
  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [k, v] of Object.entries(fields)) data.set(k, v);
    return data;
  };

  it('sends the route pattern, the trimmed message and the rating, then thanks', async () => {
    const { submitFeedback } = await import('@/app/actions/feedback');
    const depuis = '/medicaments/75077225-938d-4278-9e21-51de44d88a9f';
    await expect(submitFeedback(form({ espace: 'public', depuis, message: '  Pas clair  ', note: 'unclear' }))).rejects.toThrow(
      `redirect /avis?depuis=${encodeURIComponent(depuis)}&envoye=1`,
    );
    expect(rpc).toHaveBeenCalledWith('submit_feedback', { p_path: '/medicaments/[id]', p_rating: 'unclear', p_message: 'Pas clair' });
  });

  it('drops an unknown rating, refuses an empty message, and says when the limit is reached', async () => {
    const { submitFeedback } = await import('@/app/actions/feedback');
    await expect(submitFeedback(form({ espace: 'pharmacie', message: 'Ok', note: 'great' }))).rejects.toThrow('envoye=1');
    expect(rpc).toHaveBeenLastCalledWith('submit_feedback', { p_path: '/pharmacie', p_rating: null, p_message: 'Ok' });
    await expect(submitFeedback(form({ espace: 'public', message: '   ' }))).rejects.toThrow('erreur=vide');
    rpc.mockResolvedValueOnce({ error: { code: 'RW429' } });
    await expect(submitFeedback(form({ espace: 'public', message: 'Encore' }))).rejects.toThrow('erreur=limite');
  });
});
