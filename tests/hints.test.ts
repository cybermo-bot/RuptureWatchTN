import { describe, expect, it } from 'vitest';
import { hintFor, hintShownOn, SPACE_HINTS } from '@/lib/demo/hints';
import type { OrganisationType } from '@/lib/demo/roles';
import { NAV } from '@/lib/nav';

// Part 8, item 2: "Essayez : ..." at the top of each professional space, for demo accounts only.

const CONSOLE_TYPES = (Object.keys(NAV) as OrganisationType[]).filter((type) => NAV[type].length > 0);

describe('hint strip per role', () => {
  it('has a hint for every space with a console, and links only inside that space', () => {
    for (const type of CONSOLE_TYPES) {
      const hint = hintFor(type, 'simulated');
      expect(hint, type).not.toBeNull();
      if (hint?.link) {
        const path = hint.link.href.split('#')[0];
        const inSpace = NAV[type].some((item) => path === item.href || path.startsWith(`${item.href}/`));
        expect(inSpace, `${type}: ${hint.link.href}`).toBe(true);
      }
    }
    expect(Object.keys(SPACE_HINTS).sort()).toEqual([...CONSOLE_TYPES].sort());
  });

  it('is for demo accounts only: never for a tester or a real member, never for the prescriber page', () => {
    expect(hintFor('pharmacy', 'tester')).toBeNull();
    expect(hintFor('coordinator', 'official_source')).toBeNull();
    expect(hintFor('prescriber', 'simulated')).toBeNull();
  });

  it('hides on the page it links to, not on the space home', () => {
    const pharmacy = SPACE_HINTS.pharmacy;
    expect(hintShownOn(pharmacy, '/pharmacie')).toBe(true);
    expect(hintShownOn(pharmacy, '/pharmacie/signaler')).toBe(false);
    expect(hintShownOn(pharmacy, '/pharmacie/signaler/abc')).toBe(false);
    // An anchor on the home page itself: the hint stays where the visitor lands.
    expect(hintShownOn(SPACE_HINTS.wholesaler, '/grossiste')).toBe(true);
    expect(hintShownOn(SPACE_HINTS.coordinator, '/coordination')).toBe(true);
  });
});
