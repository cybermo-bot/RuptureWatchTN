'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// The home page's wrapper: scopes its palette and fonts (.rwl, components/landing/landing.css) and
// runs the small motions below the first screen. Everything is rendered on the server and readable
// without JavaScript; these effects only animate what is already there. With reduced motion,
// nothing moves: blocks are shown as they are and counters show their value.

export function LandingRoot({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const ac = new AbortController();
    const signal = ac.signal;
    const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hover = window.matchMedia('(hover: hover)').matches;
    const all = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T & Element>(sel)) as T[];
    const observers: IntersectionObserver[] = [];
    const timers: number[] = [];
    const frames = new Set<number>();
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

    /* nav: solid once the page moves, and the reading progress */
    const nav = root.querySelector<HTMLElement>('[data-nav]');
    const prog = root.querySelector<HTMLElement>('[data-progress]');
    const statement = root.querySelector<HTMLElement>('[data-words]');
    const words = statement ? all('[data-words] .sw') : [];
    const onScroll = () => {
      const y = window.scrollY;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (prog) prog.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
      nav?.classList.toggle('solid', y > 40);
      if (statement && words.length) {
        const r = statement.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.4), 0, 1);
        const n = Math.round(p * words.length * 1.08);
        words.forEach((w, i) => w.classList.toggle('on', RM || i < n));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true, signal });
    onScroll();

    /* blocks below the first screen arrive softly as they enter */
    const reveal = (e: Element) => {
      if (e.classList.contains('rv-pre')) {
        e.classList.remove('rv-pre');
        e.classList.add('rv-in');
      }
    };
    const pre = all('[data-rv]').filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.92);
    if (!RM && 'IntersectionObserver' in window) {
      pre.forEach((el) => el.classList.add('rv-pre'));
      const io = new IntersectionObserver(
        (en) =>
          en.forEach((x) => {
            if (x.isIntersecting) {
              reveal(x.target);
              io.unobserve(x.target);
            }
          }),
        { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
      );
      pre.forEach((e) => io.observe(e));
      observers.push(io);
      timers.push(window.setTimeout(() => pre.forEach(reveal), 9000));
    }

    /* figures count up once, from zero to the value already written in the page */
    if (!RM && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (en) =>
          en.forEach((x) => {
            if (!x.isIntersecting) return;
            io.unobserve(x.target);
            const el = x.target as HTMLElement;
            const to = Number(el.dataset.count);
            if (!to) return;
            const t0 = performance.now();
            const step = (now: number) => {
              const p = clamp((now - t0) / 1600, 0, 1);
              el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 4))));
              if (p < 1) frames.add(requestAnimationFrame(step));
            };
            el.textContent = '0';
            frames.add(requestAnimationFrame(step));
          }),
        { threshold: 0.6 },
      );
      all('[data-count]').forEach((c) => io.observe(c));
      observers.push(io);
    }

    /* the level chart draws itself when it comes into view */
    const chart = root.querySelector<HTMLElement>('[data-chart]');
    if (chart) {
      if (RM || !('IntersectionObserver' in window)) chart.classList.add('in');
      else {
        const io = new IntersectionObserver(
          (en) => {
            if (en.some((x) => x.isIntersecting)) {
              chart.classList.add('in');
              io.disconnect();
            }
          },
          { threshold: 0.35 },
        );
        io.observe(chart);
        observers.push(io);
      }
    }

    /* buttons that lean towards the pointer, cards that tilt, a light that follows it */
    if (!RM && hover) {
      all('[data-mag]').forEach((b) => {
        b.addEventListener(
          'pointermove',
          (e) => {
            const r = b.getBoundingClientRect();
            b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px,${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
          },
          { signal },
        );
        b.addEventListener('pointerleave', () => (b.style.transform = ''), { signal });
      });
      all('[data-tilt]').forEach((c) => {
        c.addEventListener(
          'pointermove',
          (e) => {
            const r = c.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            c.style.transform = `perspective(900px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) translateY(-4px)`;
          },
          { signal },
        );
        c.addEventListener('pointerleave', () => (c.style.transform = ''), { signal });
      });
    }
    all('[data-spot]').forEach((c) =>
      c.addEventListener(
        'pointermove',
        (e) => {
          const r = c.getBoundingClientRect();
          c.style.setProperty('--px', `${e.clientX - r.left}px`);
          c.style.setProperty('--py', `${e.clientY - r.top}px`);
        },
        { signal },
      ),
    );

    /* the relief map leans with the pointer */
    const stage = root.querySelector<HTMLElement>('[data-relief]');
    if (stage && !RM) {
      let rx = 54;
      let rz = -18;
      let tx = 54;
      let tz = -18;
      let moving = false;
      const tick = () => {
        rx += (tx - rx) * 0.08;
        rz += (tz - rz) * 0.08;
        stage.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
        stage.style.setProperty('--rz', `${rz.toFixed(2)}deg`);
        if (Math.abs(tx - rx) + Math.abs(tz - rz) > 0.02) frames.add(requestAnimationFrame(tick));
        else moving = false;
      };
      const kick = () => {
        if (!moving) {
          moving = true;
          frames.add(requestAnimationFrame(tick));
        }
      };
      stage.addEventListener(
        'pointermove',
        (e) => {
          const r = stage.getBoundingClientRect();
          tz = -18 + ((e.clientX - r.left) / r.width - 0.5) * 26;
          tx = 54 - ((e.clientY - r.top) / r.height - 0.5) * 18;
          kick();
        },
        { signal },
      );
      stage.addEventListener(
        'pointerleave',
        () => {
          tx = 54;
          tz = -18;
          kick();
        },
        { signal },
      );
    }

    return () => {
      ac.abort();
      observers.forEach((o) => o.disconnect());
      timers.forEach((id) => clearTimeout(id));
      frames.forEach((id) => cancelAnimationFrame(id));
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
