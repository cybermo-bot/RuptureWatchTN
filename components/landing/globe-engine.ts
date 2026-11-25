// The home page's 3D globe and its guided tour, as plain DOM and WebGL code started by
// LandingGlobe.tsx and stopped by the cleanup it returns. Every stop, level, count and text comes
// in from the server (lib/landing/tour.ts, messages/fr/core.json); this file only decides where
// the camera goes and how things move. Without WebGL 2 the tour still runs: the card stays put
// and the globe is replaced by a still background (`nogl`). With reduced motion the tour starts
// paused on the first event, nothing flies and nothing pulses.

import type * as ThreeNS from 'three';
import type { AlertRecipient } from '@/lib/scenario/frames';
import type { Level } from '@/lib/signal';
import type { TourKind } from '@/lib/landing/tour';

type Three = typeof ThreeNS;

/** A stop as the server sends it: the computed step and its texts, already in French. */
export interface GlobeStop {
  kind: TourKind;
  day: number | null;
  level: Level;
  previous: Level | null;
  focus: string[];
  fills: Record<string, Level>;
  alerted: AlertRecipient[];
  place: string;
  text: string;
  /** Figures under the text: [value, label]. */
  meta: [string, string][];
  /** "Alertés" or "Message de levée"; null when nobody is alerted. */
  alert: string | null;
}

export interface GlobeTexts {
  levels: Record<Level, string>;
  /** "Avant : {level}" */
  before: string;
  unchanged: string;
  nobody: string;
  recipients: Record<AlertRecipient, string>;
  country: string;
  noReport: string;
  /** "J{day}" */
  dayShort: string;
  play: string;
  pause: string;
}

interface Shot {
  lon: number;
  lat: number;
  d: number;
  pitch: number;
  head: number;
  shift: number;
  dwell: number;
  /** Dwell of the very first view, before the tour has looped once. */
  first?: number;
  /** Wait before the card appears, after the camera has landed. */
  delay?: number;
  /** Minimum distance between the place and its card, in pixels. */
  gap?: number;
}

interface Anchor {
  gov?: string;
  lon?: number;
  lat?: number;
}

interface Stop extends GlobeStop, Shot {
  anchors: Anchor[] | null;
  akey: string | null;
  notice: boolean;
  /** Which of Signaler, Qualifier, Agir light up at this stop. */
  phases: number[] | null;
}

interface GeoGov {
  c: string;
  n: string;
  r: [number, number][][];
  ctr: [number, number];
  rad: number;
  bb: [number, number, number, number];
}

interface Geo {
  gov: GeoGov[];
  dotsW: number[];
  dotsR: number[];
  dotsL: number[];
  border: [number, number][][];
  coast: [number, number][][];
}

// Colours of the plum stage, in the order of the level tokens of components/landing/landing.css.
const HEX: Record<Level, string> = {
  none: '#7e6a96',
  watch: '#e9c46a',
  likely: '#f4a06b',
  confirmed: '#ff8fa3',
  cleared: '#6fd3ae',
};
const NEUTRAL = '#3a2656';
const LINE = '#b7a3e8';
const CITRON = '#dff576';

// The level's shape as in components/LevelBadge.tsx: open circle, half-filled circle, filled
// circle, check mark. Static markup, no text from outside.
const SHAPE: Record<Level, string> = {
  none: '<path d="M4 8 H12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  watch: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/>',
  likely: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2 8 A6 6 0 0 0 14 8 Z" fill="currentColor"/>',
  confirmed: '<circle cx="8" cy="8" r="7" fill="currentColor"/>',
  cleared: '<path d="M2.5 8.5 L6.5 12.5 L13.5 4" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>',
};
const shapeSvg = (level: Level) => `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${SHAPE[level]}</svg>`;

// Camera shots. The foreign notice and the end are wide views of the country; a report flies to
// its governorate. Tunis and Sfax have tuned shots; any other governorate is framed by its size.
const WIDE_START: Shot = { lon: 12, lat: 32, d: 2.8, pitch: 0, head: 0, shift: 0, dwell: 1000, first: 0 };
const WIDE_NOTICE: Shot = { lon: 9.35, lat: 34.3, d: 0.37, pitch: 0.2, head: 0, shift: 0, dwell: 2900, delay: 700, gap: 110 };
const WIDE_END: Shot = { lon: 9.5, lat: 34.2, d: 0.37, pitch: 0.22, head: 0, shift: 0, dwell: 3000 };
const GOV_SHOTS: Record<string, Partial<Shot>> = {
  'TN-11': { lon: 10.17, lat: 36.79, shift: 0.14, d: 0.034, pitch: 0.6, head: -0.05 },
  'TN-61': { lon: 10.36, lat: 34.77, shift: 0.56, d: 0.08, pitch: 0.58, head: -0.04 },
};
// Where the foreign notice lands: the northern coast.
const NOTICE_LANDING = { lon: 10.05, lat: 37.22 };

