import { describe, expect, it } from 'vitest';
import { canEnterAudience, isAccessAudience } from '@/lib/auth/access';

describe('professional sign-in audiences', () => {
  it('accepts only the defined professional URLs', () => {
    expect(isAccessAudience('pharmacie')).toBe(true);
    expect(isAccessAudience('grossiste')).toBe(true);
    expect(isAccessAudience('institution')).toBe(true);
    for (const value of ['patients', 'constructor', '__proto__', null]) {
      expect(isAccessAudience(value)).toBe(false);
    }
  });

  it('uses the existing organisation assignment to restrict each sign-in', () => {
    expect(canEnterAudience('pharmacie', 'pharmacy')).toBe(true);
    expect(canEnterAudience('grossiste', 'wholesaler')).toBe(true);
    expect(canEnterAudience('institution', 'coordinator')).toBe(true);
    expect(canEnterAudience('institution', 'pharmacists_order')).toBe(true);
    expect(canEnterAudience('institution', 'pharmacy')).toBe(false);
    expect(canEnterAudience('institution', 'wholesaler')).toBe(false);
    expect(canEnterAudience('pharmacie', 'coordinator')).toBe(false);
    expect(canEnterAudience('grossiste', 'pharmacists_order')).toBe(false);
  });
});
