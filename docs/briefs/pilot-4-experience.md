# Pilot 4: one coherent, living interface (session B, part 2)

Branch: `pilot-b`, after `pilot-3`'s commits. Read `CLAUDE.md` (§4, §9), `DESIGN.md`, `docs/briefs/pilot-0-overview.md` (guardrails), then this. Versions: Next 16.4, React 19.3, Tailwind 4.3.

## The problem

The colour tokens are respected, but the structure is not shared: seven header variants, three footers, four page shells with different widths and backgrounds (public pages are white, the others grey), two root layouts, `.panel`, `Panel` and hand-made cards side by side, five corner radii, 11 different `<h1>` styles, 17 pages that write their own `<h1>`, icons in ten sizes, motion timings from 180 ms to 1.2 s, nothing between pages. Only the home page holds together.

## Keep

The current identity: cool neutrals, powder blue, petrol rail, primary `#235c76`, IBM Plex Sans and Mono, the Rw monogram, level colours with their shapes. The home page looks the same after this brief. No new palette, no new font, no Three.js.

## Skills to use (installed in `.claude/skills/`, profile in `.ux-profile.md`)

- **Before each step:** read `.ux-profile.md` and the project skill `rw-design-system` (tokens, components, shells, transitions, text budget, never-list). It is the design authority for this brief, after `CLAUDE.md` and `DESIGN.md`.
- **While building**, load the skill for what you are touching: `page-patterns` (name the pattern of each page before changing its markup), `typography`, `spacing`, `colour-palette`, `viewports` (360 px first), `anti-slop`, `empty-states`, `loaders`, `motion`, `transitions`, `reduced-motion`, `verbs` and `labels` (French copy: verb-first buttons, visible labels), `errors`, `forms`, `keyboard`, `icon-buttons`, `surfaces`, `defaults`.
- **At the end of each step:** run `rw-screen-review` (screenshots at 360 and 1280 px in French and Arabic, look at every image, compare with the home page and a neighbour screen, run `ux-audit`, fix hard-rule failures, look again). Do not commit a step you have not looked at.
- Where a generic skill and this project disagree (for example a different motion token or a different aesthetic default), `CLAUDE.md`, `DESIGN.md`, `rw-design-system` and `.ux-profile.md` win.

## Work in this order; each step leaves the site working

**Order: steps 0, 1, 4, 3, 2, 5, 6.** The pharmacy space and the report-result moment (step 4) come first: they are the key moment of the video. Step 2 (shells and page transitions) is the riskiest and helps the video least; if time runs out, it is the step to lose. Stop cleanly at the end of any step and say where you stopped. Steps 0, 1, 4, 3 are the must; 2, 5, 6 if time allows.

### Step 0. Tokens (nothing should look different)

In `@theme` / `app/globals.css`:

- Type: display `clamp(2.5rem, 4.35vw, 4rem)` (home only); `title-1` 1.5rem (1.75rem from `sm`), line-height 1.15, 600, -0.02em; `title-2` 1.25rem/1.3, 600; `title-3` 1rem/1.4, 600; body 1rem/1.55; small 0.875rem/1.45; eyebrow 0.75rem Mono uppercase 0.06em; `figure` Mono 2rem/1, 500.
- Spacing on 4/8/12/16/24/32/48/64 px. Rows 12×16 px, panels 16 px (20 from `sm`).
- Radii: `--radius-sm` 6 px (inputs, buttons, badges), `--radius-md` 12 px (panels, pictures), `--radius-lg` 22 px (home chapters, the public status hero), `--radius-pill`.
- Motion (aligned with the `motion` skill): `--dur-instant` 100 ms, `--dur-fast` 150, `--dur-base` 200, `--dur-slow` 300; one documented exception `--dur-emph` 600 ms for a chart line drawing itself once (write it in `DECISIONS.md`). `--ease-out` `cubic-bezier(.2,.7,.2,1)` on enter, `--ease-exit` `cubic-bezier(.4,0,1,1)` on exit. Replace the scattered timings with these.
- Shell widths: `--shell-wide` 82rem, `--shell-narrow` 48rem, console 90rem.
- Reduced motion also covers view transitions: `@media (prefers-reduced-motion: reduce) { ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; } }`.
- Clean-up: delete the unused `components/home/HomeStage.tsx`; remove stale "plum" comments; replace the two off-token hex values in `globals.css`.

