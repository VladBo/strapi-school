# Render, Neon, and R2 deployment

This repository is prepared for a stateless Render service. Render starts the Node 20 container, checks `/api/health/storage`, and may sleep when idle. `DATABASE_URL` must be Neon's **pooled** runtime URL. The separate `NEON_DIRECT_DATABASE_URL` is backup-only: use it in GitHub Actions for `pg_dump`, never in the Render service.

## Provisioning checklist

Create a Neon project with a pooled runtime URL and a direct backup URL. Create two Cloudflare R2 buckets: a public live-assets bucket behind a stable custom domain, and a private backup bucket. Use distinct least-privilege tokens: the runtime token accesses only the live bucket; the backup workflow uses read-only live credentials and separate read/write backup credentials.

In Render, create the service from `render.yaml`, then enter every `sync: false` value through the dashboard. Set `STORAGE_DRIVER=s3`, `DATABASE_SSL=true`, and the custom asset domain as `ASSET_BASE_URL`; do not use the raw R2 endpoint for public URLs. In GitHub, configure the backup secrets listed in [backup and restore](backup-and-restore.md).

## Cutover sequence

1. Keep DigitalOcean online and take fresh database/filesystem snapshots.
2. Run `npm run storage:migrate -- --report ../migration-artifacts/<date>/object-storage-migration-report.json`; review it before using `--apply` with real R2 configuration.
3. Compare the migrated object count, bytes, SHA-256 metadata, 61 Media Library rows, and all ten H5P mappings. Do not delete any source data.
4. Deploy to Render, then check HTTPS admin login, media create/read/delete, H5P edit/save/install/playback, video seeking, pages, articles, quizzes, and the unpublished H5P 404.
5. Manually run the weekly backup, perform an isolated Neon/object restore rehearsal, and record its results locally. Keep DigitalOcean read-only through the rollback window; only the owner may approve shutdown.
