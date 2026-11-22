'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isLocale, LOCALE_COOKIE } from '@/lib/i18n';

/** Only a path on this site: never an absolute or protocol-relative address. */
function safePath(value: FormDataEntryValue | null): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value
    : '/medicaments';
}

export async function setLocale(formData: FormData): Promise<void> {
  const locale = formData.get('locale');
  if (isLocale(locale)) {
    (await cookies()).set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
  }
  redirect(safePath(formData.get('path')));
}
