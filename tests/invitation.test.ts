import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Pilot-1 item 2: the one-click Ministry and Ordre demos showed the real TESTER_INVITE_CODE, so
// anyone could create tester pharmacies. In a demo space (origin "simulated") the invitation page
// says the link is hidden and renders no code, no URL and no QR code.

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ host: 'rupturewatch.test', 'x-forwarded-proto': 'https' }),
}));

const CODE = 'a-long-random-invite-code-for-tests-123';

afterEach(() => {
  vi.unstubAllEnvs();
});

async function render(origin: 'simulated' | 'tester' | 'official_source') {
  vi.stubEnv('TESTER_INVITE_CODE', CODE);
  const { TesterInvitation } = await import('@/components/institutions/TesterInvitation');
  const element = await TesterInvitation({ backHref: '/coordination', origin });
  return renderToStaticMarkup(createElement('div', null, element));
}

describe('tester invitation page', () => {
  it('hides the link from a one-click demo space', async () => {
    const html = await render('simulated');
    expect(html).toContain('Lien d’invitation masqué dans la démonstration.');
    expect(html).not.toContain(CODE);
    expect(html).not.toContain('/rejoindre');
    expect(html).not.toContain('<svg');
  });

  it('shows the link and its QR code to a real institution account', async () => {
    const html = await render('official_source');
    expect(html).toContain(`https://rupturewatch.test/rejoindre/${CODE}`);
    expect(html).toContain('<svg');
    expect(html).not.toContain('masqué');
  });
});
