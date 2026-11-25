'use client';

import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { startGlobe, type GlobeStop, type GlobeTexts } from './globe-engine';

// The home page's first screen: a full-bleed 3D globe that flies over Tunisia while the scenario
// plays, the card pinned to the place it describes, and the tour controls. The statement on the
// left (children) is rendered on the server. Stops and texts come from the server too
// (lib/landing/tour.ts, messages/fr/core.json); globe-engine.ts does the drawing and the motion.

export interface GlobeLabels {
  globe: string;
  controls: string;
  previous: string;
  next: string;
  simulated: string;
  simulatedTitle: string;
  /** Per stop: the rail's short label ("Début", "J2") and its accessible name. */
  nodes: { short: string; name: string }[];
}

export function LandingGlobe({
  stops,
  texts,
  labels,
  geoUrl,
  children,
  disclaimer,
  attribution,
}: {
  stops: GlobeStop[];
  texts: GlobeTexts;
  labels: GlobeLabels;
  geoUrl: string;
  children: ReactNode;
  disclaimer: ReactNode;
  /** Credit for the map data (ODbL), always visible. */
  attribution: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    return startGlobe({ root: ref.current, stops, texts, geoUrl });
  }, [stops, texts, geoUrl]);

  const n = stops.length;
  return (
    <section ref={ref} className="hero dark" id="top" aria-labelledby="accroche">
      <canvas id="gl" data-globe="canvas" role="img" aria-label={labels.globe} />
      <div className="scrim" aria-hidden="true" />
      <div className="overlay" aria-hidden="true">
        <svg className="leader" data-globe="leader">
          <g data-globe="lead-g" />
        </svg>
        <div data-globe="labels" />
        <div className="tip" data-globe="tip" />
      </div>
      <div className="co-wrap" data-globe="co-wrap">
        <article className="callout" data-globe="callout" aria-live="polite">
          <header className="co-h">
            <span className="co-day" data-globe="co-day" />
            <span className="co-place" data-globe="co-place" />
            <span className="badge dk" title={labels.simulatedTitle}>
              {labels.simulated}
            </span>
          </header>
          <div className="co-lv">
            <span className="pill" data-globe="co-pill" />
            <span className="co-prev" data-globe="co-prev" />
          </div>
          <p className="co-txt" data-globe="co-txt" />
          <div className="co-meta" data-globe="co-meta" />
          <div className="co-al" data-globe="co-al" />
        </article>
      </div>

      <div className="hero-in">{children}</div>

      <div className="dock">
        <div className="dock-in">
          <div className="tour" role="group" aria-label={labels.controls}>
            <div className="ctl">
              <button type="button" className="rb" data-globe="prev" aria-label={labels.previous}>
                <ChevronLeft strokeWidth={2.2} aria-hidden="true" />
              </button>
              <button type="button" className="rb main" data-globe="play" aria-label={texts.pause}>
                <Pause data-globe="ic-pause" fill="currentColor" strokeWidth={0} aria-hidden="true" />
                <Play data-globe="ic-play" fill="currentColor" strokeWidth={0} aria-hidden="true" style={{ display: 'none' }} />
              </button>
              <button type="button" className="rb" data-globe="next" aria-label={labels.next}>
                <ChevronRight strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>
            <div className="track">
              <i className="fill" data-globe="fill" />
              <ol className="steps">
                {stops.map((s, i) => (
                  <li key={i} style={{ left: `${(i / Math.max(1, n - 1)) * 100}%` }}>
                    <button
                      type="button"
                      className="node"
                      data-globe="node"
                      style={{ '--c': `var(--${s.level}-s)` } as CSSProperties}
                      aria-label={labels.nodes[i].name}
                    >
                      <span className="dt" />
                      <span className="lb">{labels.nodes[i].short}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <p className="disc">{disclaimer}</p>
        </div>
      </div>
      <p className="attrib">{attribution}</p>
    </section>
  );
}
