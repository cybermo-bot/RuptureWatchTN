import { describe, expect, it } from 'vitest';
import { combineByGovernorate, isDemonstrationSignal, moreSerious } from '@/lib/home/national';

// The home page's map: each governorate takes the most serious active level among the
// medicines its pharmacies report.
describe('national picture', () => {
  it('orders levels from confirmed to cleared', () => {
    expect(moreSerious('watch', 'confirmed')).toBe('confirmed');
    expect(moreSerious('likely', 'watch')).toBe('likely');
    expect(moreSerious('cleared', 'watch')).toBe('watch');
  });

  it('keeps the most serious level per governorate', () => {
    const map = combineByGovernorate([
      { level: 'watch', governorates: ['TN-11', 'TN-61'] },
      { level: 'confirmed', governorates: ['TN-61'] },
      { level: 'cleared', governorates: ['TN-11', 'TN-51'] },
    ]);
    expect(map).toEqual({ 'TN-11': 'watch', 'TN-61': 'confirmed', 'TN-51': 'cleared' });
  });

  it('keeps only demonstration signals: a tester or official origin never reaches the public home page', () => {
    const ev = (origins: ('simulated' | 'tester' | 'official_source')[]) => ({ evidence: { origins } }) as Parameters<typeof isDemonstrationSignal>[0];
    expect(isDemonstrationSignal(ev(['simulated']))).toBe(true);
    expect(isDemonstrationSignal(ev(['tester']))).toBe(false);
    expect(isDemonstrationSignal(ev(['official_source']))).toBe(false);
    expect(isDemonstrationSignal(ev(['simulated', 'tester']))).toBe(false);
    expect(isDemonstrationSignal(ev([]))).toBe(false);
  });

  it('leaves governorates without reports out', () => {
    expect(combineByGovernorate([{ level: 'likely', governorates: [] }])).toEqual({});
  });
});
