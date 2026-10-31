# Stateless Strapi R2 Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Strapi safe on ephemeral sleeping compute by persisting Media Library and H5P data directly in Cloudflare R2, moving PostgreSQL to Neon, and producing independently scheduled weekly backups with a rehearsed restore path.

**Architecture:** A small provider-neutral `ObjectStore` port is implemented with the AWS SDK v3 against R2. Two Lumi-compatible adapters persist H5P content and libraries under stable R2 prefixes while temporary editor uploads stay local; Strapi's official S3 upload provider handles Media Library assets. A dry-run-first migration CLI copies and verifies local data, and a GitHub Actions workflow snapshots Neon plus live object prefixes into a private backup bucket.

**Tech Stack:** Strapi 5.25, Node.js 20, `@lumieducation/h5p-server` 10.0.4, AWS SDK v3, Cloudflare R2, Neon PostgreSQL, Next.js, GitHub Actions, Node test runner, Docker/Render.

**Spec:** `docs/superpowers/specs/2026-10-25-r2-stateless-strapi-design.md`

## Global Constraints

- Preserve all existing content and the ten verified Drupal H5P mappings; never delete source files during migration.
- Keep local filesystem storage as the default for development; enable object storage only with `STORAGE_DRIVER=s3` and complete configuration.
- Keep H5P limits at 96 MiB total and 64 MiB per file.
- Persist only `media/`, `h5p/libraries/`, and `h5p/content/`; never upload or back up `h5p/temp-files`.
- Keep database dumps, R2 credentials, Neon URLs, encryption private keys, `.env` files, and backup artifacts out of Git.
- Preserve one draft H5P item and nine published items.
- Public H5P routes are read-only; every editor, upload, save, install, update, and delete route requires Strapi admin authentication.
- All CLIs are dry-run by default and require `--apply` for writes; migration CLIs never delete destination objects.
- Backup deletion is restricted to the private backup bucket's dated `snapshots/` prefix.
- Do not cut over or destroy DigitalOcean until a disposable restore passes.

## Review Focus

- Reject absolute keys, backslashes, empty segments, and `..` traversal before any object-store operation; Task 1 tests every form.
- Correctly paginate listings and prefix deletion beyond 1,000 objects without crossing the requested prefix; Tasks 1 and 9 test multi-page inputs.
- Do not update Strapi media rows when any required object upload or verification fails; Task 7 tests partial-failure behavior.
- Preserve byte ranges including `bytes=0-`, bounded ranges, invalid ranges, and 206 response headers through Strapi and Next.js; Tasks 4 and 8 test these cases.
- A failed database dump, encryption, object snapshot, or upload verification must fail the weekly workflow before retention runs; Task 9 tests and encodes this order.

---

### Task 1: S3-Compatible Object Store Foundation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/plugins/h5p/server/src/storage/object-store.mjs`
- Create: `src/plugins/h5p/server/src/storage/object-store.test.js`
- Create: `src/plugins/h5p/server/src/storage/memory-object-store.test-helper.js`

**Interfaces:**
- Consumes: AWS SDK v3 `S3Client`, command classes, and `Upload`.
- Produces: `normalizeObjectKey(...parts)`, `createS3ObjectStore(options)`, and the async methods `put`, `get`, `head`, `exists`, `list`, `delete`, and `deletePrefix`.

- [ ] **Step 1: Install version-compatible dependencies**

Run: `npm install @aws-sdk/client-s3 @aws-sdk/lib-storage @strapi/provider-upload-aws-s3@5.25.0`

Expected: lockfile resolves one AWS SDK v3 family and the upload provider matches Strapi 5.25.

- [ ] **Step 2: Write failing object-store contract tests**

Test `normalizeObjectKey` rejection of `/absolute`, `../escape`, `a\\b`, and empty keys; test paginated listing, `Range: bytes=0-99`, not-found mapping, multipart upload delegation, and prefix-scoped batched deletion using an injected fake S3 client.

- [ ] **Step 3: Run the test and verify RED**

Run: `node --test src/plugins/h5p/server/src/storage/object-store.test.js`