const D2R = Math.PI / 180;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeIO = (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function buildStops(input: GlobeStop[], geo: Geo | null): Stop[] {
  return input.map((s, i) => {
    const prev = input[i - 1];
    let shot: Shot;
    let anchors: Anchor[] | null = null;
    if (s.kind === 'start') shot = WIDE_START;
    else if (s.kind === 'notice') {
      shot = WIDE_NOTICE;
      anchors = [NOTICE_LANDING];
    } else if (s.kind === 'cleared') {
      shot = WIDE_END;
      anchors = s.focus.map((gov) => ({ gov }));
    } else {
      const code = s.focus[0];
      const g = geo?.gov.find((x) => x.c === code);
      const tuned = GOV_SHOTS[code] ?? {};
      shot = {
        lon: tuned.lon ?? g?.ctr[0] ?? 9.6,
        lat: tuned.lat ?? g?.ctr[1] ?? 34,
        d: tuned.d ?? Math.max(0.03, (g?.rad ?? 0.3) * 0.2),
        pitch: tuned.pitch ?? 0.6,
        head: tuned.head ?? 0,
        shift: tuned.shift ?? 0.2,
        dwell: s.level === 'confirmed' ? 3100 : s.previous ? 2700 : 2300,
      };
      // A second step on the same place: come a little closer, from a slightly different angle.
      if (prev && prev.kind === 'report' && prev.focus.join() === s.focus.join()) {
        shot = { ...shot, d: shot.d * 0.88, pitch: shot.pitch + 0.06, head: -shot.head };
      }
      anchors = s.focus.map((gov) => ({ gov }));
    }
    const alerted = s.alerted.length > 0;
    const phases =
      s.kind === 'start' ? null : s.kind === 'notice' ? (alerted ? [1, 2] : [1]) : s.kind === 'cleared' ? [0, 1, 2] : alerted ? [0, 1, 2] : [0, 1];
    return {
      ...s,
      ...shot,
      anchors,
      akey: s.kind === 'notice' ? 'notice' : anchors ? s.focus.join('+') : null,
      notice: s.kind === 'notice',
      phases,
    };
  });
}

export interface GlobeOptions {
  root: HTMLElement;
  stops: GlobeStop[];
  texts: GlobeTexts;
  geoUrl: string;
}

export function startGlobe({ root, stops: input, texts, geoUrl }: GlobeOptions): () => void {
  const ac = new AbortController();
  const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Window | Document, type: K, fn: (e: HTMLElementEventMap[K]) => void, opts: AddEventListenerOptions = {}) =>
    el.addEventListener(type, fn as EventListener, { ...opts, signal: ac.signal });
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  };
  const observers: { disconnect(): void }[] = [];
  let raf = 0;
  let disposed = false;
  let cleanupGl: (() => void) | null = null;

  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T & Element>(`[data-globe="${sel}"]`) as T;
  const hero = root;
  const page = (root.closest('.rwl') as HTMLElement | null) ?? root;
  const canvas = q<HTMLCanvasElement>('canvas');
  const coWrap = q('co-wrap');
  const callout = q('callout');
  const leader = q<SVGSVGElement>('leader');
  const leadG = q<SVGGElement>('lead-g');
  const glabels = q('labels');
  const tip = q('tip');
  const fillEl = q('fill');
  const bPrev = q<HTMLButtonElement>('prev');
  const bNext = q<HTMLButtonElement>('next');
  const bPlay = q<HTMLButtonElement>('play');
  const icPause = q('ic-pause');
  const icPlay = q('ic-play');
  const coDay = q('co-day');
  const coPlace = q('co-place');
  const coPill = q('co-pill');
  const coPrev = q('co-prev');
  const coTxt = q('co-txt');
  const coMeta = q('co-meta');
  const coAl = q('co-al');
  const copyEl = q('copy-anchor');
  const phases = Array.from(root.querySelectorAll<HTMLElement>('[data-globe="phases"] li'));
  const nodes = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-globe="node"]'));

  let STOPS = buildStops(input, null);
  const N = STOPS.length;

  /* ---------- callout ---------- */
  let coOn = false;
  let coSide: 'r' | 'l' | 'b' | null = null;
  let coSize: { w: number; h: number } | null = null;
  let coBox: { x: number; y: number; w: number; h: number } | null = null;
  const recipients: AlertRecipient[] = ['followers', 'wholesalers', 'hospitals', 'coordination'];

  function fillCallout(s: Stop, swap: boolean) {
    const hex = HEX[s.level];
    callout.style.setProperty('--lc', hex);
    leader.style.setProperty('--lc', hex);
    coDay.textContent = s.day === null ? '' : texts.dayShort.replace('{day}', String(s.day));
    coPlace.textContent = s.place;
    coPill.style.setProperty('--c', `var(--${s.level === 'none' ? 'none' : s.level}-s)`);
    coPill.innerHTML = `${shapeSvg(s.level)}<span>${esc(texts.levels[s.level])}</span>`;
    coPrev.textContent = s.previous ? texts.before.replace('{level}', texts.levels[s.previous]) : texts.unchanged;
    coTxt.textContent = s.text;
    coMeta.style.display = s.meta.length ? '' : 'none';
    coMeta.innerHTML = s.meta.map(([v, l]) => `<span><b>${esc(v)}</b>${esc(l)}</span>`).join('');
    if (s.alert) {
      coAl.className = 'co-al';
      const who = recipients.filter((r) => s.alerted.includes(r));
      coAl.innerHTML = `<span>${esc(s.alert)} :</span>` + who.map((r, n) => `<i style="--n:${n}">${esc(texts.recipients[r])}</i>`).join('');
    } else {
      coAl.className = 'co-al none';
      coAl.innerHTML = `<span>${esc(texts.nobody)}</span>`;
    }
    if (swap) {
      for (const e of [coDay, coPrev, coTxt, coMeta, coAl]) {
        e.classList.remove('swapin');
        void e.offsetWidth;
        e.classList.add('swapin');
      }
      coAl.querySelectorAll<HTMLElement>('i').forEach((c) => {
        c.style.animation = 'none';
        c.style.opacity = '1';
        c.style.transform = 'none';
      });
    }
    coSize = null;
  }
  function showCallout() {
    coOn = true;
    coSide = null;
    callout.classList.add('on');
    leader.classList.add('on');
  }
  function hideCallout() {
    coOn = false;
    callout.classList.remove('on');
    leader.classList.remove('on');
  }
  function buildLeader(s: Stop) {
    leadG.innerHTML = (s.anchors ?? []).map(() => '<path pathLength="1"/><circle class="ar" r="5"/><circle class="ad" r="3.2"/>').join('');
  }

  /* ---------- Signaler, Qualifier, Agir light up in turn ---------- */
  const phaseTimers: number[] = [];
  function runPhases(list: number[] | null) {
    phaseTimers.splice(0).forEach((id) => {
      clearTimeout(id);
      timers.delete(id);
    });
    phases.forEach((li) => li.classList.remove('on'));
    if (!list) return;
    list.forEach((p, i) => {
      phaseTimers.push(
        later(() => {
          phases.forEach((li) => li.classList.remove('on'));
          phases[p]?.classList.add('on');
        }, RM ? 0 : i * 520),
      );
    });
  }

  /* ---------- tour controller ---------- */
  let idx = 0;
  let playing = !RM;
  let tStart = performance.now();
  let tStop = tStart;
  let flightDur = 0;
  let arrived = false;
  let visible = true;
  let looped = false;
  let pausedAt = 0;
  let G: { fly(s: Stop, instant: boolean): void; levels(map: Record<string, Level>): void; arrive(s: Stop): void } | null = null;

  const setFill = (i: number, p: number) => {
    fillEl.style.width = `${clamp((i + p) / (N - 1), 0, 1) * 100}%`;
  };
  const renderRail = () =>
    nodes.forEach((b, j) => {
      b.classList.toggle('on', j === idx);
      b.classList.toggle('done', j < idx);
      if (j === idx) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
  const dwellOf = (s: Stop) => (s.kind === 'start' && !looped ? (s.first ?? s.dwell) : s.dwell);

  function syncPlay() {
    icPause.style.display = playing ? '' : 'none';
    icPlay.style.display = playing ? 'none' : '';
    bPlay.setAttribute('aria-label', playing ? texts.pause : texts.play);
  }

  function go(i: number, user: boolean) {
    const prev = STOPS[idx];
    if (i >= N) looped = true;
    idx = (i + N) % N;
    const s = STOPS[idx];
    tStart = tStop = performance.now();
    arrived = false;
    const same = coOn && prev && prev.akey && prev.akey === s.akey;
    if (same) later(() => STOPS[idx] === s && fillCallout(s, true), 140);
    else {
      hideCallout();
      if (s.anchors)
        later(() => {
          if (STOPS[idx] === s && !coOn) {
            fillCallout(s, false);
            buildLeader(s);
          }
        }, 200);
    }
    if (G) G.fly(s, (user && RM) || RM);
    else flightDur = 0;
    if (s.kind === 'start' && G) G.levels({});
    runPhases(null);
    renderRail();
    setFill(idx, 0);
    syncPlay();
  }
  function onArrive() {
    const s = STOPS[idx];
    if (G) {
      G.levels(s.fills);
      G.arrive(s);
    }
    if (s.anchors) {
      later(() => {
        if (STOPS[idx] !== s) return;
        if (!coOn) {
          fillCallout(s, false);
          buildLeader(s);
          showCallout();
        }
        runPhases(s.phases);
      }, RM ? 0 : (s.delay ?? 140));
    }
  }

  on(bPrev, 'click', () => go(idx - 1, true));
  on(bNext, 'click', () => go(idx + 1, true));
  on(bPlay, 'click', () => {
    const n = performance.now();
    if (playing) pausedAt = n;
    else if (pausedAt) {
      tStop += n - pausedAt;
      pausedAt = 0;
    }
    playing = !playing;
    syncPlay();
  });
  nodes.forEach((b, j) => on(b, 'click', () => go(j, true)));

  let lastTick = performance.now();
  function tourTick(now: number) {
    const dt = now - lastTick;
    lastTick = now;
    if (!visible || document.hidden) {
      tStop += dt;
      return;
    }
    if (!playing) return;
    const s = STOPS[idx];
    const p = clamp((now - tStop) / (flightDur + dwellOf(s)), 0, 1);
    setFill(idx, p);
    if (p >= 1) go(idx + 1, false);
  }

  const io = new IntersectionObserver((en) => (visible = en[0].isIntersecting), { threshold: 0 });
  io.observe(hero);
  observers.push(io);

  /* ---------- globe ---------- */
  function initGlobe(THREE: Three, geo: Geo) {
    THREE.ColorManagement.enabled = false;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(DPR);
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(30, 1, 0.001, 90);
    const globe = new THREE.Group();
    scene.add(globe);
    const SH = { uScale: { value: 800 }, uPxK: { value: 0.001 } };
    const ll = (lon: number, lat: number, r: number) => {
      const phi = (90 - lat) * D2R;
      const th = (lon + 180) * D2R;
      return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
    };

    /* the sea and the graticule */
    const bodyU = { uG10: { value: 0 }, uG1: { value: 0 }, uG025: { value: 0 } };
    globe.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(0.9997, 192, 128),
        new THREE.ShaderMaterial({
          uniforms: bodyU,
          vertexShader:
            'varying vec3 vN;varying vec3 vV;varying vec3 vO;void main(){vO=position;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}',
          fragmentShader: [
            'uniform float uG10;uniform float uG1;uniform float uG025;varying vec3 vN;varying vec3 vV;varying vec3 vO;',
            'float gr(vec2 c,float s){vec2 q=c/s;vec2 w=fwidth(q);vec2 f=abs(fract(q-.5)-.5)/max(w,vec2(1e-6));return 1.-min(min(f.x,f.y),1.);}',
            'void main(){vec3 n=normalize(vN);vec3 v=normalize(vV);float lam=max(dot(n,normalize(vec3(-.5,.6,.65))),0.);float fr=pow(1.-max(dot(n,v),0.),3.);',
            'vec3 o=normalize(vO);vec2 c=vec2(degrees(atan(-o.z,o.x)),degrees(asin(clamp(o.y,-1.,1.))));',
            'float g=gr(c,10.)*uG10+gr(c,1.)*uG1+gr(c,.25)*uG025;',
            'vec3 col=mix(vec3(.066,.032,.11),vec3(.16,.094,.255),lam)+vec3(.36,.26,.78)*fr*.5+vec3(.62,.52,1.)*g;',
            'gl_FragColor=vec4(col,1.);}',
          ].join('\n'),
        }),
      ),
    );

    /* atmosphere: a billboard through the centre, facing the camera */
    const atmU = { uR: { value: 1.05 }, uS: { value: 3 }, uK: { value: 1 } };
    const atm = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: atmU,
        vertexShader: 'uniform float uS;varying vec2 vP;void main(){vP=position.xy*uS;gl_Position=projectionMatrix*modelViewMatrix*vec4(position*uS,1.);}',
        fragmentShader:
          'uniform float uR;uniform float uK;varying vec2 vP;void main(){float d=length(vP)-uR;if(d<0.)discard;float g=(exp(-d*5.)*.7+exp(-d*24.)*.55)*uK;gl_FragColor=vec4(vec3(.44,.32,1.)*g,g);}',
      }),
    );
    scene.add(atm);

    /* stars */
    const sp: number[] = [];
    for (let i = 0; i < 700; i++) {
      const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(30 + Math.random() * 12);
      sp.push(v.x, v.y, v.z);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    const starM = new THREE.PointsMaterial({ color: 0xd5c7e4, size: 0.09, transparent: true, opacity: 0.55, sizeAttenuation: true, depthWrite: false });
    scene.add(new THREE.Points(sg, starM));

    /* land as dots, three levels of detail */
    type Box = [number, number, number, number];
    function dotLayer(arr: number[], o: { size: number; min: number; max: number; color: string; box?: Box; fade?: number; inBox?: Box }) {
      const n = arr.length / 2;
      const pos = new Float32Array(n * 3);
      const aE = new Float32Array(n);
      const aIn = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const lon = arr[2 * i];
        const lat = arr[2 * i + 1];
        const v = ll(lon, lat, 1.0004);
        pos[3 * i] = v.x;
        pos[3 * i + 1] = v.y;
        pos[3 * i + 2] = v.z;
        aE[i] = o.box ? clamp(Math.min(lon - o.box[0], o.box[2] - lon, lat - o.box[1], o.box[3] - lat) / (o.fade ?? 1), 0, 1) : 1;
        aIn[i] = o.inBox ? clamp(Math.min(lon - o.inBox[0], o.inBox[2] - lon, lat - o.inBox[1], o.inBox[3] - lat) / 2.5, 0, 1) : 0;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aE', new THREE.BufferAttribute(aE, 1));
      g.setAttribute('aIn', new THREE.BufferAttribute(aIn, 1));
      const u = {
        uScale: SH.uScale,
        uSize: { value: o.size },
        uMin: { value: o.min },
        uMax: { value: o.max },
        uColor: { value: new THREE.Color(o.color) },
        uAlpha: { value: 0 },
        uInFade: { value: 1 },
      };
      const m = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: u,
        vertexShader:
          'attribute float aE;attribute float aIn;uniform float uScale;uniform float uSize;uniform float uMin;uniform float uMax;uniform float uInFade;varying float vA;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vec3 n=normalize(normalMatrix*normalize(position));float f=dot(n,normalize(-mv.xyz));vA=smoothstep(0.,.3,f)*(.45+.55*f)*aE*mix(1.,uInFade,aIn);gl_PointSize=clamp(uSize*uScale/-mv.z,uMin,uMax);gl_Position=projectionMatrix*mv;}',
        fragmentShader:
          'uniform vec3 uColor;uniform float uAlpha;varying float vA;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.28,d)*vA*uAlpha;if(a<.01)discard;gl_FragColor=vec4(uColor,a);}',
      });
      const p = new THREE.Points(g, m);
      p.renderOrder = 1;
      globe.add(p);
      return u;
    }
    const dW = dotLayer(geo.dotsW, { size: 0.0095, min: 1.2, max: 6, color: '#8e7bb0', inBox: [-10, 22, 28, 47] });
    const dR = dotLayer(geo.dotsR, { size: 0.0011, min: 1, max: 5, color: '#a28fc6', box: [-10, 22, 28, 47], fade: 3 });
    const dL = dotLayer(geo.dotsL, { size: 0.00036, min: 1, max: 7, color: '#a995cc', box: [5, 29, 14.5, 39.5], fade: 0.8 });

    /* coastlines and borders of the neighbours */
    function lineSet(lines: [number, number][][], col: string) {
      const pos: number[] = [];
      for (const l of lines)
        for (let i = 0; i < l.length - 1; i++) {
          const a = ll(l[i][0], l[i][1], 1.0006);
          const b = ll(l[i + 1][0], l[i + 1][1], 1.0006);
          pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const u = { uColor: { value: new THREE.Color(col) }, uAlpha: { value: 0.4 } };
      globe.add(
        new THREE.LineSegments(
          g,
          new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: u,
            vertexShader:
              'varying float vA;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vec3 n=normalize(normalMatrix*normalize(position));vA=smoothstep(0.,.3,dot(n,normalize(-mv.xyz)));gl_Position=projectionMatrix*mv;}',
            fragmentShader: 'uniform vec3 uColor;uniform float uAlpha;varying float vA;void main(){gl_FragColor=vec4(uColor,uAlpha*vA);}',
          }),
        ),
      );
      return u;
    }
    const lCoast = lineSet(geo.coast, '#b6a2e6');
    const lBorder = lineSet(geo.border, '#e0d3ff');

    /* the 24 governorates: flat fills that change colour by a sweep from the centre, and crisp outlines */
    const capVS = 'varying vec3 vO;varying vec3 vN;void main(){vO=position;vN=normalize(normalMatrix*normalize(position));gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
    const capFS = [
      'uniform vec3 uA;uniform vec3 uB;uniform vec3 uCtr;uniform float uRev;uniform float uSoft;uniform float uHov;varying vec3 vO;varying vec3 vN;',
      'void main(){float a=length(normalize(vO)-uCtr);float m=1.-smoothstep(uRev-uSoft,uRev,a);vec3 col=mix(uA,uB,m);',
      'float fr=exp(-pow((a-uRev)/(uSoft*.8),2.));col+=mix(uB,vec3(1.),.5)*fr*.5;',
      'float lam=max(dot(normalize(vN),normalize(vec3(-.5,.6,.65))),0.);col*=.84+.28*lam;col+=vec3(.1,.08,.15)*uHov;gl_FragColor=vec4(col,1.);}',
    ].join('\n');
    const ribVS =
      'attribute vec3 aDir;attribute float aSide;uniform float uLw;uniform float uPxK;void main(){vec3 p=position;vec3 n=normalize(p);vec3 sd=normalize(cross(aDir,n));vec4 m0=modelViewMatrix*vec4(p,1.);p+=sd*aSide*uLw*.5*uPxK*(-m0.z);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}';
    const ribFS = 'uniform vec3 uLine;uniform float uLa;void main(){gl_FragColor=vec4(uLine,uLa);}';
    const clean = (r: [number, number][]) => {
      const o = r.slice();
      if (o.length > 1 && o[0][0] === o[o.length - 1][0] && o[0][1] === o[o.length - 1][1]) o.pop();
      return o;
    };
    interface Gov {
      c: string;
      n: string;
      ctr: [number, number];
      rad: number;
      radW: number;
      bb: [number, number, number, number];
      rings: [number, number][][];
      U: {
        uA: { value: ThreeNS.Color };
        uB: { value: ThreeNS.Color };
        uCtr: { value: ThreeNS.Vector3 };
        uRev: { value: number };
        uSoft: { value: number };
        uHov: { value: number };
        uLine: { value: ThreeNS.Color };
        uLw: { value: number };
        uLa: { value: number };
        uPxK: { value: number };
      };
      lvl: Level | null;
      rev: number | null;
      lw: number;
      la: number;
      line: ThreeNS.Color;
      lineT: ThreeNS.Color;
      hov: number;
    }
    const govs: Record<string, Gov> = {};
    const govList: Gov[] = [];
    for (const g of geo.gov) {
      const radW = g.rad * D2R;
      const U: Gov['U'] = {
        uA: { value: new THREE.Color(NEUTRAL) },
        uB: { value: new THREE.Color(NEUTRAL) },
        uCtr: { value: ll(g.ctr[0], g.ctr[1], 1).normalize() },
        uRev: { value: 9 },
        uSoft: { value: radW * 0.35 },
        uHov: { value: 0 },
        uLine: { value: new THREE.Color(LINE) },
        uLw: { value: 1 },
        uLa: { value: 0.5 },
        uPxK: SH.uPxK,
      };
      const pos: number[] = [];
      const idxs: number[] = [];
      const rp: number[] = [];
      const rd: number[] = [];
      const rs: number[] = [];
      const ri: number[] = [];
      for (const ring of g.r) {
        const pts = clean(ring);
        if (pts.length < 3) continue;
        const faces = THREE.ShapeUtils.triangulateShape(
          pts.map((p) => new THREE.Vector2(p[0], p[1])),
          [],
        );
        const base = pos.length / 3;
        for (const p of pts) {
          const v = ll(p[0], p[1], 1.0003);
          pos.push(v.x, v.y, v.z);
        }
        for (const f of faces) idxs.push(base + f[0], base + f[1], base + f[2]);
        const n = pts.length;
        for (let i = 0; i < n; i++) {
          const a = ll(pts[i][0], pts[i][1], 1.0003);
          const b = ll(pts[(i + 1) % n][0], pts[(i + 1) % n][1], 1.0003);
          const dir = b.clone().sub(a).normalize();
          const o = rp.length / 3;
          [a, a, b, b].forEach((v, k) => {
            rp.push(v.x, v.y, v.z);
            rd.push(dir.x, dir.y, dir.z);
            rs.push(k % 2 ? 1 : -1);
          });
          ri.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
        }
      }
      const cg = new THREE.BufferGeometry();
      cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      cg.setIndex(idxs);
      const cap = new THREE.Mesh(
        cg,
        new THREE.ShaderMaterial({ uniforms: U, vertexShader: capVS, fragmentShader: capFS, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 4 }),
      );
      cap.renderOrder = 2;
      globe.add(cap);
      const rg = new THREE.BufferGeometry();
      rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
      rg.setAttribute('aDir', new THREE.Float32BufferAttribute(rd, 3));
      rg.setAttribute('aSide', new THREE.Float32BufferAttribute(rs, 1));
      rg.setIndex(ri);
      const rib = new THREE.Mesh(rg, new THREE.ShaderMaterial({ uniforms: U, vertexShader: ribVS, fragmentShader: ribFS, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      rib.renderOrder = 3;
      globe.add(rib);
      const o: Gov = {
        c: g.c,
        n: g.n,
        ctr: g.ctr,
        rad: g.rad,
        radW,
        bb: g.bb,
        rings: g.r.map(clean),
        U,
        lvl: null,
        rev: null,
        lw: 1,
        la: 0.5,
        line: new THREE.Color(LINE),
        lineT: new THREE.Color(LINE),
        hov: 0,
      };
      govs[g.c] = o;
      govList.push(o);
    }

    /* ripples */
    const ripples: ThreeNS.Mesh<ThreeNS.RingGeometry, ThreeNS.MeshBasicMaterial>[] = [];
    function ripple(lon: number, lat: number, hex: string, rW: number, life = 1.7) {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.986, 1, 128),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      const p = ll(lon, lat, 1.0004);
      m.position.copy(p);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), p.clone().normalize());
      m.userData = { t: 0, r: rW, life };
      m.scale.setScalar(1e-4);
      m.renderOrder = 4;
      globe.add(m);
      ripples.push(m);
    }

    /* the foreign notice: an arc that comes in from the north and lands on the coast */
    const A0 = ll(9.7, 45.6, 1);
    const A1 = ll(NOTICE_LANDING.lon, NOTICE_LANDING.lat, 1);
    const arcAt = (t: number) => new THREE.Vector3().copy(A0).lerp(A1, t).normalize().multiplyScalar(1.001 + 0.022 * Math.sin(Math.PI * t));
    const arcP: number[] = [];
    const arcT: number[] = [];
    for (let i = 0; i <= 90; i++) {
      const v = arcAt(i / 90);
      arcP.push(v.x, v.y, v.z);
      arcT.push(i / 90);
    }
    const ag = new THREE.BufferGeometry();
    ag.setAttribute('position', new THREE.Float32BufferAttribute(arcP, 3));
    ag.setAttribute('aT', new THREE.Float32BufferAttribute(arcT, 1));
    const arcU = { uProg: { value: 0 }, uAlpha: { value: 0 } };
    globe.add(
      new THREE.Line(
        ag,
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: arcU,
          vertexShader: 'attribute float aT;varying float vT;void main(){vT=aT;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
          fragmentShader:
            'uniform float uProg;uniform float uAlpha;varying float vT;void main(){float on=step(vT,uProg);float tail=smoothstep(uProg-.55,uProg,vT);gl_FragColor=vec4(vec3(.91,.77,.42)*(.35+.65*tail),uAlpha*on*(.25+.75*tail));}',
        }),
      ),
    );
    const packet = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1c4, transparent: true, opacity: 0, depthWrite: false }));
    globe.add(packet);
    const arc = { on: false, t0: 0, landed: false };

    /* labels */
    const labels = govList.map((g) => {
      const e = document.createElement('div');
      e.className = 'glabel';
      e.textContent = g.n;
      glabels.appendChild(e);
      return { g, e, w: 0, h: 0 };
    });
    const tnLab = document.createElement('div');
    tnLab.className = 'glabel big';
    tnLab.textContent = texts.country;
    glabels.appendChild(tnLab);
    let tnH = 0;
    const measure = () => {
      for (const l of labels) {
        l.w = l.e.offsetWidth;
        l.h = l.e.offsetHeight;
      }
      tnH = tnLab.offsetHeight;
    };

    /* camera */
    function faceQuat(lon: number, lat: number) {
      const P = ll(lon, lat, 1).normalize();
      const q1 = new THREE.Quaternion().setFromUnitVectors(P, new THREE.Vector3(0, 0, 1));
      const Nn = new THREE.Vector3(0, 1, 0);
      Nn.sub(P.clone().multiplyScalar(Nn.dot(P))).normalize().applyQuaternion(q1);
      return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(Nn.x, Nn.y)).multiply(q1);
    }
    let W = 2;
    let H = 2;
    let mobile = false;
    let dMul = 1;
    const cur = { q: faceQuat(STOPS[0].lon, STOPS[0].lat), d: STOPS[0].d, pitch: 0, head: 0 };
    let F = { q0: cur.q.clone(), q1: cur.q.clone(), d0: cur.d, d1: cur.d, p0: 0, p1: 0, h0: 0, h1: 0, bump: 0, zin: true };
    function fly(s: Stop, instant: boolean) {
      const lon = s.lon + (mobile ? 0 : s.shift);
      const q1 = faceQuat(lon, s.lat);
      const d1 = s.d * (s.kind === 'start' ? 1 : dMul);
      F = { q0: cur.q.clone(), q1, d0: cur.d, d1, p0: cur.pitch, p1: mobile ? s.pitch * 0.8 : s.pitch, h0: cur.head, h1: s.head, bump: 0, zin: true };
      const ang = F.q0.angleTo(q1);
      const lnR = Math.log(d1 / F.d0);
      const mid = ang * 5;
      F.bump = mid > Math.max(F.d0, d1) ? Math.max(0, Math.log(mid) - (Math.log(F.d0) + Math.log(d1)) / 2) : 0;
      F.zin = lnR < 0;
      flightDur = instant || (ang < 1e-3 && Math.abs(lnR) < 0.02) ? 0 : clamp(760 + 380 * Math.abs(lnR) + 450 * F.bump, 700, 2100);
      // The first descent from space to the country is quick: Tunisia is in focus within seconds.
      if (s.kind === 'notice' && !looped && F.d0 > 2) flightDur = instant ? 0 : 1050;
    }
    const qDrag = new THREE.Quaternion();
    const idQ = new THREE.Quaternion();
    const par = { x: 0, y: 0 };
    const parT = { x: 0, y: 0 };
    function resize() {
      W = Math.max(2, hero.clientWidth);
      H = Math.max(2, hero.clientHeight);
      renderer.setSize(W, H, false);
      cam.aspect = W / H;
      mobile = W <= 1100;
      dMul = mobile ? (W / H < 0.8 ? 1.9 : 1.35) : 1;
      const fx = mobile ? 0.5 : 0.64;
      const fy = mobile ? 0.3 : 0.46;
      cam.setViewOffset(W, H, -(fx - 0.5) * W, -(fy - 0.5) * H, W, H);
      cam.updateProjectionMatrix();
      const k = Math.tan((cam.fov * D2R) / 2);
      SH.uScale.value = (H * DPR) / (2 * k);
      SH.uPxK.value = (2 * k) / H;
      measure();
      coSize = null;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(hero);
    observers.push(ro);
    resize();

    /* levels */
    function levels(map: Record<string, Level>) {
      for (const g of govList) {
        const lv = map[g.c] ?? null;
        if (lv === g.lvl) continue;
        g.lvl = lv;
        g.U.uA.value.copy(g.U.uB.value);
        g.U.uB.value.set(lv ? HEX[lv] : NEUTRAL);
        g.U.uRev.value = 0;
        g.rev = RM ? null : performance.now();
        if (RM) {
          g.U.uA.value.copy(g.U.uB.value);
          g.U.uRev.value = 9;
        }
      }
    }
    let focus: Record<string, true> = {};
    let rippleAcc = 0;
    function arrive(s: Stop) {
      focus = {};
      for (const a of s.anchors ?? []) if (a.gov) focus[a.gov] = true;
      if (s.notice) {
        arc.on = true;
        arc.t0 = performance.now();
        arc.landed = false;
        arcU.uProg.value = 0;
      } else arc.on = false;
      rippleAcc = 9;
    }
    const anchorLL = (a: Anchor): [number, number] => {
      if (a.gov && govs[a.gov]) return govs[a.gov].ctr;
      return [a.lon ?? 0, a.lat ?? 0];
    };

    /* pointer: drag, hover, click */
    let mouse: { x: number; y: number } | null = null;
    let down: { x: number; y: number; id: number } | null = null;
    let dragging = false;
    let lastDrag = 0;
    let lx = 0;
    let ly = 0;
    let hov: Gov | null = null;
    on(canvas, 'pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, id: e.pointerId };
      lx = e.clientX;
      ly = e.clientY;
      dragging = false;
    });
    on(canvas, 'pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
      parT.x = mouse.x / W - 0.5;
      parT.y = mouse.y / H - 0.5;
      if (!down || e.pointerId !== down.id) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      if (!dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) {
        dragging = true;
        canvas.classList.add('drag');
        try {
          canvas.setPointerCapture(down.id);
        } catch {
          /* the pointer may already be gone */
        }
      }
      if (dragging) {
        const k = SH.uPxK.value * cur.d * 1.1;
        qDrag
          .premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * k))
          .premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * k));
        lastDrag = performance.now();
      }
    });
    // A click on a governorate that has a step of its own jumps to that step.
    const stepOf = (code: string) => STOPS.findIndex((s) => s.kind === 'report' && s.focus[0] === code);
    const up = () => {
      if (down && !dragging && hov) {
        const j = stepOf(hov.c);
        if (j >= 0 && STOPS[idx].focus[0] !== hov.c) go(j, true);
      }
      down = null;
      dragging = false;
      canvas.classList.remove('drag');
      lastDrag = performance.now();
    };
    on(canvas, 'pointerup', up);
    on(canvas, 'pointercancel', up);
    on(canvas, 'pointerleave', () => {
      mouse = null;
      parT.x = parT.y = 0;
    });
    const ray = new THREE.Raycaster();
    const sphere = new THREE.Sphere(new THREE.Vector3(), 1);
    const hit = new THREE.Vector3();
    const inv = new THREE.Matrix4();
    const ndc = new THREE.Vector2();
    const inRing = (p: [number, number], r: [number, number][]) => {
      let c = false;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [xi, yi] = r[i];
        const [xj, yj] = r[j];
        if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    function pick(): Gov | null {
      if (!mouse || dragging) return null;
      ray.setFromCamera(ndc.set((mouse.x / W) * 2 - 1, -((mouse.y / H) * 2 - 1)), cam);
      if (!ray.ray.intersectSphere(sphere, hit)) return null;
      inv.copy(globe.matrixWorld).invert();
      const o = hit.clone().applyMatrix4(inv).normalize();
      const lat = Math.asin(o.y) / D2R;
      const lon = Math.atan2(-o.z, o.x) / D2R;
      for (const g of govList) {
        if (lon < g.bb[0] || lon > g.bb[2] || lat < g.bb[1] || lat > g.bb[3]) continue;
        for (const r of g.rings) if (inRing([lon, lat], r)) return g;
      }
      return null;
    }

    /* projection to the hero's pixels */
    const tv = new THREE.Vector3();
    const tc = new THREE.Vector3();
    function proj(lon: number, lat: number, r = 1.001) {
      tv.copy(ll(lon, lat, r)).applyMatrix4(globe.matrixWorld);
      const n = tv.clone().normalize();
      const face = n.dot(tc.copy(cam.position).sub(tv).normalize());
      tv.project(cam);
      return { x: (tv.x * 0.5 + 0.5) * W, y: (-tv.y * 0.5 + 0.5) * H, f: face };
    }

    /* the card sits next to the place it describes, never over the text column */
    function placeCallout(s: Stop) {
      if (!s.anchors) return;
      if (!coSize) coSize = { w: callout.offsetWidth, h: callout.offsetHeight };
      const pts = s.anchors.map((a) => {
        const p = anchorLL(a);
        return proj(p[0], p[1]);
      });
      const vis = pts.every((p) => p.f > 0.05);
      coWrap.style.opacity = vis ? '' : '0';
      leader.style.opacity = vis ? '' : '0';
      let ax = 0;
      let ay = 0;
      let mx = -1e9;
      for (const p of pts) {
        ax += p.x;
        ay += p.y;
        mx = Math.max(mx, p.x);
      }
      ax /= pts.length;
      ay /= pts.length;
      let gap = s.gap ?? 70;
      s.anchors.forEach((a, i) => {
        if (a.gov && s.anchors!.length === 1 && govs[a.gov]) {
          const g = govs[a.gov];
          const e = proj(g.ctr[0] + g.rad / Math.cos(g.ctr[1] * D2R), g.ctr[1]);
          gap = Math.max(gap, Math.min(Math.hypot(e.x - pts[i].x, e.y - pts[i].y) * 0.8 + 34, 300));
        }
      });
      const cw = coSize.w;
      const ch = coSize.h;
      const cr = copyEl.getBoundingClientRect();
      const hr = hero.getBoundingClientRect();
      const copyRight = cr.right - hr.left;
      const copyTop = cr.top - hr.top;
      const top = 86;
      const bottom = (mobile ? copyTop : H - 168) - ch - 10;
      if (!coSide) {
        if (mobile) coSide = 'b';
        else if (mx + gap + cw <= W - 20) coSide = 'r';
        else if (ax - gap - cw >= copyRight + 20) coSide = 'l';
        else coSide = 'b';
        callout.style.setProperty('--tox', coSide === 'r' ? '0%' : coSide === 'l' ? '100%' : '50%');
      }
      let x: number;
      let y: number;
      if (coSide === 'r') {
        x = (s.anchors.length > 1 ? mx : ax) + gap;
        y = clamp(ay - 38, top, Math.max(top, bottom));
      } else if (coSide === 'l') {
        x = ax - gap - cw;
        y = clamp(ay - 38, top, Math.max(top, bottom));
      } else {
        x = clamp(ax - cw / 2, 16, W - 16 - cw);
        y = clamp(ay + Math.min(gap, 90), top, Math.max(top, bottom));
      }
      coWrap.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      coBox = { x, y, w: cw, h: ch };
      const paths = leadG.querySelectorAll('path');
      const ads = leadG.querySelectorAll('.ad');
      const ars = leadG.querySelectorAll('.ar');
      pts.forEach((p, i) => {
        let d: string;
        if (coSide === 'r') {
          const tx = x;
          const ty = y + 36;
          d = `M${p.x.toFixed(1)} ${p.y.toFixed(1)}L${(tx - 26).toFixed(1)} ${ty.toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}`;
        } else if (coSide === 'l') {
          const tx = x + cw;
          const ty = y + 36;
          d = `M${p.x.toFixed(1)} ${p.y.toFixed(1)}L${(tx + 26).toFixed(1)} ${ty.toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}`;
        } else {
          d = `M${p.x.toFixed(1)} ${p.y.toFixed(1)}L${(x + cw / 2).toFixed(1)} ${y.toFixed(1)}`;
        }
        paths[i]?.setAttribute('d', d);
        for (const c of [ads[i], ars[i]]) {
          c?.setAttribute('cx', p.x.toFixed(1));
          c?.setAttribute('cy', p.y.toFixed(1));
        }
      });
    }

    if (!RM)
      on(hero, 'pointermove', (e) => {
        if (e.target === canvas) return;
        const r = hero.getBoundingClientRect();
        parT.x = (e.clientX - r.left) / W - 0.5;
        parT.y = (e.clientY - r.top) / H - 0.5;
      });

    let last = performance.now();
    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      tourTick(now);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!visible || document.hidden) return;
      const s = STOPS[idx];

      /* flight */
      const p = flightDur > 0 ? clamp((now - tStart) / flightDur, 0, 1) : 1;
      if (p >= 1 && !arrived) {
        arrived = true;
        onArrive();
      }
      let er: number;
      let ez: number;
      if (F.bump > 0) er = ez = easeIO(p);
      else if (F.zin) {
        er = easeIO(Math.min(1, p * 1.3));
        ez = easeIO(p);
      } else {
        ez = easeIO(Math.min(1, p * 1.3));
        er = easeIO(clamp((p - 0.22) / 0.78, 0, 1));
      }
      cur.q.copy(F.q0).slerp(F.q1, er);
      let d = Math.exp(lerp(Math.log(F.d0), Math.log(F.d1), ez) + F.bump * Math.sin(Math.PI * p));
      const pitch = lerp(F.p0, F.p1, ez) * (1 - 0.6 * Math.sin(Math.PI * p) * Math.min(1, F.bump));
      let head = lerp(F.h0, F.h1, er);
      if (arrived && !RM) {
        const push = easeOut(Math.min(1, (now - tStart - flightDur) / 4500));
        d *= 1 - 0.07 * push;
        head += 0.03 * push;
      }
      cur.d = d;
      cur.pitch = pitch;
      cur.head = head;

      /* orientation: parallax, drag, heading, place */
      if (!dragging && now - lastDrag > 1400) qDrag.slerp(idQ, 1 - Math.exp(-dt * 1.6));
      if (!RM) {
        par.x += (parT.x - par.x) * (1 - Math.exp(-dt * 2.5));
        par.y += (parT.y - par.y) * (1 - Math.exp(-dt * 2.5));
      }
      const pk = SH.uPxK.value * d * H * 0.035;
      const qP = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(par.y * pk + Math.sin(now / 2600) * pk * 0.08, par.x * pk * 1.3 + Math.cos(now / 3100) * pk * 0.08, 0),
      );
      const qH = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), head);
      globe.quaternion.copy(qP).multiply(qDrag).multiply(qH).multiply(cur.q);

      cam.position.set(0, -Math.sin(pitch) * d, 1 + Math.cos(pitch) * d);
      cam.up.set(0, 1, 0);
      cam.lookAt(0, 0, 1);
      cam.near = Math.max(0.0004, d * 0.12);
      cam.far = 90;
      cam.updateProjectionMatrix();
      globe.updateMatrixWorld(true);
      cam.updateMatrixWorld(true);

      /* atmosphere, stars, graticule, dot levels, lines */
      const Dc = cam.position.length();
      const R = 1 / Math.sqrt(Math.max(1 - 1 / (Dc * Dc), 1e-4));
      atm.lookAt(cam.position);
      atmU.uR.value = R;
      atmU.uS.value = R * 2.2;
      atmU.uK.value = smooth(0.9, 2.2, d);
      starM.opacity = 0.6 * smooth(1, 2.4, d);
      bodyU.uG10.value = 0.09 * smooth(0.22, 0.6, d);
      bodyU.uG1.value = 0.1 * smooth(0.03, 0.08, d) * (1 - smooth(0.3, 0.7, d));
      bodyU.uG025.value = 0.09 * (1 - smooth(0.03, 0.07, d));
      const regionA = smooth(2.4, 1.3, d);
      dW.uAlpha.value = 0.9 * smooth(0.42, 0.9, d);
      dW.uInFade.value = 1 - regionA;
      dR.uAlpha.value = 0.85 * regionA * smooth(0.045, 0.1, d);
      dL.uAlpha.value = 0.8 * smooth(0.3, 0.14, d);
      const la = smooth(0.06, 0.16, d);
      lCoast.uAlpha.value = 0.38 * la;
      lBorder.uAlpha.value = 0.5 * la;

      /* hover */
      const h = pick();
      if (h !== hov) {
        hov = h;
        canvas.classList.toggle('pointy', !!(h && stepOf(h.c) >= 0));
      }
      if (hov && mouse) {
        const lvl = hov.lvl;
        tip.innerHTML = `${esc(hov.n)}<span>${esc(lvl ? texts.levels[lvl] : texts.noReport)}</span>`;
        tip.style.setProperty('--tc', lvl ? HEX[lvl] : 'var(--none-s)');
        tip.style.transform = `translate(${mouse.x + 16}px,${mouse.y + 14}px)`;
        tip.classList.add('on');
      } else tip.classList.remove('on');

      /* governorates: sweep, outline, hover */
      const notice = s.notice && arc.landed;
      const k = 1 - Math.exp(-dt * 6);
      for (const g of govList) {
        if (g.rev !== null) {
          const t = clamp((now - g.rev) / 1100, 0, 1);
          g.U.uRev.value = easeOut(t) * (g.radW * 1.5 + g.U.uSoft.value);
          if (t >= 1) {
            g.rev = null;
            g.U.uA.value.copy(g.U.uB.value);
            g.U.uRev.value = 9;
          }
        }
        const f = focus[g.c] && arrived;
        const lwT = f ? 2.4 : notice ? 1.5 : 1;
        const laT = f ? 1 : notice ? 0.8 : 0.5;
        g.lineT.set(f ? '#ffffff' : notice ? HEX.watch : LINE);
        g.lw += (lwT - g.lw) * k;
        g.la += (laT - g.la) * k;
        g.line.lerp(g.lineT, k);
        g.U.uLw.value = g.lw;
        g.U.uLa.value = g.la;
        g.U.uLine.value.copy(g.line);
        g.hov += ((hov === g ? 1 : 0) - g.hov) * k;
        g.U.uHov.value = g.hov;
      }

      /* foreign notice arc */
      if (arc.on) {
        const at = clamp((now - arc.t0) / 700, 0, 1);
        const ae = easeIO(at);
        arcU.uProg.value = ae;
        arcU.uAlpha.value = Math.min(1, at * 4) * (1 - smooth(0.9, 1, at) * 0.35);
        packet.position.copy(arcAt(ae));
        packet.scale.setScalar(SH.uPxK.value * d * 3.2);
        packet.material.opacity = at < 1 ? 1 : 0;
        if (at >= 1 && !arc.landed) {
          arc.landed = true;
          ripple(NOTICE_LANDING.lon, NOTICE_LANDING.lat, HEX.watch, SH.uPxK.value * d * 70, 1.6);
        }
      } else {
        arcU.uAlpha.value *= Math.exp(-dt * 6);
        packet.material.opacity = 0;
      }

      /* ripples on the place in focus */
      rippleAcc += dt;
      if (arrived && rippleAcc > 1.7 && !RM) {
        rippleAcc = 0;
        if (s.kind === 'start') ripple(9.6, 34, CITRON, SH.uPxK.value * d * 46, 1.9);
        else if (s.anchors && !s.notice)
          for (const a of s.anchors) {
            const qq = anchorLL(a);
            const g = a.gov ? govs[a.gov] : null;
            ripple(qq[0], qq[1], HEX[s.level], Math.max(g ? g.radW * 0.95 : 0, SH.uPxK.value * d * 44), 1.8);
          }
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const m = ripples[i];
        m.userData.t += dt / m.userData.life;
        const t = m.userData.t as number;
        if (t >= 1) {
          globe.remove(m);
          m.geometry.dispose();
          m.material.dispose();
          ripples.splice(i, 1);
          continue;
        }
        m.scale.setScalar(m.userData.r * (0.12 + 0.88 * easeOut(t)));
        m.material.opacity = 0.55 * Math.pow(1 - t, 1.6) * Math.min(1, t * 8);
      }

      /* labels: governorate names when close, the country's name from space */
      const hb = hero.getBoundingClientRect();
      const cb = copyEl.getBoundingClientRect();
      const showNames = 1 - smooth(0.11, 0.24, d);
      const copyR = cb.right - hb.left;
      const copyT = cb.top - hb.top;
      for (const l of labels) {
        if (showNames < 0.02 || focus[l.g.c]) {
          l.e.style.opacity = '0';
          continue;
        }
        const qq = proj(l.g.ctr[0], l.g.ctr[1]);
        const hidden =
          qq.f < 0.1 ||
          qq.x < 20 ||
          qq.x > W - 20 ||
          qq.y < 70 ||
          qq.y > H - 160 ||
          (!mobile && qq.x - l.w / 2 < copyR + 24) ||
          (mobile && qq.y + l.h / 2 > copyT - 8) ||
          (coOn &&
            coBox !== null &&
            qq.x + l.w / 2 > coBox.x - 8 &&
            qq.x - l.w / 2 < coBox.x + coBox.w + 8 &&
            qq.y + l.h / 2 > coBox.y - 8 &&
            qq.y - l.h / 2 < coBox.y + coBox.h + 8);
        if (hidden) {
          l.e.style.opacity = '0';
          continue;
        }
        l.e.style.opacity = (showNames * smooth(0.1, 0.35, qq.f)).toFixed(3);
        l.e.style.transform = `translate(${(qq.x - l.w / 2).toFixed(1)}px,${(qq.y - l.h / 2).toFixed(1)}px)`;
      }
      const tnA = smooth(1.1, 2, d) * (s.kind === 'start' ? 1 : 0);
      if (tnA > 0.01) {
        const tq = proj(9.6, 34);
        tnLab.style.opacity = tnA.toFixed(3);
        tnLab.style.transform = `translate(${(tq.x + 18).toFixed(1)}px,${(tq.y - tnH / 2).toFixed(1)}px)`;
      } else tnLab.style.opacity = '0';

      if (s.anchors) placeCallout(s);
      renderer.render(scene, cam);
    }

    const clearRipples = () => {
      for (const m of ripples) m.userData.t = Math.max(m.userData.t, 0.82);
    };
    G = {
      fly: (s, instant) => {
        clearRipples();
        fly(s, instant);
      },
      levels,
      arrive,
    };
    raf = requestAnimationFrame(() => {
      canvas.classList.add('ready');
      raf = requestAnimationFrame(frame);
    });

    cleanupGl = () => {
      glabels.replaceChildren();
      scene.traverse((o) => {
        const m = o as ThreeNS.Mesh;
        m.geometry?.dispose();
        const mat = m.material as ThreeNS.Material | ThreeNS.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }

  /* start: the globe from space, then straight down to Tunisia */
  function startTour() {
    if (RM) {
      go(1, true);
      playing = false;
      syncPlay();
    } else go(0, false);
  }
  function fallback() {
    page.classList.add('nogl');
    G = null;
    go(1, true);
    const f = (n: number) => {
      tourTick(n);
      if (!arrived) {
        arrived = true;
        onArrive();
      }
      raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
  }
  const hasWebGL2 = () => {
    try {
      return !!document.createElement('canvas').getContext('webgl2');
    } catch {
      return false;
    }
  };

  renderRail();
  syncPlay();
  if (hasWebGL2()) {
    Promise.all([import('three'), fetch(geoUrl).then((r) => (r.ok ? (r.json() as Promise<Geo>) : Promise.reject(new Error(String(r.status)))))])
      .then(([THREE, geo]) => {
        if (disposed) return;
        STOPS = buildStops(input, geo);
        try {
          initGlobe(THREE, geo);
          startTour();
        } catch (err) {
          console.error(err);
          cleanupGl?.();
          cleanupGl = null;
          fallback();
        }
      })
      .catch(() => {
        if (!disposed) fallback();
      });
  } else fallback();

  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    ac.abort();
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
    observers.forEach((o) => o.disconnect());
    cleanupGl?.();
    page.classList.remove('nogl');
  };
}
