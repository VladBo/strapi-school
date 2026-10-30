# Drupal 7 to Strapi Migration Plan

## Objective

Migrate the content required by the Next.js school site from the production Drupal 7.94 instance into the existing Strapi 5 project. Next.js remains the public presentation layer and Strapi becomes its content source. Preserve publication state, useful legacy URLs, referenced media, and all functional H5P activities. Keep Drupal read-only during final cutover and retain a rollback snapshot.

## Working Environments

- Source replica: `/Users/Vladyslav_Bondarchuk/Work/school/drupal-school`
- Source URL: `http://localhost:8080`
- Target project: `/Users/Vladyslav_Bondarchuk/Work/school/strapi-school`
- Target URL: `http://localhost:1337`
- Frontend project: `/Users/Vladyslav_Bondarchuk/Work/school/nextjs-school`
- Frontend URL: `http://localhost:3000`
- Production snapshots are local-only: Drupal `.env`, `settings.php`, database dump, and `sites/default/files` are ignored by Git.

## Migration Run Status — 2026-09-20

- Preserved all 41 Drupal nodes in an editor export with 124 aliases, 37 public menu links, 48 available managed files, 10 H5P packages, 2 comments, and 3 restricted webform submissions.
- Imported and published 8 article/news records and 23 page-like records in Strapi without replacing existing sample content.
- Uploaded 48 managed files and rewrote migrated rich-text media references. Two obsolete zero-byte managed records were absent from the source filesystem.
- Created 10 draft H5P placeholders linked by legacy ID and package filename. Package import is deferred until Course Presentation and Interactive Book libraries are validated.
- Verified repeatability: an unchanged rerun performs zero content writes and preserves editor changes.
- Activated consolidated Ukrainian header/footer navigation for the migrated class, schedule, methodology, news, exercise, about, and contact content. Added the Next.js page routes and a structured contact map.
- Redirects and H5P package import remain pending.

Start the local source with:

```bash
cd /Users/Vladyslav_Bondarchuk/Work/school/drupal-school
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d mariadb php nginx
```

## Baseline Inventory

| Drupal source | Count | Proposed destination |
|---|---:|---|
| News | 7 published | `Article`, category `news` |
| Article | 1 published | `Article` |
| Basic page | 16 published | New `Page` collection; map Home separately |
| Slides | 5 published | `Homepage.blocks` → slider/slides |
| Address/contact | 1 published | Contact/About block or dedicated single type |
| Webform | 1; 3 submissions | Rebuild form; archive submissions separately |
| H5P content | 9 published, 1 draft | `H5P Content` |
| Managed files | 50 records, ~58 MB | Strapi Media Library |
| Full files tree | 5,207 files, ~448 MB | Only originals/references; exclude derivatives/cache |
| Users | 33 | Do not migrate passwords; create authors/admins explicitly |
| Comments | 2 | Archive or omit after owner review |
| URL aliases | 124 | Redirect manifest for Next.js |
| Public menu links | 28 main, 6 footer, 3 services | Header/footer menu components |

Drupal language metadata is unreliable: Ukrainian content is labeled `ru` or `en`. Treat visible language as Ukrainian by default and audit exceptions instead of copying source codes blindly.

The target is not empty: it currently contains 9 articles, 2 authors, 10 categories, 4 courses, 4 tags, and 7 H5P entries. Most appear to be sample/test content. Back up Strapi first, then classify each target record as `keep`, `replace`, or `delete`; never match records by title alone.

## Required Target Changes

1. Add a `Page` collection type with `title`, unique `slug`, rich-text blocks, SEO, publication state, and optional menu metadata.
2. Add migration keys to migrated collections: `legacyNid` (unique integer), `legacyPath`, `legacyUpdatedAt`, and `sourceLocale`. These make reruns idempotent.
3. Add equivalent legacy identifiers to `H5P Content`, or maintain a durable migration ledger keyed by Drupal NID.
4. Decide whether the existing `Course` records are editorial products or replacements for grade pages. Default: keep grade pages as `Page` records.
5. Fix the `Article.tags` relation if tags will be used—it currently targets `Category`, not `Tag`. Drupal has zero tag terms, so this does not block the first import.
6. Add redirects to Next.js for every retained Drupal alias and high-value system path.
7. Enable Strapi i18n only if multilingual authoring is actually required; otherwise normalize all migrated content to Ukrainian.
8. Add frontend routes for the migrated page model and any required listing pages. Next.js currently implements `/`, `/about`, `/articles/[slug]`, `/courses/[slug]`, `/quizzes`, and `/quizzes/[id]`, but has no generic page, articles index, courses index, contact, or resources page.
9. Normalize generated links. Current homepage article links use `/<slug>` although article detail pages live at `/articles/<slug>`.

## Migration Pipeline

### 1. Back up and freeze baselines

