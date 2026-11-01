# School CMS (Strapi)

This repository contains the Strapi 5 backend for the school website, including a custom H5P plugin and Drupal migration utilities. The Next.js frontend is maintained separately in the `nextjs-school` project.

## Architecture

- Next.js serves the public site with SSG/ISR; Strapi is the editor-facing CMS.
- The deployment target is a stateless Render Node service backed by Neon PostgreSQL.
- Cloudflare R2 stores permanent uploads and H5P data: `media/`, `h5p/libraries/`, and `h5p/content/` in the live assets bucket. H5P temporary uploads stay on local temporary storage and are not backed up.
- The private `school-backups` bucket receives weekly database and object snapshots. See [architecture](docs/architecture.md), [deployment](docs/operations/render-neon-r2-deployment.md), and [backup and restore](docs/operations/backup-and-restore.md).

## Local development

Requirements: Node.js 20 and npm. Local development defaults to SQLite and filesystem storage.

```bash
npm ci
cp .env.example .env
# Set unique local Strapi secrets in .env; keep STORAGE_DRIVER=local.
npm run develop
```

Strapi is available at `http://localhost:1337/admin`. The `develop` script builds the H5P plugin before starting Strapi. To create a production admin build, run `npm run build`; to start it, run `npm start`.

## Migration utilities

Storage migration is dry-run by default. Review its report before using `--apply` with real R2 credentials:

```bash
npm run storage:migrate -- --report ../migration-artifacts/<date>/object-storage-migration-report.json
```

Keep database dumps, exports, credentials, `.env`, and migration artifacts out of Git. Never remove Drupal source data or turn off DigitalOcean until a disposable restore and cutover checks have passed.
