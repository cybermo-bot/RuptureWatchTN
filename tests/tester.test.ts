import { afterEach, describe, expect, it } from 'vitest';
import { isValidInviteCode } from '@/lib/tester';

afterEach(() => {
  delete process.env.TESTER_INVITE_CODE;
});

describe('tester invite code', () => {
  it('accepts only the exact code from the server environment', () => {
    process.env.TESTER_INVITE_CODE = 'a-long-random-invite-code-123';
    expect(isValidInviteCode('a-long-random-invite-code-123')).toBe(true);
    expect(isValidInviteCode('a-long-random-invite-code-12')).toBe(false);
    expect(isValidInviteCode('A-LONG-RANDOM-INVITE-CODE-123')).toBe(false);
    expect(isValidInviteCode('')).toBe(false);
  });

  it('refuses every code when the variable is missing or too short to be secret', () => {
    expect(isValidInviteCode('')).toBe(false);
    expect(isValidInviteCode('undefined')).toBe(false);
    process.env.TESTER_INVITE_CODE = 'short';
    expect(isValidInviteCode('short')).toBe(false);
  });
});
