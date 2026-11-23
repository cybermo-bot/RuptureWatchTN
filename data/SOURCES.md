# Sources

Every external source used by the product: where it comes from, when it was fetched, under what terms.
Raw files are in `data/raw/` and are never edited by hand. Cleaned files in `data/reference/` are produced by scripts.

## CNAM: medicines covered by the basic scheme, classified VEI

- **Publisher:** Caisse nationale d'assurance maladie (CNAM), Tunisia.
- **Page:** https://www.cnam.nat.tn/espace_ps.jsp, entry "Liste des médicaments couverts par le régime de base classés en VEI (mise à jour le : 06/11/2026)".
- **File:** https://www.cnam.nat.tn/doc/upload/LISTE%20DES%20MEDICAMENTS%20CLASSES%20EN%20VEI%20COUVERTS%20PAR%20LE%20REGIME%20DE%20BASE-06-11-2026.xlsx
- **Saved as:** `data/raw/cnam/LISTE DES MEDICAMENTS CLASSES EN VEI COUVERTS PAR LE REGIME DE BASE-06-11-2026.xlsx`
- **Fetched:** 2026-11-21 00:29 UTC. SHA-256 `d1f2b37cb9c97c53e9066d1934a913437091a82616025346b71f65c08aef1fbb`, 214,026 bytes.
- **Format:** Excel 2007+, one worksheet ("Export Worksheet"), 3,358 data rows, columns `CODE_PCT, NOM_COMMERCIAL, PRIX_PUBLIC, TARIF_REFERENCE, CATEGORIE, DCI, AP`.
- **Terms:** published openly on CNAM's website for health professionals. No licence is stated. Used as public reference information, with attribution to CNAM. No endorsement by CNAM is implied.
- **Note:** the brief named the version of 3 December 2025. It is no longer on the site; this is the version CNAM publishes now.
- **Produced:** `data/reference/cnam-vei-2026-11-06.csv` and `.sample.md` by `scripts/import-catalogue.ts`.

## geoBoundaries: Tunisia, first-level administrative divisions (governorates)

- **Publisher:** geoBoundaries (William & Mary geoLab), gbOpen release, boundary year 2017, source OpenStreetMap (via Wambacher).
- **API record:** https://www.geoboundaries.org/api/current/gbOpen/TUN/ADM1/
- **File:** https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/TUN/ADM1/geoBoundaries-TUN-ADM1_simplified.geojson
- **Saved as:** `data/raw/geoboundaries/geoBoundaries-TUN-ADM1_simplified.geojson`
- **Fetched:** 2026-11-21. SHA-256 `c8961d7e933079295bdec215c4783c93774696f0600419a2f11779d81f8fb885`, 295,118 bytes. 24 features with ISO 3166-2 codes.
- **Licence:** Open Data Commons Open Database License 1.0 (ODbL). Attribution: "© OpenStreetMap contributors, via geoBoundaries". `data/reference/governorates-map.json` is a derived database and is under the same licence.
- **Produced:** `data/reference/governorates-map.json` by `scripts/build-governorate-map.ts`, and `data/reference/governorate-areas.json` by `scripts/build-directory-areas.ts` (track C: for each governorate, its names from the governorates migration, the area-weighted centroid of its outline and its bounding box, used by `/pharmacies` when a visitor picks a governorate).
- **Rejected:** Natural Earth 10m admin-1 (public domain): it has 23 Tunisian units and no Ariana (TN-12).

## ISO 3166-2:TN governorate codes

- **Checked against:** https://en.wikipedia.org/wiki/ISO_3166-2:TN (list of the 24 codes), on 2026-11-21. Used only to verify the codes in `supabase/migrations/20261121000200_reference_data.sql`; no text copied. French names use common usage ("Ariana" where ISO writes "L'Ariana").

## Meta WhatsApp Cloud API documentation (reference, not data)

Read 2026-11-21 for the webhook and send formats:
- https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages
- https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages
- https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids
- https://developers.facebook.com/docs/graph-api/webhooks/getting-started

Test fixtures in `tests/fixtures/whatsapp/` follow the documented example payload.

## OpenStreetMap: map tiles for the fallback patient map, and pharmacy positions checked

