# Architecture

## Applications and runtime

This repository is the Strapi 5 CMS backend. The public Next.js frontend is maintained separately and uses static generation and ISR, so Strapi can run on an ephemeral, sleeping service. The deployment target is Render with Node.js 20; Neon PostgreSQL is the system of record. Strapi uses Neon's pooled URL at runtime, while scheduled backups use the direct database URL.

## Durable data

Cloudflare R2 separates live assets from backups:

- The live assets bucket stores Strapi media under `media/`, permanent H5P libraries under `h5p/libraries/`, and saved activities under `h5p/content/`.
- The private `school-backups` bucket stores weekly PostgreSQL dumps and snapshots of those three object prefixes.
- H5P editor temporary files remain local and disposable. Do not migrate or back them up.

Media URLs use the stable asset domain configured by `ASSET_BASE_URL`; do not save S3 API endpoint URLs in content. Local development defaults to SQLite and `STORAGE_DRIVER=local`; S3-compatible storage is enabled with `STORAGE_DRIVER=s3` and R2 credentials.

## H5P behavior

The custom H5P plugin stores permanent content and library files through a provider-neutral object-store boundary. It keeps temporary uploads local, supports HTTP byte ranges for media playback, and limits imports to 96 MiB total and 64 MiB per file. Public H5P routes are read-only; editing, uploads, saves, library installation, and deletion require Strapi admin authentication.

## Migration and operations

The Drupal migration preserves ten H5P records (nine published and one draft) and 61 Media Library mappings. Keep the Drupal/DigitalOcean source available until the new service, a disposable database/object restore, and public-site checks are verified. Production restoration remains a reviewed manual operation; retention is scoped to dated `snapshots/` prefixes.

See [deployment](operations/render-neon-r2-deployment.md) and [backup and restore](operations/backup-and-restore.md) for runbooks.
