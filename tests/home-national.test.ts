import { describe, expect, it } from 'vitest';
import { combineByGovernorate, moreSerious } from '@/lib/home/national';

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

  it('leaves governorates without reports out', () => {
    expect(combineByGovernorate([{ level: 'likely', governorates: [] }])).toEqual({});
  });
});
