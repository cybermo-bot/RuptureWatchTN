import Link from 'next/link';
import { notFound } from 'next/navigation';
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
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link href="/pharmacie/signaler" className="text-sm text-ink-muted">
          {t('core.report.title')}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight break-words text-ink sm:text-3xl">{molecule.name}</h1>
      </header>
      <section aria-labelledby="quand" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="quand" className="text-lg font-semibold text-ink">
            {t('core.report.whenTitle')}
          </h2>
          <p className="text-sm text-ink-muted">{t('core.report.whenIntro')}</p>
        </div>
        <ReportTimingForm moleculeId={molecule.id} headingId="quand" />
      </section>
    </div>
  );
}
