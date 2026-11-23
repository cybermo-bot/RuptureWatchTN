import { PackageCheck } from 'lucide-react';
import { OriginBadge } from '@/components/OriginBadge';
import type { CatalogueFacts } from '@/lib/institutions/catalogue';
import type { Arrival } from '@/lib/institutions/data';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';

// Two short lines shared by the institutions' spaces and the pharmacy space: what the CNAM list
// says about a medicine, and an arrival announced by the centrale. Every value is computed.

export function otherBrandsText(f: CatalogueFacts): string {
  if (f.otherBrands === 0) return t('core.catalogue.otherBrandsNone');
  if (f.otherBrands === 1) return t('core.catalogue.otherBrandsOne');
  return t('core.catalogue.otherBrandsMany', { n: f.otherBrands });
}

export function categoryText(f: CatalogueFacts | undefined): string {
  return f?.category ? t(`core.catalogue.category.${f.category}`) : t('core.catalogue.categoryNone');
}

/** "Vital · Aucune autre marque": the second part stands out when no other brand exists. */
export function CatalogueLine({ facts }: { facts: CatalogueFacts | undefined }) {
  if (!facts) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span>{facts.category ? t('core.catalogue.categoryLabel', { category: categoryText(facts) }) : categoryText(facts)}</span>
      <span aria-hidden="true">·</span>
      <span className={facts.otherBrands === 0 ? 'font-semibold text-ink' : undefined}>{otherBrandsText(facts)}</span>
    </span>
  );
}

/** "Arrivage annoncé par la centrale d'achat pour le …", with its origin badge. Never a level. */
export function ArrivalLine({ arrival, className = '' }: { arrival: Arrival; className?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink ${className}`}>
      <PackageCheck size={16} aria-hidden="true" className="shrink-0 text-brand" />
      <span>
        {t('core.arrival.line', { date: formatDate(arrival.expectedOn), quantity: t(`core.arrival.quantity.${arrival.quantity}`) })}
      </span>
      <OriginBadge origin={arrival.origin} />
    </p>
  );
}
