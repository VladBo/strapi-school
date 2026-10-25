# Stateless Strapi with R2 Design

## Intent

Move the small school CMS away from the DigitalOcean droplet without depending on a persistent application filesystem. Next.js remains the public site and continues to use SSG/ISR, so occasional Strapi cold starts are acceptable. Strapi should be cheap enough to run on a free or near-free sleeping compute service while editors retain durable Media Library and H5P content.

The current local baseline is small: PostgreSQL is about 20 MB, `public/uploads` is about 88 MB, H5P libraries are about 30 MB, and H5P content is about 146 MB. The roughly 145 MB `h5p/temp-files` tree is disposable and must not be migrated or backed up.

## Goals

- Run Strapi as a stateless Node.js service on ephemeral compute.
- Store ordinary Strapi uploads and permanent H5P files directly in Cloudflare R2.
- Keep H5P temporary uploads on the ephemeral local filesystem.
- Move PostgreSQL to Neon with scale-to-zero enabled.
- Create an independent weekly backup outside the Strapi process.
- Keep the object-storage boundary portable enough for a later GCP or Azure implementation.
- Preserve the ten migrated H5P activities, including edit, save, playback, range requests, library installation, and deletion.
- Provide tested migration and restore procedures before removing the DigitalOcean source.

## Non-goals

- Multi-region or multi-instance Strapi deployment.
- Persisting H5P temporary files or caches.
- Automatically deleting unused H5P libraries during this migration.
- Supporting simultaneous writes from multiple Strapi instances.
- Automatically restoring production from a backup. Restore remains an explicit, reviewed operation.
- Building GCP and Azure adapters now; only the interface boundary is included.

## Constraints

- Strapi 5.25, Node.js 20, PostgreSQL, and `@lumieducation/h5p-server` 10.0.4 remain in place for this migration.
- H5P package limits remain 96 MiB total and 64 MiB per file.
- Database dumps, bucket credentials, encryption keys, `.env` files, and exported user data never enter Git.
- Public assets must use a stable custom asset domain; raw R2 API endpoints must not be stored in content.
- A failed object write must fail the associated H5P save rather than leave the database claiming that content is durable.
- A failed database update after object writes must be reported as a recoverable orphan.
- The old DigitalOcean site remains available and read-only until a restore rehearsal succeeds.

## Approaches Considered

### Direct object-storage adapters — selected

Implement Lumi's `IContentStorage` and `ILibraryStorage` over a small internal `ObjectStore` interface backed by the AWS SDK v3 and the R2 S3-compatible endpoint. Strapi Media Library uses the matching Strapi S3 upload provider and the same asset domain. Permanent writes are durable as soon as the editor operation completes, and no boot-time download is required.

This is the most implementation work, but it is the only option that makes the application genuinely stateless and avoids a window in which an editor's changes exist only on an ephemeral disk.

### Filesystem restored and synchronized at startup

Download H5P into `public/h5p` during every cold start and synchronize changes back to R2. This reuses the current filesystem adapters but lengthens cold starts and can lose edits if the process exits before synchronization. It also creates ambiguous conflict behavior if a second instance starts. Rejected except as a temporary recovery technique.

### Paid persistent disk

Keep the current filesystem implementation and attach a persistent disk to an always-on or paid service. This is operationally simple but preserves server-local state and does not meet the cost or portability goal. Rejected.

## Target Architecture

```text
Next.js (Vercel, SSG/ISR)
        |
        v
Strapi (sleeping ephemeral compute)
   |                 |
   v                 v
Neon PostgreSQL      Cloudflare R2
                     ├── media/
                     ├── h5p/libraries/
                     └── h5p/content/

GitHub Actions (weekly)
   ├── pg_dump Neon
   ├── snapshot live object prefixes
   ├── validate + checksum + encrypt
   └── private R2 backup bucket
```

The proposed compute target is Render Free because a roughly one-minute cold start is acceptable for this site. The design does not depend on Render APIs: any Node.js container platform that provides environment variables and an ephemeral writable `/tmp` can replace it.

## Object Storage Boundary

Create an `ObjectStore` interface with only the operations required by the two H5P adapters:

- `put(key, stream, metadata?)`
- `get(key, range?)`
- `head(key)`
- `exists(key)`
- `list(prefix)` with pagination
- `delete(key)`
- `deletePrefix(prefix)`

`S3ObjectStore` implements that interface with `@aws-sdk/client-s3` and `@aws-sdk/lib-storage`. Configuration supplies endpoint, region, bucket, credentials, public base URL, and key prefix. R2 is the first implementation. A future GCS or Azure adapter can implement the same interface without changing the H5P storage classes.

Keys retain the current proven filesystem layout:

```text
h5p/content/<contentId>/h5p.json
h5p/content/<contentId>/content.json
h5p/content/<contentId>/<asset path>
h5p/libraries/<machineName>-<major>.<minor>/library.json
h5p/libraries/<machineName>-<major>.<minor>/<library file>
```

All filenames and prefixes are normalized and rejected if they are absolute, contain `..`, use backslashes, or escape their assigned prefix. Delete-prefix operations must paginate until every object is removed.

