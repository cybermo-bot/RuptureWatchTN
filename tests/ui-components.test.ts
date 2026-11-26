// Pilot-4 step 1: the shared components keep the product rules in their markup: a level is a
// shape and a word at every size, small counts stay '<3', the bottom bar marks the current tab
// and says what a count means, and a button is 48 px whatever its shape.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Search } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/pharmacie' }));

describe('shared components', () => {
  it('LevelBadge shows the shape and the word at every size', async () => {
    const { LevelBadge } = await import('@/components/LevelBadge');
    for (const size of ['sm', 'md', 'lg'] as const) {
      const html = renderToStaticMarkup(createElement(LevelBadge, { level: 'confirmed', size }));
      expect(html, size).toContain('<svg');
      expect(html, size).toContain('Confirmée');
    }
  });

  it('Stat keeps "<3" as written', async () => {
    const { Stat, StatRow } = await import('@/components/ui/Stat');
    const html = renderToStaticMarkup(createElement(StatRow, null, createElement(Stat, { value: '<3', label: 'pharmacies' })));
    expect(html).toContain('&lt;3');
    expect(html).toMatch(/<dl[^>]*>.*<dt[^>]*>pharmacies<\/dt>.*<dd/);
  });

  it('BottomBar marks the current tab and says what its count means', async () => {
    const { BottomBar } = await import('@/components/ui/BottomBar');
    const html = renderToStaticMarkup(
      createElement(BottomBar, {
        label: 'Sections',
        hideFrom: 'lg',
        items: [
          { href: '/pharmacie', label: 'Accueil', icon: Search, current: true },
          { href: '/pharmacie/demandes', label: 'Demandes', icon: Search, current: false, badge: 2, badgeText: '2 non lues' },
        ],
      }),
    );
    const link = (href: string) => html.match(new RegExp(`<a[^>]*href="${href}"[^>]*>`))?.[0] ?? '';
    expect(link('/pharmacie')).toContain('aria-current="page"');
    expect(link('/pharmacie/demandes')).not.toContain('aria-current');
    expect(html).toContain('<span class="sr-only">2 non lues</span>');
    expect(html).toContain('min-h-14');
  });

  it('buttons stay 48 px; the pill only changes the corners', async () => {
    const { buttonClass } = await import('@/components/Button');
    expect(buttonClass()).toContain('min-h-12');
    expect(buttonClass()).toContain('rounded-sm');
    expect(buttonClass('primary', '', 'pill')).toContain('rounded-full');
    expect(buttonClass('primary', '', 'pill')).toContain('min-h-12');
    expect(buttonClass('danger')).toContain('min-h-12');
  });

  it('a Journal entry names its level in a word next to the shape', async () => {
    const { Journal } = await import('@/components/ui/Journal');
    const html = renderToStaticMarkup(
      createElement(Journal, { label: 'Journal', entries: [{ key: 'a', date: '14 nov.', dateTime: '2026-11-14', level: 'confirmed', title: 'Confirmée' }] }),
    );
    expect(html).toMatch(/<time datetime="2026-11-14"/i);
    expect(html).toContain('<svg');
    expect(html).toContain('Confirmée');
  });
});
