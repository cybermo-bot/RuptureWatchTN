import { CircleCheck, Send } from 'lucide-react';
import Link from 'next/link';
import { submitFeedback } from '@/app/actions/feedback';
import { Button } from '@/components/Button';
import { FEEDBACK_MAX, FEEDBACK_RATINGS, type FeedbackRating } from '@/lib/feedback/path';

/** The texts of the form, from the public namespace (French or Arabic) or the pharmacy's (core). */
export interface FeedbackTexts {
  messageLabel: string;
  noPatient: string;
  limit: string;
  ratingLegend: string;
  ratings: Record<FeedbackRating, string>;
  submit: string;
  sentTitle: string;
  sentBody: string;
  back: string;
  errors: { vide: string; limite: string; other: string };
}

// « Un problème ? Une idée ? » (pilot-2 item 3): one textarea, three optional choices, and the
// line « N'écrivez ni nom ni numéro de patient. » right under it. A plain form: works without
// JavaScript. After sending, a thank-you and the way back to the page it came from.
export function FeedbackForm({
  espace,
  depuis,
  sent,
  error,
  texts,
}: {
  espace: 'public' | 'pharmacie';
  depuis: string;
  sent: boolean;
  error: string | null;
  texts: FeedbackTexts;
}) {
  if (sent) {
    return (
      <section aria-labelledby="avis-envoye" className="panel flex flex-col items-start gap-3 p-5">
        <h2 id="avis-envoye" className="inline-flex items-center gap-2 text-lg font-semibold text-ink">
          <CircleCheck size={22} aria-hidden="true" className="shrink-0 text-level-cleared" />
          {texts.sentTitle}
        </h2>
        <p className="max-w-prose text-ink-muted">{texts.sentBody}</p>
        <Link href={depuis} className="inline-flex min-h-12 items-center text-brand underline">
          {texts.back}
        </Link>
      </section>
    );
  }

  const errorText = error === 'vide' ? texts.errors.vide : error === 'limite' ? texts.errors.limite : error ? texts.errors.other : null;
  return (
    <form action={submitFeedback} className="panel flex flex-col gap-5 p-5">
      <input type="hidden" name="espace" value={espace} />
      <input type="hidden" name="depuis" value={depuis} />
      {errorText ? (
        <p role="alert" className="text-level-confirmed">
          {errorText}
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="avis-message" className="font-medium text-ink">
          {texts.messageLabel}
        </label>
        <textarea
          id="avis-message"
          name="message"
          required
          maxLength={FEEDBACK_MAX}
          rows={6}
          aria-describedby="avis-patient avis-limite"
          className="w-full rounded-sm border border-ink-muted bg-surface px-3 py-2.5 text-base text-ink"
        />
        <p id="avis-patient" className="font-medium text-ink">
          {texts.noPatient}
        </p>
        <p id="avis-limite" className="text-sm text-ink-muted">
          {texts.limit}
        </p>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium text-ink">{texts.ratingLegend}</legend>
        <div className="flex flex-wrap gap-2">
          {FEEDBACK_RATINGS.map((rating) => (
            <label
              key={rating}
              className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-sm border border-line bg-surface px-4 text-ink has-[:checked]:border-brand has-[:checked]:bg-surface-subtle has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand"
            >
              <input type="radio" name="note" value={rating} className="size-4 accent-[var(--brand)]" />
              {texts.ratings[rating]}
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" className="self-start">
        <Send size={18} aria-hidden="true" className="rtl:-scale-x-100" />
        {texts.submit}
      </Button>
    </form>
  );
}