- Export the Strapi PostgreSQL database and `public/uploads`/`public/h5p` directories.
- Retain the validated Drupal SQL dump and synced files snapshot.
- Export inventories from both systems to JSON and record counts/checksums.
- Do not delete existing Strapi sample data until the owner approves the classification report.

### 2. Build idempotent tooling

Create `scripts/migration/` in Strapi with:

- `extract-drupal.php`: emit normalized JSON from the local Drupal replica.
- `transform.mjs`: sanitize HTML, map node types, normalize locales and paths, and produce manifests.
- `import.mjs`: upsert by `legacyNid`; upload media by SHA-256; preserve draft/published status.
- `verify.mjs`: compare counts, titles, mappings, media hashes, relations, and HTTP responses.
- `state.json`: source ID → Strapi document/media ID mapping, checksums, status, and errors.

Support `--dry-run`, `--limit`, `--type`, and `--resume`. A rerun with unchanged input must produce zero writes.

### 3. Migrate reference data and media

- Create the migration author/category records first.
- Upload only files referenced by migrated content; do not upload Drupal thumbnails, caches, temporary files, or obsolete H5P build artifacts.
- Preserve alt text, filenames, MIME type, and source URI in the ledger.
- Rewrite `public://` URLs and internal `node/<nid>` links after all destination IDs are known.

### 4. Migrate standard content

- Import news/article nodes into `Article` with rich-text blocks and media relations.
- Import basic pages into `Page`; transform the Drupal Home node into the `Homepage` single type.
- Render migrated pages through a Next.js catch-all or `/pages/[slug]` route, then map approved legacy aliases to their canonical public URLs.
- Convert slides into the homepage slider while preserving order, image, title, body, and link.
- Map Contact/Address content into the agreed target component.
- Convert main/services menus into nested header links and footer links. Remove duplicate legacy `d7/*`, `<front>`, `blog`, and broken paths only after editorial review.
- Rebuild the contact form in Next.js/Strapi. Treat the three historical submissions as potentially personal data and archive them outside the CMS unless retention is required.

### 5. Migrate H5P as a separate workstream

Drupal uses `H5P.CoursePresentation` 1.21/1.22/1.25 and `H5P.InteractiveBook` 1.2. Strapi currently has neither main library installed. Next.js plays H5P with `h5p-standalone` through `/api/h5p/[contentId]` and `/api/h5p/libraries` proxies.

The verified baseline renders an existing `H5P.MultiChoice` activity at `/quizzes/[documentId]`. Strapi can also read it through `/api/h5p/params/:contentId`; the separate `/api/h5p/play/:contentId` endpoint returns HTTP 500 but is not used by the current frontend. Either fix that endpoint or formally remove it from the supported path before release.

1. Package two pilot items from Drupal as standards-compliant `.h5p` archives, including dependencies and content files.
2. Add a secured bulk-import endpoint or CLI around `@lumieducation/h5p-server`; the existing plugin has editor/save APIs but no purpose-built bulk `.h5p` importer.
3. Install and validate exact required libraries before importing content. Prefer supported upgrades only after confirming that parameters migrate cleanly.
4. Import the two pilots, test edit/save in Strapi, and test playback and interaction through Next.js `/quizzes/[documentId]`.
5. Import the remaining eight items, preserving the one draft.
6. Reconcile database records with filesystem content. Strapi currently has 7 H5P records but 9 content directories, indicating orphaned test storage that should be reviewed after backup.

### 6. Validate and cut over

- Require exact source-to-target mappings for 8 article/news nodes, 16 pages, 5 slides, 10 H5P items, and all approved menu links.
- Require zero missing referenced media and zero broken internal links.
- Compare rendered pages and every H5P interaction on desktop and mobile.
- Verify titles, slugs, publication state, timestamps, Ukrainian text, SEO fields, and redirects.
- Run `npm run type` and `npm run build` in Next.js, then smoke-test `/`, `/about`, `/articles/[slug]`, all new page/listing routes, and `/quizzes/[documentId]` against the migrated Strapi data.
- Run a final delta export after a short Drupal content freeze, then switch the Next.js data source/routes.
- Keep Drupal read-only for an agreed rollback window. Roll back by restoring the Strapi database/files snapshot and routing traffic back to Drupal.

## Security Gates

- Never commit `.env`, SQL dumps, `settings.php`, user files, API tokens, or migration exports containing personal data.
- Do not migrate Drupal password hashes into Strapi.
- Protect migration endpoints with an API token and localhost/network restrictions.
- Before staging or production use, secure the H5P plugin routes: create, update, delete, library install, cache update, AJAX upload, and save are currently configured with `auth: false`.
- Rotate temporary tokens after cutover and remove migration-only endpoints.

## Definition of Done

The migration is complete when the import is repeatable, validation reports no unmapped required records or broken assets, all ten H5P items render and remain editable, approved redirects work, Strapi/Next.js smoke tests pass, and rollback has been rehearsed from the retained snapshots.
