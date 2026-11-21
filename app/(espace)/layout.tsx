import { redirect } from 'next/navigation';
import { SessionBar } from '@/components/SessionBar';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { getCurrentSession } from '@/lib/auth/session';

export default async function SpaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect('/#roles');

  return (
    <>
      <SiteHeader>
        <SessionBar session={session} />
      </SiteHeader>
      <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
