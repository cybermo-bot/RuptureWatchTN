import { switchRole } from '@/app/actions/auth';
import { OriginBadge } from '@/components/OriginBadge';
import type { CurrentSession } from '@/lib/auth/session';
import { t } from '@/lib/i18n';

// Shown on every signed-in page: who you are, and a visible way to change role.
// Testers get no role switch: their account lives only in this browser's session, so signing
// out would lose it, and joining again would count the same person as a second pharmacy.
export function SessionBar({ session }: { session: CurrentSession }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
        <span className="font-medium">{session.organisation.displayName}</span>
        <OriginBadge origin={session.organisation.origin} />
      </p>
      {session.organisation.origin === 'tester' ? null : (
        <form action={switchRole}>
          <button
            type="submit"
            className="min-h-12 px-1 text-sm font-medium text-brand underline underline-offset-4 hover:text-brand-strong"
          >
            {t('core.roles.switch')}
          </button>
        </form>
      )}
    </div>
  );
}
