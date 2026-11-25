// Open Graph cards (1200 × 630) for links shared on WhatsApp or LinkedIn: the wordmark, the page
// title, one sentence, and the four levels as shape plus word. Same tokens and typeface as the
// site. Rendered at build time by next/og; the texts come from messages/fr/core.json.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { t } from '@/lib/i18n';
import { Mark } from './mark';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

const INK = '#153442';
const MUTED = '#475E67';
const LINE = '#CCD8DA';
const LEVELS = [
  { key: 'watch', colour: '#8B5900' },
  { key: 'likely', colour: '#A94412' },
  { key: 'confirmed', colour: '#AE233A' },
  { key: 'cleared', colour: '#216D54' },
] as const;

function Shape({ level, colour }: { level: (typeof LEVELS)[number]['key']; colour: string }) {
  if (level === 'cleared') {
    return (
      <svg width="28" height="28" viewBox="0 0 16 16">
        <path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke={colour} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6" fill={level === 'confirmed' ? colour : 'none'} stroke={colour} strokeWidth="2" />
      {level === 'likely' ? <path d="M8 2a6 6 0 0 1 0 12z" fill={colour} /> : null}
    </svg>
  );
}

const font = (file: string) => readFile(join(process.cwd(), 'assets', 'fonts', file));

export async function ogCard({ title, body }: { title: string; body: string }): Promise<ImageResponse> {
  const [regular, semibold] = await Promise.all([font('IBMPlexSans-Regular.ttf'), font('IBMPlexSans-SemiBold.ttf')]);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF', padding: '64px 72px', fontFamily: 'Plex', color: INK }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Mark size={56} />
            <div style={{ display: 'flex', fontSize: 34, fontWeight: 600 }}>
              {t('core.app.wordmark')}
              <span style={{ color: MUTED, fontWeight: 400, marginLeft: 10 }}>{t('core.app.wordmarkCountry')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: MUTED }}>{t('core.app.prototype')}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', gap: 22 }}>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 600, lineHeight: 1.12, letterSpacing: -1 }}>{title}</div>
          <div style={{ display: 'flex', fontSize: 30, color: MUTED, lineHeight: 1.35, maxWidth: 980 }}>{body}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 48, paddingTop: 28, borderTop: `2px solid ${LINE}` }}>
          <div style={{ display: 'flex', gap: 40 }}>
            {LEVELS.map((l) => (
              <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 26 }}>
                <Shape level={l.key} colour={l.colour} />
                {t(`core.levels.${l.key}`)}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Plex', data: regular, weight: 400, style: 'normal' },
        { name: 'Plex', data: semibold, weight: 600, style: 'normal' },
      ],
    },
  );
}

/**
 * The card of a public medicine page (part 8, item 4): the medicine, its public status sentence
 * with the level's shape ("confirmée" or "levée" only, rule 10), "Simulé" when the status rests on
 * demonstration data, and the disclaimer. French: a link preview is fetched without a language.
 */
export async function medicineCard({
  name,
  level,
  sentence,
  simulated,
}: {
  name: string;
  level: 'confirmed' | 'cleared' | 'none' | null;
  sentence: string;
  simulated: boolean;
}): Promise<ImageResponse> {
  const [regular, semibold] = await Promise.all([font('IBMPlexSans-Regular.ttf'), font('IBMPlexSans-SemiBold.ttf')]);
  const shape = level === 'confirmed' || level === 'cleared' ? LEVELS.find((l) => l.key === level) : undefined;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF', padding: '64px 72px', fontFamily: 'Plex', color: INK }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Mark size={56} />
            <div style={{ display: 'flex', fontSize: 34, fontWeight: 600 }}>
              {t('core.app.wordmark')}
              <span style={{ color: MUTED, fontWeight: 400, marginLeft: 10 }}>{t('core.app.wordmarkCountry')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: MUTED }}>{t('public.medicine.statusTitle')}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', gap: 24 }}>
          <div style={{ display: 'flex', fontSize: 68, fontWeight: 600, lineHeight: 1.1, letterSpacing: -1 }}>{name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 38, fontWeight: 600, lineHeight: 1.25 }}>
            {shape ? <Shape level={shape.key} colour={shape.colour} /> : null}
            <span>{sentence}</span>
          </div>
          {simulated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 26, color: MUTED }}>
              <span style={{ display: 'flex', border: `2px dashed ${MUTED}`, borderRadius: 4, padding: '2px 12px', letterSpacing: 2, textTransform: 'uppercase', color: INK }}>
                {t('public.origin.simulated')}
              </span>
              <span>{t('public.share.simulatedNote')}</span>
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', marginTop: 44, paddingTop: 26, borderTop: `2px solid ${LINE}`, fontSize: 26, color: MUTED }}>
          {t('public.medicine.disclaimer')}
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Plex', data: regular, weight: 400, style: 'normal' },
        { name: 'Plex', data: semibold, weight: 600, style: 'normal' },
      ],
    },
  );
}
