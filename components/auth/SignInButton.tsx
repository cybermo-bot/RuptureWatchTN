'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/Button';
import { t } from '@/lib/i18n';

export function SignInButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {t(pending ? 'core.access.pending' : 'core.access.submit')}
    </Button>
  );
}
