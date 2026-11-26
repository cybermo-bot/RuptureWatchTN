// The scenario's key stops (ported from origin/olfa, where they drove the home page's globe; here
// they drive the /scenario stepper rail, components/scenario/StopRail.tsx), computed from
// the scenario (lib/scenario/frames.ts): the start, every level change, and the step just before
// the level is confirmed, where three pharmacies in one governorate are not enough (gate two).
// Nothing is hardcoded: days, levels, places, counts and alerts come from scenarioFrames(), which
// runs the real evaluate() on fictional reports. Counts are the shown ones ("<3" below 3).

import type { AlertRecipient, ScenarioFrame } from '@/lib/scenario/frames';
import type { ShownCount } from '@/lib/signals/shown';
import type { Level, RuleId } from '@/lib/signal';

export type TourKind = 'start' | 'notice' | 'report' | 'cleared';

export interface TourStop {
  frameIndex: number;
  kind: TourKind;
  /** Days since the start of the scenario; null for the starting view. */
  day: number | null;
  level: Level;
  /** The level before this step when it changed here; null when it did not change. */
  previous: Level | null;
  rule: RuleId;
  /** Governorates the camera and the card point at, in the order they first reported. */
  focus: string[];
  /** Governorates coloured on the globe at this step, with the level they are coloured by. */
  fills: Record<string, Level>;
  /** Pharmacies behind the level, as shown; null when the card shows no count. */
  pharmacies: ShownCount | null;
  /** Governorates behind the level; null when withheld or not shown. */
  governorates: number | null;
  /** Foreign notices in force. */
  notices: number;
  alerted: AlertRecipient[];
  standDown: boolean;
}

function kindOf(frame: ScenarioFrame): TourKind {
  if (frame.index === 0) return 'start';
  if (frame.level === 'cleared') return 'cleared';
  if (!frame.governorateCode) return 'notice';
  return 'report';
}

export function tourStops(frames: ScenarioFrame[]): TourStop[] {
  const firstConfirmed = frames.findIndex((f) => f.changed && f.level === 'confirmed');
  const reported: string[] = [];
  const stops: TourStop[] = [];

  frames.forEach((frame, i) => {
    for (const c of frame.counts) if (!reported.includes(c.governorateCode)) reported.push(c.governorateCode);
    const beforeConfirmed = firstConfirmed > 0 && i === firstConfirmed - 1 && !frame.changed && frame.governorateCode !== null;
    if (i !== 0 && !frame.changed && !beforeConfirmed) return;

    const kind = kindOf(frame);
    const fills: Record<string, Level> = {};
    let focus: string[] = [];
    if (kind === 'report') {
      for (const c of frame.counts) fills[c.governorateCode] = frame.level;
      focus = frame.governorateCode ? [frame.governorateCode] : [];
    } else if (kind === 'cleared') {
      for (const code of reported) fills[code] = 'cleared';
      focus = [...reported];
    }

    const counted = kind === 'report' || kind === 'notice';
    stops.push({
      frameIndex: frame.index,
      kind,
      day: kind === 'start' ? null : frame.day,
      level: frame.level,
      previous: frame.changed ? frame.previous : null,
      rule: frame.rule,
      focus,
      fills,
      pharmacies: counted ? frame.evidence.pharmacies14d : null,
      governorates: kind === 'report' ? frame.evidence.governorates14d : null,
      notices: frame.evidence.notices.length,
      alerted: frame.alerted,
      standDown: frame.standDown,
    });
  });
  return stops;
}

/** The level as a rank for the scenario's level chart: cleared drawn at the bottom. */
export function levelRank(level: Level): number {
  return level === 'watch' ? 1 : level === 'likely' ? 2 : level === 'confirmed' ? 3 : 0;
}