## H5P Integration

`R2ContentStorage` implements the complete Lumi `IContentStorage` contract. `R2LibraryStorage` implements `ILibraryStorage`. Both are injected into the existing `H5PEditor` and `H5PPlayer` during service initialization when `H5P_STORAGE_DRIVER=s3`; local development continues to default to filesystem storage.

H5P metadata and `content.json` remain ordinary JSON objects in R2. Library metadata is cached in memory for the lifetime of a Strapi process using Lumi's caching wrapper or a small bounded cache. Large content files support HTTP ranges so video seeking keeps working. Temporary editor uploads continue to use `DirectoryTemporaryFileStorage` under a configurable `/tmp` path and are never copied to backup storage unless the content is saved.

The existing Strapi H5P routes remain the compatibility layer during the first deployment. Direct CDN URLs can be introduced only after playback, authorization, CORS, MIME type, and range behavior are verified. This prevents the storage migration from silently changing the public API contract.

## Media Library

Use Strapi's S3-compatible upload provider pinned to the same Strapi version, configured for the R2 endpoint, private credentials, `media/` root path, and a stable public asset base URL. Existing uploaded files are copied to `media/`, and stored URLs are reconciled to the custom asset domain before production cutover.

The public bucket CORS policy allows `GET` and `HEAD` from the production Next.js and Strapi origins. Write operations are never public. Runtime credentials receive access only to the live asset bucket; backup credentials are separate.

## Database and Cold Starts

Neon is the PostgreSQL system of record. Strapi uses Neon's pooled connection string for normal runtime traffic and conservative pool limits suitable for sleeping compute. Backup jobs use a direct database connection. Startup and transient connection failures must be retried with a bounded backoff; the application must fail health checks if either PostgreSQL or required object-storage metadata is unavailable.

Next.js ISR means public pages normally do not wake Strapi. Editorial access, revalidation, or an uncached request may wait for Render and Neon to resume. This latency is acceptable; correctness and low idle cost take priority.

## Weekly Backup and Retention

A scheduled GitHub Actions workflow runs weekly independently of Strapi:

1. Create a PostgreSQL custom-format dump from the direct Neon URL.
2. Validate it with `pg_restore --list`.
3. Produce manifests for the live `media/`, `h5p/libraries/`, and `h5p/content/` prefixes, including object key, size, ETag where reliable, and SHA-256 for downloaded artifacts.
4. Copy the live prefixes into a timestamped snapshot in a separate private R2 backup bucket.
5. Encrypt the database dump with an `age` public key whose private key is stored offline, not in GitHub.
6. Upload the encrypted dump, manifests, checksums, application commit SHA, and schema/version metadata.
7. Download and verify the uploaded metadata and dump checksum before reporting success.

Retain eight weekly snapshots and six month-end snapshots. Apply bucket lifecycle rules only after two successful backup runs and one manual restore rehearsal. The workflow may delete only objects under its own dated `backups/` prefix.

## Migration and Cutover

Migration is explicit and repeatable:

1. Create pre-migration database and filesystem backups.
2. Provision the private backup bucket, public asset bucket/custom domain, and least-privilege tokens.
3. Copy `public/uploads`, `public/h5p/libraries`, and `public/h5p/content`; exclude `temp-files`.
4. Compare source and target object counts, byte totals, and checksums.
5. Restore PostgreSQL into Neon and verify row counts and migrated H5P mappings.
6. Deploy Strapi with filesystem mode disabled only after all object checks pass.
7. Test Media Library create/read/delete and all H5P create/read/update/delete paths, including video ranges.
8. Test Next.js pages and all nine published H5P activities; confirm the draft remains inaccessible.
9. Run the weekly backup manually and restore it into a disposable database and isolated object prefix.
10. Keep DigitalOcean read-only through the rollback window, then remove it only after owner approval.

Rollback switches Next.js back to the old Strapi URL or redeploys the filesystem configuration with the retained pre-cutover snapshots. No migration step deletes source data.

## Security and Operations

- Use separate R2 tokens for runtime live objects and backup writes.
- Keep the backup bucket private and deny public development URLs.
- Store only an `age` public key in CI; keep the recovery private key offline in two controlled copies.
- Pin provider and AWS SDK versions; use automated dependency updates only with integration tests.
- Log bucket operation failures without object contents, credentials, or signed URLs.
- Add a health endpoint that checks dependencies without performing writes.
- Alert on failed weekly workflows; unchanged successful backups require no manual action.

## Success Criteria

- Strapi starts with an empty application filesystem and can list/edit all migrated content.
- Media uploads survive restart and are served from the configured asset domain.
- All ten H5P records remain mapped; nine play publicly and the draft stays private.
- H5P editor save, library install, delete, and video range requests work against R2.
- Database and object migrations reconcile counts, sizes, and checksums with no missing objects.
- A weekly backup completes from outside Strapi and a disposable restore reproduces the database and object tree.
- DigitalOcean can be turned off without removing the only copy of any required content.

