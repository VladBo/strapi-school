# Drupal H5P Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import the ten preserved Drupal `.h5p` packages into local Strapi, install only package-required libraries, connect imported payloads to the existing migration placeholders, and verify playback without copying Drupal's legacy H5P filesystem.

**Architecture:** The local migration CLI calls a small package-import method in the H5P plugin. Lumi's supported upload-and-save flow validates each archive, installs dependencies, moves content files from temporary storage into `public/h5p`, and returns the new content ID. The CLI updates Strapi records by unique `legacyNid`, remains dry-run by default, and records an auditable JSON report.

**Tech Stack:** Strapi 5.25, Node.js 20, `@lumieducation/h5p-server` 10.0.4, PostgreSQL, Node test runner.

**Spec:** `DRUPAL-TO-STRAPI-MIGRATION-PLAN.md`

## Global Constraints

- Preserve all existing uncommitted changes and all current Strapi content.
- Never modify or delete the Drupal source packages during import.
- Default to dry-run; require `--apply` for database or filesystem writes.
- Match target records only by unique `legacyNid`, never by title.
- Preserve the source publication state: nine published records and one draft.
- Do not copy the old Drupal `h5p/libraries` tree; install dependencies from the ten packages.
- Keep database dumps, `.h5p` packages, upload trees, and credentials out of Git.

## Review Focus

- A missing, unreadable, or invalid package must fail that item without updating its placeholder.
- A rerun after successful import must skip the item and create no duplicate H5P content.
- A package whose manifest NID does not have exactly one placeholder must not be imported.
- If H5P storage succeeds but the Strapi update fails, the report must expose the orphaned content ID for recovery.
- The draft Drupal item must remain unpublished while the other nine become published only after playback validation.

---

### Task 1: Package Manifest and Idempotent Import Planning

**Files:**
- Create: `scripts/migration/import-drupal-h5p.js`
- Create: `scripts/migration/import-drupal-h5p.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `migration-input.json`, its `h5p` entries, and H5P placeholders queried by `legacyNid`.
- Produces: `validatePackageEntry(entry, exportRoot)`, `planH5pImports(entries, records)`, and the `migration:h5p` npm command.

- [x] **Step 1: Write failing tests for package validation, missing placeholders, already imported records, duplicate NIDs, and draft/published plans.**
- [x] **Step 2: Run `node --test scripts/migration/import-drupal-h5p.test.js`; expect failures for missing exports.**
- [x] **Step 3: Implement the pure validation and planning functions, exporting them without booting Strapi when the file is imported by tests.**
- [x] **Step 4: Run the test file; expect all tests to pass.**
- [x] **Step 5: Add `migration:h5p` to `package.json` and run it without `--apply`; expect a ten-item dry-run and no writes.**

### Task 2: H5P Package Import Service

**Files:**
- Modify: `src/plugins/h5p/server/src/services/h5p.ts`
- Create: `src/plugins/h5p/server/src/services/h5p-import.test.js`

**Interfaces:**
- Consumes: `importPackage(packagePath: string, user?: H5PUser | null)`.
- Produces: `{ id, library, metadata, parameters, installedLibraries }` after `uploadPackage` and `saveOrUpdateContent` complete.

- [x] **Step 1: Write a failing contract test asserting that upload happens before save, the main library version comes from package metadata, and incomplete metadata is rejected.**
- [x] **Step 2: Run the contract test; expect failure because `importPackage` does not exist.**
- [x] **Step 3: Implement `importPackage` using Lumi's `uploadPackage` followed by `saveOrUpdateContent`; do not use the deprecated permanent package-import method.**
- [x] **Step 4: Run the contract test and `npm run build`; expect both to pass.**

### Task 3: Transaction-Aware Strapi Migration CLI

**Files:**
- Modify: `scripts/migration/import-drupal-h5p.js`
- Modify: `scripts/migration/import-drupal-h5p.test.js`

**Interfaces:**
- Consumes: Task 1 plan entries and Task 2 `importPackage` results.
- Produces: updated `api::h5p-content.h5p-content` documents and `h5p-import-report.json` containing status, content ID, installed libraries, and recoverable orphan IDs.

- [x] **Step 1: Write failing tests for dry-run, successful updates, rerun skipping, per-item failures, and orphan reporting.**
- [x] **Step 2: Run tests; expect the new execution cases to fail.**
- [x] **Step 3: Implement sequential import, update `h5pContent`, set `migrationStatus: imported`, and defer publication until verification.**
- [x] **Step 4: Run tests and a real dry-run against local PostgreSQL; expect ten planned imports and zero writes.**

### Task 4: Backup, Pilot Import, and Full Verification

**Files:**
- Create locally only: `migration-artifacts/2026-10-25/backups/*`
- Create locally only: `migration-artifacts/2026-10-25/h5p-import-report.json`
- Modify: `migration-artifacts/2026-10-24/RECOVERY-REPORT.md`
- Modify: `../nextjs-school/lib/cache.ts`
- Modify: `../nextjs-school/app/api/invalidate/route.ts`

**Interfaces:**
- Consumes: the completed CLI and the ten preserved packages.
- Produces: restorable pre-import database/files snapshots and a verified source-to-target mapping.

- [x] **Step 1: Dump PostgreSQL and archive `public/h5p`; verify both artifacts before importing.**
- [x] **Step 2: Import one Course Presentation and one Interactive Book pilot, then verify content params and required files.**
- [x] **Step 3: Test both pilots through Next.js `/quizzes/[documentId]`; require successful asset requests and visible interactive content.**
- [x] **Step 4: Import the remaining eight packages and verify all ten mappings, source titles, libraries, and publication intent.**
- [x] **Step 5: Publish the nine source-published documents, retain the one source draft, and rerun the CLI to prove zero duplicate writes.**
- [x] **Step 6: Run Strapi build, Next.js type/build checks, and smoke-test the quiz listing and every migrated activity.**
- [x] **Step 7: Update the recovery report with exact backup paths, counts, failures, and restore commands.**

### Task 5: Object Storage Follow-Up Boundary

**Files:**
- Create later: a separate R2 storage design and implementation plan.

**Interfaces:**
- Consumes: verified local `h5p/libraries` and `h5p/content` layouts.
- Produces: no code in this plan; R2 credentials, storage adapter, CDN URLs, lifecycle rules, and backup bucket remain an independent deployment task.

- [x] **Step 1: Record the verified live object prefixes and required storage operations after local import.**
- [x] **Step 2: Do not begin R2 implementation until the local import is restorable and all ten activities pass.**
