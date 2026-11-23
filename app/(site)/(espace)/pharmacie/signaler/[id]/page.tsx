import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ReportProgress } from '@/components/pharmacy/ReportProgress';
import { ReportTimingForm } from '@/components/ReportTimingForm';
import { createUserClient } from '@/lib/db/server';
import { t } from '@/lib/i18n';

// Tap two: when was it ordered. One tap sends the report.
export default async function ReportWhen({ params }: PageProps<'/pharmacie/signaler/[id]'>) {
  const { id } = await params;
  const supabase = await createUserClient();
  const { data: molecule } = await supabase.from('molecules').select('id, name').eq('id', id).maybeSingle();
  if (!molecule) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-4">
        <ReportProgress step={2} />
        <div className="flex flex-col gap-2">
          <p className="text-lg font-semibold break-words text-ink">{molecule.name}</p>
          <Link href="/pharmacie/signaler" className="inline-flex min-h-12 w-fit items-center gap-1 text-sm font-medium">
            <ChevronLeft size={16} aria-hidden="true" className="rtl:-scale-x-100" />
            {t('core.report.changeMedicine')}
          </Link>
        </div>
      </header>
      <section aria-labelledby="quand" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 id="quand" className="text-2xl font-semibold tracking-tight text-ink">
            {t('core.report.whenTitle')}
          </h1>
          <p className="text-ink-muted">{t('core.report.whenIntro')}</p>
        </div>
        <ReportTimingForm moleculeId={molecule.id} headingId="quand" />
      </section>
    </div>
  );
}
