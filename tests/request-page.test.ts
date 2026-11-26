// Pilot-2 item 4 (and pilot-1 item 7): the patient's answers page. When no pharmacy takes part in
// the governorate, the page says so, points to the pharmacies open nearby and to the medicine's
// status, and does not ask the patient to wait. Small answer counts read « 1 ou 2 réponses ».

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { translator, type Locale } from '@/lib/i18n';
import type { PublicRequest } from '@/lib/public/request';

const MOLECULE = '75077225-938d-4278-9e21-51de44d88a9f';
const REQUEST = '6f0b7a3e-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
let request: PublicRequest;
let locale: Locale = 'fr';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }), usePathname: () => '/' }));
vi.mock('@/lib/i18n-server', () => ({ getTranslator: async () => ({ t: translator(locale), locale, dir: locale === 'ar' ? 'rtl' : 'ltr' }) }));
vi.mock('@/lib/public/medicine', () => ({
  getPublicMolecule: async () => ({ id: MOLECULE, name: 'LEVETIRACETAM' }),
  getPublicStatus: async () => ({ level: 'none', since: null, origins: [], evaluatedAt: null }),
  getPublicPresentation: async () => null,
}));
vi.mock('@/lib/public/request', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/public/request')>()),
  getPublicRequest: async () => request,
}));

const { default: RequestPage } = await import('@/app/(public)/demandes/[requestId]/page');

async function render(): Promise<string> {
  const element = await RequestPage({ params: Promise.resolve({ requestId: REQUEST }), searchParams: Promise.resolve({}) } as never);
  return renderToStaticMarkup(element);
}

beforeEach(() => {
  locale = 'fr';
  request = {
    request_id: REQUEST,
    molecule_id: MOLECULE,
    medicine_id: null,
    governorate_code: 'TN-11',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 2 * 3_600_000).toISOString(),
    asked: '0',
    answered: '0',
    available: [],
  };
});

describe('a request no pharmacy received', () => {
  it('says no pharmacy takes part, links to the open pharmacies and the status, and does not ask to wait', async () => {
    const html = await render();
    expect(html).toContain('Aucune pharmacie participante dans ce gouvernorat pour l’instant.');
    expect(html).toContain('href="/pharmacies"');
    expect(html).toContain('Voir les pharmacies ouvertes près de vous');
    expect(html).toContain(`href="/medicaments/${MOLECULE}"`);
    expect(html).toContain('Voir le statut de ce médicament');
    expect(html).not.toContain('Gardez cette page ouverte');
    expect(html).not.toContain('En attente des pharmacies');
  });

  it('says it in Arabic too', async () => {
    locale = 'ar';
    const html = await render();
    expect(html).toContain('لا توجد صيدلية مشاركة في هذه الولاية حاليًا.');
    expect(html).toContain('عرض الصيدليات المفتوحة قربك');
  });
});

describe('a request pharmacies received', () => {
  it('keeps the waiting state, with small counts in words', async () => {
    request = { ...request, asked: '<3', answered: '<3' };
    const html = await render();
    expect(html).toContain('En attente des pharmacies');
    expect(html).toContain('moins de 3');
    expect(html).toContain('1 ou 2 réponses');
    expect(html).not.toContain('Aucune pharmacie participante');
  });
});