### Step 1. Shared components (pages untouched)

In `components/ui/` or by extending the existing files, tokens only:

- `PageHeader`: optional eyebrow or meta line, `title-1`, one lead sentence (max 60ch), actions, optional back link, optional picture slot (`FormPicture` at 64–96 px). Replaces the 17 hand-written `<h1>`.
- `Section`: `title-2`, optional eyebrow (Mono uppercase label with a short rule, from Olfa's section rhythm), optional link on the right.
- `ListRow`: leading picture or icon (40–56 px), title, one meta line, a trailing level badge or chevron; at least 56 px tall; hairline separators; hover tints powder blue and the arrow moves 4 px. Replaces `MoleculeRow`, request rows, signal rows, `.home-role-link`.
- `Stat` / `StatRow`: Mono figure, label under it, `<3` kept, never animated (Olfa's `.counts` strip, re-skinned).
- `StatusCard`: the one panel per screen: powder blue, `--radius-md`, large `LevelBadge`, one sentence, origin badge, not-official line.
- `LevelBadge` sizes sm/md/lg. Shapes unchanged.
- `EmptyState` with a slot for a small drawing.
- `Tabs`: the underline style of `PublicNav` (2 px brand bar), state in the URL.
- `BottomBar`: one component for the public and pharmacy tabs; `main` gets `padding-bottom: calc(3.5rem + env(safe-area-inset-bottom))` (fixes the overlap at 375 px).
- `Journal`: dated rows with a dot and a connecting line, the level's shape inside the dot (ported from Olfa's change journal, `LandingNational.tsx` "changes" and `landing.css` `.changes`). Never colour alone.
- `Button`: move the seven hand-made buttons onto `buttonClass` (`PrintButton`, `WhatsAppLinkForm`, `SiteChrome` header button, wholesaler `DecisionForm`, `InstallHint`, coordination export, centrale), all 48 px. Add a `pill` shape used only for the main public and home actions.
- Icons: sizes 16, 20, 24; stroke 1.75 (2.25 when active).
- `FormPicture`: a soft powder-blue tinted square, drawing at 48–56 px in lists and 96 px in page headers. Same drawings (no redraw now). No product photos: a real brand's box next to a simulated level is a rumour, and the rights question is open (`docs/reports/medicine-search-design.md`).

### Step 2. Shells and page transitions

- One header per family built from the same parts: wordmark, 56 px on phones and 64 px on desktop, `--page` background, gutters 16/24/32 px, `PageHeader` and the scales above.
  - Showcase pages (home, scenario, methode, retour, vues, connexion): `SiteHeader` adopts the home masthead's markup and links. The home page must look the same.
  - Public: keep the sticky header and bottom tabs; `PublicMain` gets the `--page` background (today white); `PublicFooter` loses its separate background.
  - Consoles: keep the petrol rail on desktop; one white mobile header for every role (logo mark, organisation name, origin badge, menu button for non-pharmacy roles) replacing the dark one.
- Page transitions. Check the current Next 16 and React 19.3 documentation first, then:
  - Within a root layout: React `<ViewTransition>` around the children of each shell's `<main>` (Next's `experimental.viewTransition` flag in `next.config.ts` if the docs still require it; one line in `DECISIONS.md`). Header, rail and bottom bar get a `view-transition-name` so they stay still. Old page fades out in `--dur-fast`, new page fades in rising 8 px in `--dur-base`. No sideways slides (right-to-left).
  - Shared elements: the product picture and title from a search row to the medicine page header (`product-<code_pct>`), the « Mes médicaments » row to `/pharmacie/molecule/[id]`, a coordination list row to its detail; the `LevelBadge` on the report result (`level-<moleculeId>`) may then replace step 4's CSS animation with a morph, only if it works on the first try. Names unique per page.
  - Between the two root layouts (`(site)` and `(public)`, a full load): `@view-transition { navigation: auto; }` and a named wordmark.
  - If the experimental flag causes any problem (build, type, runtime, a flicker, a broken back button), switch immediately to the fallback, without debugging it: a `template.tsx` per family with an enter-only fade-and-rise. Say so in the report.

