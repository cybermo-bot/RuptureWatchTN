import { translator, type Locale } from '@/lib/i18n';
import { dosageForm, type DosageForm } from '@/lib/public/dosage-form';

const shapes: Record<DosageForm, React.ReactNode> = {
  tablet: <><ellipse cx="20" cy="20" rx="12" ry="8" transform="rotate(-35 20 20)" /><path d="m16 14 8 12" /></>,
  capsule: <><rect x="7" y="13" width="26" height="14" rx="7" transform="rotate(-38 20 20)" /><path d="m16 14 8 12" /></>,
  oralLiquid: <><path d="M15 7h10v7l4 6v12H11V20l4-6ZM15 11h10M11 22h18M16 27h8" /></>,
  injectable: <><path d="m15 9 6 6m-8-4 6 6m-3-2-4 4 9 9 8-8-9-9m-3 13-2 2 2 2 2-2m5-1 7 7m-9-13 3 3m-6 0 3 3" /></>,
  topical: <><path d="m9 12 18-4 5 19-6 2 1 4-8 2-1-4-6 1ZM10 16l18-4m-10 6 4-1m-3 6 4-1" /></>,
  drops: <><path d="M15 7h10l-1 8 4 5v12H12V20l4-5ZM16 11h8m-4 10c-2 3-3 4-3 5a3 3 0 0 0 6 0c0-1-1-2-3-5Z" /></>,
  suppository: <><path d="M13 30V18c0-6 4-10 7-12 3 2 7 6 7 12v12a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3Z" /><path d="M13 27h14" /></>,
  sachet: <><path d="M10 8h20l2 24H8ZM10 13h20M9 27h22m-15-7h8" /></>,
  inhaler: <><path d="M16 7h10v9h3v17H11v-7h6v-10h-1Zm1 9h9m-15 14h10m-2-19h5" /></>,
  unknown: <><rect x="10" y="10" width="20" height="20" rx="3" /><path d="M16 17h8m-8 6h5" /></>,
};

export function FormPicture({ label, brand, locale = 'fr', className = '' }: {
  label?: string | null;
  brand?: string | null;
  locale?: Locale;
  className?: string;
}) {
  const t = translator(locale);
  const form = dosageForm(label, brand);
  return (
    <svg
      role="img"
      aria-label={t(`public.dosageForm.${form}`)}
      data-dosage-form={form}
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-12 shrink-0 rounded-md bg-powder-blue p-1 text-brand ${className}`}
    >
      {shapes[form]}
    </svg>
  );
}