Expected: FAIL because `object-store.mjs` does not exist.

- [ ] **Step 4: Implement `createS3ObjectStore(options)`**

Accept `{ client, createUpload, bucket, prefix }`; normalize every relative key before adding the configured prefix, consume every continuation token, convert S3 bodies to Node `Readable` streams, and return `{ key, size, etag, contentType, lastModified, stream }` where applicable.

- [ ] **Step 5: Run tests and build**

Run: `node --test src/plugins/h5p/server/src/storage/object-store.test.js && npm run build`

Expected: all object-store tests and the Strapi build pass.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/plugins/h5p/server/src/storage
git commit -m "feat(storage): add S3 object store"
```

### Task 2: R2 H5P Content Storage

**Files:**
- Create: `src/plugins/h5p/server/src/storage/r2-content-storage.mjs`
- Create: `src/plugins/h5p/server/src/storage/r2-content-storage.test.js`

**Interfaces:**
- Consumes: Task 1 object store with prefix `h5p/content` and Lumi `IContentStorage` semantics.
- Produces: `createR2ContentStorage({ store, createContentId? })` implementing `addContent`, `addFile`, `contentExists`, `deleteContent`, `deleteFile`, `fileExists`, `getFileStats`, `getFileStream`, `getMetadata`, `getParameters`, `getUsage`, `listContent`, `listFiles`, and `sanitizeFilename`.

- [ ] **Step 1: Write failing content-storage contract tests**

Cover JSON metadata/parameter round trips, explicit and generated IDs, file streaming and byte ranges, list operations, dependency usage counts, filename sanitization, missing objects, and deletion limited to `h5p/content/<contentId>/`.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test src/plugins/h5p/server/src/storage/r2-content-storage.test.js`

Expected: FAIL because `r2-content-storage.mjs` does not exist.

- [ ] **Step 3: Implement the complete Lumi content contract**

Store `h5p.json` and `content.json` beside asset paths under each content ID. Generate a collision-checked unsigned 32-bit ID with at most five attempts. Map missing objects to H5P-compatible 404 errors and preserve streams without buffering large videos.

- [ ] **Step 4: Run focused and foundation tests**

Run: `node --test src/plugins/h5p/server/src/storage/object-store.test.js src/plugins/h5p/server/src/storage/r2-content-storage.test.js`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/plugins/h5p/server/src/storage/r2-content-storage.mjs src/plugins/h5p/server/src/storage/r2-content-storage.test.js
git commit -m "feat(h5p): persist content in object storage"
```

### Task 3: R2 H5P Library Storage

**Files:**
- Create: `src/plugins/h5p/server/src/storage/r2-library-storage.mjs`
- Create: `src/plugins/h5p/server/src/storage/r2-library-storage.test.js`

**Interfaces:**
- Consumes: Task 1 object store with prefix `h5p/libraries` and Lumi `ILibraryStorage` semantics.
- Produces: `createR2LibraryStorage({ store, cache? })` implementing the complete required `ILibraryStorage` interface and optional `listAddons`.

- [ ] **Step 1: Write failing library-storage contract tests**

Cover add/get/update/delete, restricted and additional metadata in `_storage.json`, file streams/stats/languages, installed-library filtering, patch updates, dependency counts including editor-dependency cycles, addon listing, multi-page object listings, and cache invalidation after writes.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test src/plugins/h5p/server/src/storage/r2-library-storage.test.js`

Expected: FAIL because `r2-library-storage.mjs` does not exist.

- [ ] **Step 3: Implement the complete Lumi library contract**

Use Lumi `LibraryName`/`InstalledLibrary` representations. Keep H5P's `library.json` unchanged, persist storage-only fields in `_storage.json`, exclude that file from `listFiles`, and cache parsed metadata only for the current process.

- [ ] **Step 4: Run the storage suite**

Run: `node --test src/plugins/h5p/server/src/storage/*.test.js`