### Step 3. Patient screens (convert one at a time)

Search → medicine page → request → answers → pharmacies near me → past shortages. With `PageHeader`, `ListRow`, `StatusCard`, `Section`, half the visible words (details behind « Pourquoi ? » or `<details>`), one honesty signal per status (origin badge, plus the not-official line once). Answers page: a new answer slides into the list and its pin drops on the map. Arabic checked at 360 px on every converted screen.

### Step 4. Pharmacy space

- `/pharmacie` is already the home (report button, open requests, followed medicines, level watcher). Rework it in place as « Aujourd'hui », in this order: patient requests waiting (answer in one tap from here), « Vos médicaments » with levels (changed ones first, « nouveau » since the last visit, a « avis étranger » tag when a foreign notice exists), then a large « Signaler une commande non livrée ». The demo still lands on `/pharmacie/signaler`; testers land here (`pilot-2`).
- Bottom bar: Accueil · Signaler · Demandes · Plus, with pharmacy-specific keys.
- Report result: the check, then « Avant → Après » revealed in sequence (Olfa's staggered callout), and the new level badge fading and scaling in from the old one, all in plain CSS (step 4 runs before step 2, so no view transitions here). This is the video's key moment.
- A new patient request while the page is open: a toast and a single pulse on the « Demandes » badge (the page polls; there is no realtime for requests).
- Every screen readable in three seconds at a counter: one title, one action.

### Step 5. Pharmacie centrale, then coordination

- Centrale: `StatRow`, presentations reported (`pilot-3`), the arrival announcement as one compact block. Keep `#m-<id>` anchors and the « Annoncer un arrivage » / « Annoncer l'arrivage » labels (e2e).
- Coordination: first screen = `StatRow`, map, signal list; the rest under `Tabs` « Signaux », « Demande des patients », « Journal » with the tab in the URL. Keep `section[aria-labelledby="signaux"]` and the `?m=<id>#detail` links. Use `Journal` for level history.

### Step 6. Scenario, then Ordre, hospital, wholesaler

- `/scenario`: a stepper driven by Olfa's `tourStops()` (port `lib/landing/tour.ts` and its test from `origin/olfa` with `git show`), her stepper rail re-skinned (petrol, `--scenario-accent`, `LevelShape`, no glow), her step-curve level chart with `var(--level-*)` instead of hard-coded colours, drawn once.
- Ordre, hospital, wholesaler: shells, `PageHeader`, `ListRow`, buttons. No new features.

## Motion rules (all steps)

Animate only transform and opacity (and background colour for a highlight); at most 12 px of movement; only real state changes; one animated element per interaction; nothing loops except a single pulse on a live change; no animated counters; no scroll hijacking; under reduced motion, nothing or a short opacity fade.

## Not taken from `origin/olfa`

The globe and Three.js, its palette and three fonts, the glass nav, glows, gradient text, marquee, magnetic/tilt/spotlight effects, count-up figures, looping phone demos, blur reveals, its `.panel` override and link-underline removal.

## Done checks per step

`npm run check` green; screenshots at 360 and 1280 px of every changed screen in `docs/reports/pilot-b/`; right-to-left checked on public screens; reduced motion checked; Lighthouse accessibility still 100 where it was; e2e selectors untouched or updated in the same commit and listed.
