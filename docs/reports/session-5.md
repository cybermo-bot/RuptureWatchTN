# Session 5 report: design, national picture, track B, institutional spaces

Run on `main` (track A), brief `docs/briefs/session-5.md`, parts 1 to 5 in order. Each part is committed and pushed when finished. Deployed site: https://rupturewatch-tn.vercel.app.

This report is written as the session goes. Part 1 (the new design) is on the deployed site; its screenshots are below so the direction can be checked now.

## Part 1: the new design, on the deployed site

Deployed commit `50d825d` (checked with `/api/health`). Screenshots taken on the deployed site, with the part 2 national picture in place, at 360 and 1280 px, in `docs/reports/session-5/`:

| Page | Phone (360) | Desktop (1280) |
| --- | --- | --- |
| Home: live national picture, roles in three groups, scenario, "Comprendre" | [accueil-360](session-5/accueil-360.png) | [accueil-1280](session-5/accueil-1280.png) |
| Coordination: console, key figures with 14-day sparklines, level band over 30 days, map, demand, log | [coordination-360](session-5/coordination-360.png) | [coordination-1280](session-5/coordination-1280.png) |
| Wholesaler | [grossiste-360](session-5/grossiste-360.png) | [grossiste-1280](session-5/grossiste-1280.png) |
| Hospital pharmacy | [hopital-360](session-5/hopital-360.png) | [hopital-1280](session-5/hopital-1280.png) |
| Pharmacy home (phone app: header, bottom tabs, install hint) | [pharmacie-360](session-5/pharmacie-360.png) | [pharmacie-1280](session-5/pharmacie-1280.png) |
| Pharmacy alerts | [pharmacie-alertes-360](session-5/pharmacie-alertes-360.png) | [pharmacie-alertes-1280](session-5/pharmacie-alertes-1280.png) |
| Report, step 1 (large search, progress line) | [signaler-1-recherche-360](session-5/signaler-1-recherche-360.png) | [signaler-1-recherche-1280](session-5/signaler-1-recherche-1280.png) |
| Scenario | [scenario-360](session-5/scenario-360.png) | [scenario-1280](session-5/scenario-1280.png) |
| Public: pharmacies near me (app header, bottom tabs) | [pharmacies-360](session-5/pharmacies-360.png) | [pharmacies-1280](session-5/pharmacies-1280.png) |

What changed, in short:
- **Two families, one identity.** Professional spaces are a console: ink sidebar (`#0B1A16`) with the logo, the role, its organisation and its Simulé badge, the sections with Lucide icons, "Comprendre" and "Changer de rôle"; a top drawer on phones; `#F5F7F6` content with white panels. The pharmacy space and the public pages are a phone app: app header, bottom tab bar (pharmacy: Signaler, Mes médicaments, Alertes, Plus; public: Médicaments, Pharmacies, Ruptures passées), large search, full-width rows, the primary action fixed at the bottom of a flow.
- **Our mark**: an open ring broken at one point, with the dot that escapes it. Sidebar, favicon, app icons and share cards. It replaces the session 3 mark, which was the "probable" shape and could be read as a level.
- **Key figures and charts**, all computed from the event log: medicines at each level with a 14-day sparkline; a level band over 30 days per medicine; reports and demand per day; wholesaler decisions. Server-rendered SVG with `d3-scale`, each with its text equivalent.
- **Live feel**: when a level changes while a dashboard is open, its row and governorates pulse once and a toast says what changed. Reduced motion stops the pulse, never the toast.
- **Report flow**: two taps, a progress line, a confirmation with the level, what the report changed and the count of pharmacies counting up (only from 3, so no small count is ever shown).
- **Home page**: the live national picture first (map filled by the most serious level per governorate, the medicines with their level, each linking to its four views), then "Choisissez un rôle" in three groups with screenshots of each space (`npm run previews:build`), then the scenario, then "Comprendre".

The role previews on the home page were generated before the national picture existed; they are regenerated at the end of the session, when the new roles exist.

## Part 2: national picture

`npm run demo:national` (all `origin = simulated`), on the live project now:

| Medicine (CNAM) | Brands | Category | Level | Rule |
| --- | --- | --- | --- | --- |
| AMLODIPINE | 13 | E | Confirmée | `confirmed_threshold` (23 pharmacies, 13 governorates) |
| TAMOXIFENE | 4 | V | Probable | `single_governorate_cap`: five pharmacies, all in Sfax (gate two) |
| METFORMINE | 11 | E | Sous surveillance | `local_reports_below_threshold`: one pharmacy in Gabès |
| AZATHIOPRINE | 4 | V | Sous surveillance | `foreign_notice_only`: a notice from "Régulateur fictif (démonstration)" alone (gate one) |
| CIPROFLOXACINE | 12 | E | Levée | `delivered_again_cleared`: confirmed in Tunis and Sousse, then delivered again by two pharmacies |

Patient requests on amlodipine (8) and tamoxifen (6). Wholesaler decisions: amlodipine applied (1,200 boxes), tamoxifen not applied with its reason. History from 26 days ago. None of these molecules had any data of its own; the run refuses otherwise.

Fingerprint check on the live project: `db:fingerprint --out`, `demo:national`, `demo:clear`, `db:fingerprint --compare`: "Identical … every table, every row". Same check in `tests/db/demo-national.test.ts` on the real migrations. The picture was then built again for the jury.

Before it, the stray LEVETIRACETAM report (Pharmacie démo F, Sfax, 23 Nov 01:42 UTC) was removed with the sanctioned reset: `npm run verify:clean -- --since 2026-11-23T01:40:00Z --apply` (one report; its signal, one event and six alerts through `reset_molecule_signal`; no tester pharmacy existed).

## Parts 3 to 5

In progress.