Expected: all storage tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/plugins/h5p/server/src/storage/r2-library-storage.mjs src/plugins/h5p/server/src/storage/r2-library-storage.test.js
git commit -m "feat(h5p): persist libraries in object storage"
```

### Task 4: Storage Driver Wiring, Range Serving, and Health

**Files:**
- Create: `src/plugins/h5p/server/src/storage/h5p-storage-factory.mjs`
- Create: `src/plugins/h5p/server/src/storage/h5p-storage-factory.test.js`
- Create: `src/plugins/h5p/server/src/services/h5p-file-response.mjs`
- Create: `src/plugins/h5p/server/src/services/h5p-file-response.test.js`
- Modify: `src/plugins/h5p/server/src/services/h5p.ts`
- Modify: `src/plugins/h5p/server/src/controllers/h5p.ts`
- Modify: `src/plugins/h5p/server/src/types.ts`
- Create: `src/api/health/controllers/health.ts`
- Create: `src/api/health/routes/health.ts`
- Create: `src/api/health/services/health-check.mjs`
- Create: `src/api/health/services/health-check.test.js`

**Interfaces:**
- Consumes: Task 2 and 3 adapters, local Lumi filesystem adapters, `STORAGE_DRIVER`, H5P S3 config, and HTTP `Range` headers.
- Produces: `createH5PStorages(config)`, `parseByteRange(header, size)`, driver-neutral H5P file responses, and `GET /api/health/storage`.

- [ ] **Step 1: Write failing factory and range tests**

Assert local mode creates filesystem storage, S3 mode requires all bucket settings, temporary storage always remains local, open/bounded/invalid ranges resolve correctly, and the health check fails if either database or object-store reads fail.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test src/plugins/h5p/server/src/storage/h5p-storage-factory.test.js src/plugins/h5p/server/src/services/h5p-file-response.test.js src/api/health/services/health-check.test.js`

Expected: FAIL because the factory and range helper do not exist.

- [ ] **Step 3: Wire storage instances into `H5PEditor` and `H5PPlayer`**

Keep references to the selected library and content storage in service state. Replace filesystem path reads in `getLibraryFile` and `getContentFile` with adapter calls; return stream, MIME type, total size, range, and status metadata. Keep core/editor bundle reads local.

- [ ] **Step 4: Add range-aware controller responses and read-only health checks**

Return `206`, `Accept-Ranges`, `Content-Range`, and correct `Content-Length` for valid ranges; return `416` for invalid ranges. Health performs `select 1` and a non-mutating bucket/list check without exposing configuration.

- [ ] **Step 5: Run tests, existing H5P tests, and build**

Run: `node --test src/plugins/h5p/server/src/storage/*.test.js src/plugins/h5p/server/src/services/*.test.js && npm run build`

Expected: all tests and build pass in default filesystem mode.

- [ ] **Step 6: Commit**

```bash
git add src/plugins/h5p/server/src/storage src/plugins/h5p/server/src/services src/plugins/h5p/server/src/controllers/h5p.ts src/plugins/h5p/server/src/types.ts src/api/health
git commit -m "feat(h5p): select durable storage driver"
```

### Task 5: Separate Public Playback from Authenticated Editing

**Files:**
- Create: `src/plugins/h5p/server/src/routes/admin.mjs`
- Create: `src/plugins/h5p/server/src/routes/content-api.mjs`
- Create: `src/plugins/h5p/server/src/routes/routes.test.js`
- Modify: `src/plugins/h5p/server/src/routes/index.ts`
- Modify: `src/plugins/h5p/server/src/services/h5p.ts`
- Modify: `src/plugins/h5p/admin/src/components/h5p-editor-field.tsx`

**Interfaces:**
- Consumes: shared Task 4 storage instances and two H5P configurations: admin base `/h5p`, public player base `/api/h5p`.
- Produces: authenticated admin editor routes and read-only public playback routes.

- [ ] **Step 1: Write failing route-boundary tests**

