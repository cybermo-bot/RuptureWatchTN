# Redesign follow-up · Photo, wordmark and home link

Branch `codex/rupturewatch-redesign`. [Local preview](http://127.0.0.1:3083/).

- Replaced the generated hero image with a photograph of a pharmacist selecting a medicine from a shelf. The National Cancer Institute published the photograph on Unsplash in 2020. The local 1440 × 960 WebP is about 69 KB. [Photograph](https://unsplash.com/photos/pharmacist-reaching-for-medication-on-shelf-byGTytEGjBo) · [Licence](https://unsplash.com/license)
- Replaced the open ring with a custom joined RW monogram and updated the app icons and share-card mark.
- Changed the shared patient header’s wordmark link from `/medicaments` to `/`. The link identifies the main homepage in French and Arabic. The existing patient end-to-end test now checks navigation back to the homepage from the request answers.
