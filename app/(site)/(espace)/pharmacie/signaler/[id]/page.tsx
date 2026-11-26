import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ReportProgress } from '@/components/pharmacy/ReportProgress';
import { ReportTimingForm } from '@/components/ReportTimingForm';
import type { ReportPresentation } from '@/components/pharmacy/PresentationChoice';
import { ShowcaseLocked } from '@/components/pharmacy/ShowcaseLocked';
import { getCurrentSession } from '@/lib/auth/session';
import { showcaseLocked } from '@/lib/demo/showcase';
import { createUserClient } from '@/lib/db/server';
import { t } from '@/lib/i18n';

// Tap two: when was it ordered. One tap sends the report. Above the delays, which product
// (pilot-3 item 1), preselected, so choosing it is never an extra tap.
export default async function ReportWhen({ params }: PageProps<'/pharmacie/signaler/[id]'>) {
  const { id } = await params;
  const supabase = await createUserClient();
  const { data: molecule } = await supabase.from('molecules').select('id, name').eq('id', id).maybeSingle();
  if (!molecule) notFound();
  // Reached from the search: a one-click demo pharmacy cannot report a showcase medicine (pilot-1 item 3).
  const session = await getCurrentSession();
  const locked = session ? showcaseLocked(session.organisation.id, molecule.name as string) : false;
  const [{ data: presentations }, { data: last }] = locked
    ? [{ data: [] }, { data: null }]
    : await Promise.all([
        supabase.from('medicines').select('id, label, brand').eq('molecule_id', id).order('brand').order('label'),
        // The last product this pharmacy reported for this molecule (its own reports only).
        supabase
          .from('reports')
          .select('medicine_id')
          .eq('molecule_id', id)
          .eq('organisation_id', session?.organisation.id ?? '')
          .not('medicine_id', 'is', null)
          .order('reported_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
  const whenHeading = (
    <div className="flex flex-col gap-1">
      <h2 id="quand" className="text-xl font-semibold tracking-tight text-ink">
        {t('core.report.whenTitle')}
      </h2>
      {locked ? null : <p className="text-ink-muted">{t('core.report.whenIntro')}</p>}
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-4">
        <ReportProgress step={2} />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight break-words text-ink">{molecule.name}</h1>
          <Link href="/pharmacie/signaler" className="inline-flex min-h-12 w-fit items-center gap-1 text-sm font-medium">
            <ChevronLeft size={16} aria-hidden="true" className="rtl:-scale-x-100" />
            {t('core.report.changeMedicine')}
          </Link>
        </div>
      </header>
      <section aria-labelledby="quand" className="flex flex-col gap-4">
        {locked ? (
          <>
            {whenHeading}
            <ShowcaseLocked />
          </>
        ) : (
          <ReportTimingForm
            moleculeId={molecule.id}
            headingId="quand"
            presentations={(presentations ?? []) as ReportPresentation[]}
            preselected={(last?.medicine_id as string | null | undefined) ?? null}
          >
            {whenHeading}
          </ReportTimingForm>
        )}
      </section>
    </div>
  );
}