Assert that public routes contain only GET playback/asset endpoints; `save`, AJAX POST, library install/upload, cache mutation, and H5P CRUD exist only under `type: "admin"` with `admin::isAuthenticatedAdmin`.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test src/plugins/h5p/server/src/routes/routes.test.js`

Expected: FAIL because the current content API exposes unauthenticated writes.

- [ ] **Step 3: Split editor and player route/config models**

Instantiate editor URLs with `/h5p`, retain player URLs at `/api/h5p`, move the initial admin fetch to `/h5p/editor-model/new`, and keep shared storage instances. Do not change Next.js public playback URLs.

- [ ] **Step 4: Run route tests and build**

Run: `node --test src/plugins/h5p/server/src/routes/routes.test.js && npm run build`

Expected: route tests pass and the admin bundle compiles.

- [ ] **Step 5: Manually verify authentication locally**

Run unauthenticated `POST /api/h5p/save` and authenticated admin editor save.

Expected: public POST is 404/405; logged-in editor save succeeds; public H5P playback remains 200.

- [ ] **Step 6: Commit**

```bash
git add src/plugins/h5p/server/src/routes src/plugins/h5p/server/src/services/h5p.ts src/plugins/h5p/admin/src/components/h5p-editor-field.tsx
git commit -m "fix(h5p): require admin auth for editor writes"
```

### Task 6: R2 Media Library Configuration

**Files:**
- Create: `config/storage-config.mjs`
- Create: `config/storage-config.test.js`
- Modify: `config/plugins.ts`
- Modify: `config/middlewares.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `STORAGE_DRIVER`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_LIVE_BUCKET`, and `ASSET_BASE_URL`.
- Produces: `buildUploadConfig(env)` for the official Strapi S3 provider with root path `media`, plus CSP/CORS asset-origin values.

- [ ] **Step 1: Write failing configuration tests**

Assert local mode returns no external upload provider, S3 mode rejects incomplete credentials, uses `forcePathStyle: false`, `region: "auto"` by default, `rootPath: "media"`, and stores the stable asset base URL rather than the API endpoint.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test config/storage-config.test.js`

Expected: FAIL because `storage-config.mjs` does not exist.

- [ ] **Step 3: Implement upload provider and security configuration**

Configure `@strapi/provider-upload-aws-s3` only in S3 mode, add the asset origin to `img-src`, `media-src`, and `connect-src`, and document placeholders without real values in `.env.example`.

- [ ] **Step 4: Run config tests and build**

Run: `node --test config/storage-config.test.js && npm run build`

Expected: tests and build pass without S3 environment variables.

- [ ] **Step 5: Commit**

```bash
git add config package.json package-lock.json .env.example
git commit -m "feat(media): configure R2 upload storage"
```

### Task 7: Dry-Run-First Persistent Storage Migration

**Files:**
- Create: `scripts/storage/migrate-to-object-storage.js`
- Create: `scripts/storage/migrate-to-object-storage.mjs`
- Create: `scripts/storage/migrate-to-object-storage.test.js`
- Modify: `package.json`
- Create locally only: `migration-artifacts/<date>/object-storage-migration-report.json`

**Interfaces:**
- Consumes: local `public/uploads`, `public/h5p/libraries`, `public/h5p/content`, Strapi `plugin::upload.file` rows, and Task 1 object store.
- Produces: `buildMigrationPlan`, `executeMigrationPlan`, verified R2 objects, reconciled media rows, and an auditable JSON report.

- [ ] **Step 1: Write failing migration tests**

