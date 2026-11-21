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
- **Produced:** `data/reference/governorates-map.json` by `scripts/build-governorate-map.ts`.
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
