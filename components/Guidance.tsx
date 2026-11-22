import { t, tList } from '@/lib/i18n';
import type { Level } from '@/lib/signal';

// The team's guidance for a level, word for word, with the disclaimer line and the text's
// review status. Never written by the product itself (rule 11).

type GuidedLevel = 'watch' | 'likely' | 'confirmed' | 'cleared';

export function hasGuidance(level: Level): level is GuidedLevel {
  return level === 'watch' || level === 'likely' || level === 'confirmed' || level === 'cleared';
}

export function Disclaimer() {
  return <p className="font-medium text-ink">{t('guidance.disclaimer')}</p>;
}

export function ReviewStatus() {
  return <p className="text-sm text-ink-muted">{t('guidanceBlock.reviewStatus', { status: t('guidance.reviewStatus') })}</p>;
}

export function Guidance({ level, headingLevel = 2 }: { level: Level; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className="flex flex-col gap-3">
      <Heading className="text-sm font-medium text-ink-muted">{t('guidanceBlock.title')}</Heading>
      {hasGuidance(level) ? (
        <ul className="flex max-w-prose list-disc flex-col gap-1.5 ps-5 text-ink marker:text-ink-muted">
          {tList(`guidance.levels.${level}.guidance`).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <Disclaimer />
      <ReviewStatus />
    </section>
  );
}