Cover default dry-run, exclusion of temp files, SHA-256 metadata, identical-object skipping, conflicting-object failure, interrupted upload behavior, no database updates before all required objects verify, resumable reruns, and zero delete operations.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test scripts/storage/migrate-to-object-storage.test.js`

Expected: FAIL because the migration modules do not exist.

- [ ] **Step 3: Implement planner and executor**

Map Media Library files to `media/<filename>` and H5P files to their existing relative layout. Upload with SHA-256 metadata, verify by `head`, then update media `provider` and stable URL fields only after the entire upload phase succeeds. Emit orphan/conflict details and retain the local source.

- [ ] **Step 4: Add CLI and package command**

Add `storage:migrate`; require explicit `--apply`, accept `--resume-report`, and reject `--apply` unless S3 configuration is complete.

- [ ] **Step 5: Run tests and a real local dry-run**

Run: `node --test scripts/storage/migrate-to-object-storage.test.js && npm run storage:migrate -- --report ../migration-artifacts/<date>/object-storage-migration-report.json`

Expected: tests pass; dry-run reports uploads for `uploads`, `h5p/libraries`, and `h5p/content`, excludes `temp-files`, and performs zero writes.

- [ ] **Step 6: Commit**

```bash
git add scripts/storage package.json package-lock.json
git commit -m "feat(storage): add idempotent R2 migration"
```

### Task 8: Preserve H5P Streaming Through Next.js

**Files:**
- Create: `../nextjs-school/lib/h5p-proxy.mjs`
- Create: `../nextjs-school/lib/h5p-proxy.test.js`
- Modify: `../nextjs-school/app/api/h5p/[contentId]/[...path]/route.ts`
- Modify: `../nextjs-school/app/api/h5p/libraries/[...path]/route.ts`
- Modify: `../nextjs-school/package.json`

**Interfaces:**
- Consumes: Strapi asset responses with status, stream body, `Content-Type`, `Content-Length`, `Accept-Ranges`, `Content-Range`, and ETag.
- Produces: `proxyH5PFile({ request, upstreamUrl, fetchImpl })` that forwards ranges and streams responses without `arrayBuffer()` buffering.

- [ ] **Step 1: Write failing proxy tests**

Assert forwarding of `Range`, preservation of 200/206/404 status, streaming body identity, video range headers, safe cache headers, and omission of unrelated upstream headers.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test lib/h5p-proxy.test.js`

Expected: FAIL because `h5p-proxy.mjs` does not exist.

- [ ] **Step 3: Implement and use the streaming proxy**

Replace duplicated buffered logic in both routes with `proxyH5PFile`. Immutable library files may use one-year caching; content files use revalidation-friendly caching because editors can replace them under the same key.

- [ ] **Step 4: Run tests, typecheck, and build**

Run: `node --test lib/h5p-proxy.test.js && npm run type && npm run build`

Expected: all pass.

- [ ] **Step 5: Commit in the Next.js repository**

```bash
git add lib/h5p-proxy.mjs lib/h5p-proxy.test.js app/api/h5p package.json
git commit -m "fix(h5p): stream ranged object responses"
```

### Task 9: Weekly Private Backup Workflow

**Files:**
- Create: `scripts/backup/snapshot-objects.mjs`
- Create: `scripts/backup/backup-policy.mjs`
- Create: `scripts/backup/backup-policy.test.js`
- Create: `scripts/backup/verify-backup.mjs`
- Create: `.github/workflows/weekly-backup.yml`
- Create: `docs/operations/backup-and-restore.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: direct Neon URL; read-only live R2 credentials; private backup R2 credentials; Task 1 object-store behavior.
- Produces: `snapshots/<UTC timestamp>/database.dump`, copied object prefixes, `manifest.json`, `SHA256SUMS`, verification result, and `planRetention(snapshots, policy)`.

- [ ] **Step 1: Write failing snapshot and retention tests**

Cover streamed cross-client copy, SHA-256/size verification, paginated live listings, four weekly plus three month-end retention, stale incomplete snapshot cleanup, prefix-scoped deletion plans, and failure before retention when any copy or verification fails.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test scripts/backup/backup-policy.test.js`

Expected: FAIL because the backup modules do not exist.

- [ ] **Step 3: Implement object snapshot, manifest verification, and retention planning**

Copy only `media/`, `h5p/libraries/`, and `h5p/content/` through separate source and destination clients. Write a completion marker last. Keep deletion behind `--apply-retention` and restrict it to complete dated snapshots.

- [ ] **Step 4: Implement the scheduled workflow**

Run weekly and via `workflow_dispatch`: install PostgreSQL client, create a custom-format dump, require `pg_restore --list` success, snapshot objects, upload the plaintext dump and metadata to the private backup bucket, and verify uploaded checksums. Keep the bucket private and restrict its credentials because the dump is unencrypted. Apply four-week/three-month retention and clean incomplete snapshots older than seven days after verification; store every credential as a GitHub Actions secret.

