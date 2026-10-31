# Backup and restore

The GitHub Actions workflow runs weekly and may also be started manually. It stores a plaintext PostgreSQL dump and a separate R2 snapshot of only `media/`, `h5p/libraries/`, and `h5p/content/` in the private `school-backups` bucket. It never copies H5P temporary files and never restores production automatically. Anyone who obtains backup-bucket credentials can read the database dump and copied assets, so keep the bucket private and credentials restricted.

## Required secrets

Set these GitHub Actions secrets: `NEON_DIRECT_DATABASE_URL`, `LIVE_S3_ENDPOINT`, `LIVE_S3_REGION`, `LIVE_S3_BUCKET`, `LIVE_S3_ACCESS_KEY_ID`, `LIVE_S3_SECRET_ACCESS_KEY`, `BACKUP_S3_ENDPOINT`, `BACKUP_S3_REGION`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`, and `BACKUP_S3_SECRET_ACCESS_KEY`.

The live token is read-only (`List`, `Get`, `Head`) for the three durable prefixes. The backup token can write and read only its private backup bucket. Do not reuse runtime credentials. Never commit keys, dumps, `.env`, or reports containing private URLs. Confirm the database does not contain sensitive personal or student information before relying on plaintext backups.

## Restore rehearsal

1. Choose a completed `snapshots/<UTC timestamp>/` prefix. Download `database.dump`, `manifest.json`, and `SHA256SUMS`; run `sha256sum --check SHA256SUMS`.
2. Create an isolated disposable PostgreSQL database and restore it with `pg_restore --clean --if-exists --dbname <isolated-url> database.dump`.
3. Copy snapshot objects into an isolated bucket or prefix, then validate the manifest checksums. Do not point a rehearsal at the live prefix.
4. Confirm row counts, Media Library URLs, H5P mappings, public playback, and a video range request. Record the outcome before approving any production cutover.

Production restoration is a reviewed manual operation. Retention is enabled through the repository variable `BACKUP_RETENTION_ENABLED=true`. It keeps the latest four weekly snapshots plus the latest three month-end snapshots, deletes incomplete snapshots after 24 hours, and only removes objects under their dated `snapshots/` prefixes. R2 also expires anything under `snapshots/` after 120 days as a backstop. At the current 264 MB per full snapshot, the normal retained set is about 1.9 GB, plus live assets; actual usage grows with content.
