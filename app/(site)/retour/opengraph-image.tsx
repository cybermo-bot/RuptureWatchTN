import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from '@/lib/og/card';
import { t } from '@/lib/i18n';

export const alt = t('core.og.replay.alt');
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogCard({ title: t('core.og.replay.title'), body: t('core.og.replay.body') });
}