- [ ] **Step 5: Document backup and manual restore**

Include secret names, least-privilege token scopes, database restore, isolated object-prefix restore, validation queries, and the rule that production restore is never automatic. State that dumps are plaintext in a private bucket, and retention may be enabled only after two verified backup runs and one disposable restore rehearsal.

- [ ] **Step 6: Run tests and validate workflow syntax**

Run: `node --test scripts/backup/backup-policy.test.js && npm run build`

Expected: tests/build pass; workflow has no literal secrets and orders dump → validate → snapshot → verify → retention.

- [ ] **Step 7: Commit**

```bash
git add scripts/backup .github/workflows/weekly-backup.yml docs/operations/backup-and-restore.md package.json package-lock.json
git commit -m "feat(backup): add weekly private snapshots"
```

### Task 10: Render and Neon Deployment, Migration, and Restore Rehearsal

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `render.yaml`
- Create: `config/database-options.mjs`
- Create: `config/database-options.test.js`
- Modify: `config/database.ts`
- Create: `docs/operations/render-neon-r2-deployment.md`
- Modify locally only: `migration-artifacts/<date>/object-storage-migration-report.json`
- Modify locally only: `migration-artifacts/<date>/restore-rehearsal-report.md`

**Interfaces:**
- Consumes: Tasks 1–9, Render environment variables, Neon pooled/direct URLs, two R2 buckets/tokens, stable asset domain, and retained DigitalOcean snapshots.
- Produces: reproducible container deployment, verified production migration, successful weekly backup, and a disposable restore report.

- [ ] **Step 1: Write failing database configuration tests**

Assert Neon runtime uses the pooled URL, production SSL defaults to enabled with explicit override, pool defaults remain conservative for sleeping compute, and backup documentation requires the direct URL.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test config/database-options.test.js`

Expected: FAIL because `database-options.mjs` does not exist.

- [ ] **Step 3: Implement deployment artifacts**

Use a Node 20 multi-stage image, run `npm ci` and `npm run build`, start with `npm start`, exclude secrets/artifacts from Docker context, configure Render Free health checks at `/api/health/storage`, and declare secret environment variables with `sync: false`.

- [ ] **Step 4: Verify locally**

Run: `node --test config/database-options.test.js && npm run build && docker build -t strapi-school:r2 .`

Expected: tests, build, and container image succeed without production credentials.

- [ ] **Step 5: Commit deployment files**

```bash
git add Dockerfile .dockerignore render.yaml config/database.ts config/database-options.mjs config/database-options.test.js docs/operations/render-neon-r2-deployment.md
git commit -m "chore(deploy): prepare stateless Strapi runtime"
```

- [ ] **Step 6: Stop for external provisioning authority**

Provision Neon, R2 buckets/custom domain/tokens, Render, and GitHub secrets only with the owner's active account access. Do not print credentials or save them in files.

- [ ] **Step 7: Run pre-cutover backups and object migration**

Execute the migration CLI in dry-run, then `--apply`; compare object counts, bytes, SHA-256 metadata, Strapi media rows, database size, and all ten H5P mappings. Retain all local and DigitalOcean source copies.

- [ ] **Step 8: Deploy and smoke-test**

Verify admin login over HTTPS, Media Library create/read/delete, H5P editor save, library installation, health checks, homepage/pages/articles, quiz listing, all nine public H5P activities, the draft 404, and video seeking after a full Render/Neon cold start.

- [ ] **Step 9: Run backup and disposable restore rehearsal**

Manually dispatch the weekly workflow, restore its database dump into a disposable Neon branch or local PostgreSQL, restore objects under an isolated prefix/bucket, and compare database/object manifests plus representative Media and all H5P playback.

- [ ] **Step 10: Record evidence and hold rollback window**

Write exact commit IDs, service URLs without secrets, counts, checksums, timings, failures, and restore commands into the local reports. Keep DigitalOcean read-only until the owner explicitly approves shutdown.
