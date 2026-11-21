import map from '@/data/reference/governorates-map.json';
import { t } from '@/lib/i18n';

// The governorate map: an SVG built from an open boundary file (data/SOURCES.md), no tile provider.
// Takes a value per governorate code. Every governorate has its name as a <title> label,
// and the same names and values are given as a text list for screen readers.

export interface GovernorateValue {
  /** Text for the governorate, e.g. a count already suppressed ("<3") or a level word. */
  text: string;
  /** Fill colour, as a CSS value (use the design tokens, e.g. "var(--level-likely)"). */
  fill?: string;
}

interface GovernorateMapProps {
  values?: Partial<Record<string, GovernorateValue>>;
  /** Accessible name of the map. */
  title?: string;
  /** Draw names on the map. Governorates too small to hold a name keep their <title> label. */
  showLabels?: boolean;
  className?: string;
}

// Greater Tunis: too small at phone size to carry a visible name.
const TOO_SMALL_FOR_LABEL = new Set(['TN-11', 'TN-12', 'TN-13', 'TN-14']);

export interface GovernorateShape {
  code: string;
  name: string;
  d: string;
  label: [number, number];
}

export const GOVERNORATE_SHAPES = map.governorates as GovernorateShape[];
export const GOVERNORATE_MAP_LICENCE = map.licence;

export function GovernorateMap({ values = {}, title, showLabels = false, className = '' }: GovernorateMapProps) {
  const name = title ?? t('map.label');
  return (
    <figure className={`m-0 ${className}`}>
      <svg
        viewBox={map.viewBox}
        role="img"
        aria-label={name}
        className="block h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <g strokeLinejoin="round">
          {GOVERNORATE_SHAPES.map((g) => {
            const value = values[g.code];
            return (
              <path
                key={g.code}
                d={g.d}
                fill={value?.fill ?? 'var(--surface-subtle)'}
                stroke="var(--ink-muted)"
                strokeWidth={0.75}
                vectorEffect="non-scaling-stroke"
                data-code={g.code}
              >
                <title>{value ? `${g.name} : ${value.text}` : g.name}</title>
              </path>
            );
          })}
        </g>
        {showLabels ? (
          <g aria-hidden="true" className="fill-ink" fontSize={15} textAnchor="middle">
            {GOVERNORATE_SHAPES.filter((g) => !TOO_SMALL_FOR_LABEL.has(g.code)).map((g) => (
              <text key={g.code} x={g.label[0]} y={g.label[1]} dominantBaseline="middle">
                {g.name}
              </text>
            ))}
          </g>
        ) : null}
      </svg>
      <figcaption className="sr-only">
        <p>{t('map.listLabel')}</p>
        <ul>
          {GOVERNORATE_SHAPES.map((g) => (
            <li key={g.code}>
              {g.name} : {values[g.code]?.text ?? t('map.noValue')}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