- **Publisher:** OpenStreetMap Foundation and contributors.
- **Page:** https://www.openstreetmap.org/copyright
- **Tiles:** https://tile.openstreetmap.org/{z}/{x}/{y}.png, loaded live by the visitor's browser in `components/maps/PatientMap.tsx` only when Google Maps is unavailable, under the OSM tile usage policy (https://operations.osmfoundation.org/policies/tiles/). Nothing is stored.
- **Overpass API:** https://overpass-api.de/api/interpreter, queried on 2026-11-22 for `amenity=pharmacy` near the fictional positions of the demo pharmacies, to keep each at least 150 m from any listed pharmacy. The results were not stored.
- **Licence:** Open Database License 1.0 (ODbL). Attribution "© OpenStreetMap" is shown on the map.
- **Pharmacy list for the directory's fallback (track C):** one Overpass query for `amenity=pharmacy` in Tunisia (`scripts/export-osm-pharmacies.ts`, query in `scripts/lib/osm-pharmacies.ts`). Saved as `data/raw/osm/overpass-pharmacies-<date>.json`; produces `data/reference/osm-pharmacies.json` (name, position, governorate, address, phone, the raw `opening_hours` tag and the regular week read from it with the `opening_hours` library). Shown only when Google Maps is unavailable, with "© OpenStreetMap" under the list. `data/reference/osm-pharmacies.json` is a derived database under the same licence.
- **Fetched:** 2026-11-23 00:26 UTC, by `npm run osm:export` on the team's Windows machine, from the Overpass mirror https://maps.mail.ru/osm/tools/overpass/api/interpreter (overpass-api.de was unreachable from that network, two other mirrors timed out). Raw answer `data/raw/osm/overpass-pharmacies-2026-11-23.json`, 234,839 bytes, SHA-256 `4a3afaa26d202b7bedcf155e97dfc1e859d6dabaf8c2570bd7f2348316fe159e`. 798 pharmacies, all inside a governorate outline; 180 with `opening_hours`, all 180 read; reference week from Sunday 2026-11-29.

## BDPM: base de données publique des médicaments (France)

- **Publisher:** ANSM, HAS and UNCAM, on behalf of the French Ministry of Health.
- **Page:** https://base-donnees-publique.medicaments.gouv.fr/telechargement
- **Files:** https://base-donnees-publique.medicaments.gouv.fr/download/file/CIS_bdpm.txt (products), `CIS_COMPO_bdpm.txt` (substances), `CIS_CPD_bdpm.txt` (conditions of prescription and dispensing), same address. Format: "Contenu et format des fichiers téléchargeables dans la BDM v5", linked from the page.
- **Saved as:** `data/raw/bdpm/` (the three files as downloaded).
- **Fetched:** 2026-11-23 00:13 UTC, by `npm run library:import` on the team's Windows machine.
  - `CIS_bdpm.txt`: 3,167,022 bytes, SHA-256 `97dcd8fc406e1c0bfb969cad6f66bda489eeede1c9910e2813dd65e1ab71d752`
  - `CIS_COMPO_bdpm.txt`: 2,720,142 bytes, SHA-256 `18c2eb506602946b8a5010fd56a5339e6571ba8f76480b62dc751dd26c150716`
  - `CIS_CPD_bdpm.txt`: 1,335,040 bytes, SHA-256 `80fbf7298bc42681e32129980fc31b95f508d6f10b023f930836ecadb42ac8d0`
  - 15,845 products, 15,843 compositions, 12,550 products with at least one condition. 303 of the 548 CNAM molecules matched, 4,182 French products kept.
- **Licence:** Licence Ouverte under article L. 161-40-1 of the code de la sécurité sociale (https://base-donnees-publique.medicaments.gouv.fr/docs/telechargement/licence_bdpm.pdf): data not altered and its meaning not distorted, source and update date cited, no endorsement by the ANSM, the HAS or the UNCAM implied. The Library page cites the source and the download date.
- **Produced:** `data/reference/library-fr.json` by `scripts/import-library.ts`: for each CNAM molecule, the active French products with exactly the same substances (normalised names, no fuzzy matching), and their French conditions of prescription, word for word. French status only, labelled "Statut en France, pas en Tunisie".
