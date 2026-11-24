import { medicineCard, OG_CONTENT_TYPE, OG_SIZE, ogCard } from '@/lib/og/card';
import { t } from '@/lib/i18n';
import { getPublicMolecule, getPublicStatus } from '@/lib/public/medicine';
import { isSimulatedStatus, publicStatusSentence } from '@/lib/public/share';

// The share card of a public medicine page: its name and public status, read when the link is
// previewed (WhatsApp, LinkedIn). Never a level below "confirmée" (public_molecule_status).

export const alt = t('public.share.ogAlt');
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ moleculeId: string }> }) {
  const molecule = await getPublicMolecule((await params).moleculeId).catch(() => null);
  if (!molecule) return ogCard({ title: t('core.og.home.title'), body: t('core.og.home.body') });
  const status = await getPublicStatus(molecule.id).catch(() => null);
  if (!status) return medicineCard({ name: molecule.name, level: null, sentence: t('public.share.ogUnavailable'), simulated: false });
  return medicineCard({
    name: molecule.name,
    level: status.level,
    sentence: publicStatusSentence(status, t, 'fr'),
    simulated: isSimulatedStatus(status),
  });
}
