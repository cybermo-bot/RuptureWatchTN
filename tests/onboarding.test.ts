// Pilot-2 item 2: the first-visit guide, and no iPhone install hint for testers.

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }), redirect: vi.fn() }));

const { default: Guide } = await import('@/app/(site)/(espace)/pharmacie/bienvenue/page');
const { initialInstallMode } = await import('@/components/pharmacy/InstallHint');

async function render(query: Record<string, string>): Promise<string> {
  const element = await Guide({ params: Promise.resolve({}), searchParams: Promise.resolve(query) } as never);
  return renderToStaticMarkup(element);
}

describe('« Comment ça marche »', () => {
  it('opens on the first screen, the 72-hour rule in days, with « Passer » to « Mes médicaments »', async () => {
    const html = await render({});
    expect(html).toContain('Une commande n’arrive pas depuis plus de 3 jours ? Signalez-la en deux gestes.');
    expect(html).toContain('Écran 1 sur 3');
    expect(html).toContain('href="/pharmacie/bienvenue?etape=2"');
    expect(html).toContain('href="/pharmacie"');
    expect(html).toContain('Passer');
    expect(html).not.toContain('Gardez ce navigateur');
  });

  it('ends on the patients screen with « Commencer », leading to « Mes médicaments »', async () => {
    const html = await render({ etape: '3' });
    expect(html).toContain('choisissez si votre pharmacie s’affiche');
    expect(html).toContain('Commencer');
    expect(html).not.toContain('Passer');
  });

  it('says « Gardez ce navigateur » once, on the first screen just after joining', async () => {
    expect(await render({ premiere: '1', rejoint: '1' })).toContain('Gardez ce navigateur : votre accès est lié à ce téléphone et à ce navigateur.');
    expect(await render({ etape: '2', rejoint: '1' })).not.toContain('Gardez ce navigateur');
  });

  it('falls back to the first screen for an unknown step', async () => {
    expect(await render({ etape: '9' })).toContain('Écran 1 sur 3');
  });
});

describe('install help', () => {
  const base = { standalone: false, ios: false, dismissed: false, compact: true, hideOnIos: false };

  it('is not shown on iPhone to a tester, whose account lives in this browser', () => {
    expect(initialInstallMode({ ...base, ios: true, hideOnIos: true })).toBe('hidden');
  });

  it('stays under « Plus » for other accounts, and for testers on other phones', () => {
    expect(initialInstallMode({ ...base, ios: true })).toBe('ios');
    expect(initialInstallMode({ ...base, hideOnIos: true })).toBe('other');
    expect(initialInstallMode({ ...base, standalone: true })).toBe('hidden');
  });
});
