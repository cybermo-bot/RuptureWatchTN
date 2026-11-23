import type { Metadata } from 'next';
import { RequestList } from '@/components/pharmacy/RequestList';
import { AutoRefresh } from '@/components/public/AutoRefresh';
import { t } from '@/lib/i18n';
import { getOpenRequests } from '@/lib/pharmacy/requests';

export const metadata: Metadata = { title: t('core.requests.title') };
export const dynamic = 'force-dynamic';

// The patients' requests in this pharmacy's governorate, oldest first, each with its three
// one-tap answers. New requests appear on their own (refresh every 15 seconds).
export default async function PharmacyRequests() {
  const requests = await getOpenRequests();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <AutoRefresh seconds={15} />
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('core.requests.title')}</h1>
        <p className="max-w-prose text-ink-muted">{t('core.requests.intro')}</p>
      </header>
      <RequestList requests={requests} />
      <p className="text-sm text-ink-muted">{t('core.requests.anonymousNote')}</p>
    </div>
  );
}
