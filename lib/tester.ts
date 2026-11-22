import 'server-only';
import { safeEqual } from '@/lib/whatsapp/inbound';

/** The tester invite link is valid only with TESTER_INVITE_CODE from the server environment. */
export function isValidInviteCode(code: string): boolean {
  const expected = process.env.TESTER_INVITE_CODE;
  if (!expected || expected.length < 16) return false;
  return safeEqual(code, expected);
}
