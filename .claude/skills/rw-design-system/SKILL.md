---
name: rw-design-system
description: RuptureWatch TN's design system — tokens, shared components, page shells, page transitions and what never to use. Read before creating or editing any screen, component, CSS or interface text in this repository.
---

# RuptureWatch design system

The authority order: `CLAUDE.md` §2 (product rules) > `CLAUDE.md` §9 and `DESIGN.md` > this skill > `.ux-profile.md` > generic UX skills. The top `docs/DECISIONS.md` entry about a plum palette is out of date.

## The one-sentence goal

Every page should look like it belongs to the same product as the home page: same type, same spacing, same header logic, same rows, same motion, and a pharmacist at a counter understands each screen in three seconds.

## Tokens (in `app/globals.css` `@theme`; use them, never raw values)

- Colours: the existing tokens only (`--page`, `--band`, powder blue, petrol, `--brand` `#235c76`, `--level-*`, `--line`, ink and muted ink). No hex in components. No Tailwind palette colours.
- Type: display `clamp(2.5rem, 4.35vw, 4rem)` (home only); `title-1` 1.5rem (1.75rem from `sm`), line-height 1.15, 600, -0.02em; `title-2` 1.25rem/1.3, 600; `title-3` 1rem/1.4, 600; body 1rem/1.55; small 0.875rem/1.45; eyebrow 0.75rem IBM Plex Mono uppercase, 0.06em; `figure` IBM Plex Mono 2rem/1, 500. No literal `text-[…rem]`.
- Spacing: 4, 8, 12, 16, 24, 32, 48, 64 px only. Rows 12×16 px; panels 16 px (20 from `sm`); sections 32 px apart (24 on phones).
- Radii: `--radius-sm` 6 px (inputs, buttons, badges); `--radius-md` 12 px (panels, pictures); `--radius-lg` 22 px (home chapters, public status hero); `--radius-pill` only for the main public and home actions.
- Motion: `--dur-instant` 100 ms (hover), `--dur-fast` 150 ms (press, badges, exits), `--dur-base` 200 ms (pages, panels), `--dur-slow` 300 ms (shared-element morphs). One documented exception: a chart line drawing itself once, 600 ms. Easing `--ease-out` `cubic-bezier(.2,.7,.2,1)` for enter, `--ease-exit` `cubic-bezier(.4,0,1,1)` for exit.
- Shells: `--shell-wide` 82rem, `--shell-narrow` 48rem, console 90rem.
- Icons: Lucide, 16/20/24, stroke 1.75 (2.25 active).

## Shared components (use them; do not hand-build a variant)

| Component | Use for | Notes |
| --- | --- | --- |
| `PageHeader` | every page's title | eyebrow/meta, `title-1`, one lead sentence (max 60ch), actions, back link, optional picture slot (`FormPicture` 64–96 px) |
| `Section` | each block of a page | `title-2`, optional eyebrow with a short rule, optional link right |
| `ListRow` | every list item: medicines, requests, signals, roles | picture or icon 40–56 px, title, one meta line, trailing badge or chevron, ≥56 px, hairline separators, hover tints powder blue and the arrow moves 4 px |
| `Stat`, `StatRow` | key figures | Mono figure, label under, `<3` kept, never animated |
| `StatusCard` | the one panel per screen (the status) | powder blue, `--radius-md`, large `LevelBadge`, one sentence, origin badge, not-official line |
| `LevelBadge` | any level | sizes sm/md/lg; shapes unchanged; always shape + word |
| `EmptyState` | nothing to show | one sentence, one action, small drawing optional |
| `Tabs` | sub-views (coordination) | underline 2 px brand bar; tab in the URL |
| `BottomBar` | public and pharmacy tabs | one component; `main` padding-bottom `calc(3.5rem + env(safe-area-inset-bottom))` |
| `Journal` | level history | dated rows, dot with the level's shape, connecting line |
| `Button` / `buttonClass` | every button | 48 px; variants primary, secondary, quiet, danger; `pill` shape only for main public/home actions |
| `FormPicture` | every product or molecule | soft powder-blue square; 48–56 px in lists, 96 px in headers |

One panel per screen at most. Everything else sits on the page background, separated by space and hairlines, not boxes.

## Page shells

- Showcase family (home, scenario, methode, retour, vues, connexion): `SiteHeader`, which reuses the home masthead's markup and links. The home page must look the same.
- Public family: sticky `PublicHeader`, `BottomBar`, `--page` background (not white), `PublicFooter` without its own background.
- Console family: petrol rail on desktop; one white mobile header for every role (logo mark, organisation, origin badge, menu button for non-pharmacy roles).
- All three share: wordmark, header height 56 px (phone) / 64 px (desktop), gutters 16/24/32 px, `PageHeader`, the scales above.

## Page transitions

- Inside a root layout: React `<ViewTransition>` around the children of each shell's `<main>` (with Next's `experimental.viewTransition` if the current Next 16 docs still require it). Header, rail and bottom bar carry a `view-transition-name` so they stay still. Old page fades out (`--dur-fast`, exit easing); new page fades in rising 8 px (`--dur-base`, enter easing). Never slide sideways.
- Shared elements: `product-<code_pct>` on the picture and title (search row → medicine page header); the « Mes médicaments » row → `/pharmacie/molecule/[id]`; a coordination row → its detail; `level-<moleculeId>` on the report result's `LevelBadge` so it morphs from the old level to the new. Names unique per page.
- Between the `(site)` and `(public)` root layouts: `@view-transition { navigation: auto; }` and a named wordmark.
- Reduced motion: no transition animation (the global rule covers `::view-transition-*`).
- Fallback if the flag misbehaves: `template.tsx` per family with an enter-only fade-and-rise.

## Moments that must feel alive (real state only)

- Report sent: button → check → result; « Avant → Après » revealed in sequence (≤30 ms stagger, ≤200 ms total); level badge morph.
- A level changes while the page is open: the row highlights once; the map governorate fades to its new tint.
- A patient answer arrives: it slides into the list; its pin drops on the map.
- A new patient request while the pharmacy page is open: a toast and one pulse on the « Demandes » badge.

## Text budget

One sentence of explanation per screen; details behind « Pourquoi ? » or `<details>`. One honesty signal per status (origin badge) plus the not-official line once per screen. Molecule names as written in the HTML; small caps only in CSS. These strings survive every cut: the not-official line; « Ne changez pas de marque sans l'avis de votre pharmacien ou de votre médecin. »; the Library's France line; origin badges; Google and OpenStreetMap attribution; « conçu pour »; the CNAM source line; `<3`; the 72-hour explanation; install help under « Plus ».

## Never

Anything on the `.ux-profile.md` banned list; a second header, footer, card or button style; a new colour, font or radius; animated counters; decorative loops; hiding the level shape; inline text instead of message keys; changing `lib/signal/`, `docs/content/` or `core.rules.*`.
