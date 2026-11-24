import { scaleLinear } from 'd3-scale';

// A 14-day sparkline: the trend next to a key figure. Decorative for screen readers, because
// the figure and the sentence next to it carry the information (KeyFigures gives the series
// as text). Server-rendered SVG, no script.

export function Sparkline({
  values,
  width = 96,
  height = 28,
  colour = 'var(--brand)',
}: {
  values: number[];
  width?: number;
  height?: number;
  colour?: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const x = scaleLinear()
    .domain([0, values.length - 1])
    .range([1.5, width - 1.5]);
  const y = scaleLinear()
    .domain([0, max])
    .range([height - 2, 2]);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const last = values.length - 1;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false" className="block min-w-0 overflow-visible">
      <line x1={0} x2={width} y1={height - 2} y2={height - 2} stroke="var(--line)" strokeWidth={1} />
      <polyline points={points.join(' ')} fill="none" stroke={colour} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last)} cy={y(values[last])} r={2.25} fill={colour} />
    </svg>
  );
}
