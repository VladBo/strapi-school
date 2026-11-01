# Local Strapi content to production

## Current inventory

The local Strapi database contains 46 page rows across 23 documents (23 draft and 23 published rows), 26 article rows across 17 documents (17 draft and 9 published rows), 8 course rows across 4 documents (4 draft and 4 published rows), 61 Media Library records, and 34 H5P rows across 18 documents (18 draft and 16 published rows). A plaintext local dump was restored and verified at `../migration-artifacts/2026-10-31/strapi-local-plaintext-2026-10-31.dump`; the dump stays outside Git with mode `0600`.

The production Neon snapshot from 2026-10-31 had no rows in `pages`, `articles`, `courses`, `files`, or `h5p_contents`. It has since been confirmed that the app schemas match for content transfer; the only database schema difference is optional admin audit-log tables. Recheck production immediately before transfer.

The live `school-assets` R2 bucket already contains the migrated media and H5P objects. Do not copy asset binaries again during the content transfer.

## Transfer procedure

1. Take and verify a fresh production database/R2 snapshot. Confirm the target content types are still empty and keep the local dump.
2. Confirm Render is running the matching Strapi app version and the local Strapi source starts successfully.
3. In production Strapi Admin, create a temporary **Push** transfer token with a short expiry. Do not use Full Access and do not put the token in Git, shell history, or logs.
4. From this repository, run the transfer with only the content stage:

   ```sh
   npm run strapi transfer -- --to https://strapi-school.onrender.com/admin --only content
   ```

   Enter the token when prompted and review Strapi's destructive-transfer confirmation before accepting. Do not add `--force`.

5. Verify destination counts, published/draft status, relations, menus, homepage, media records/URLs, and all H5P records. Confirm representative R2 media and H5P playback.
6. Delete the temporary transfer token after verification. If validation fails, stop the cutover and restore only from a reviewed production backup.

`--only content` replaces the destination content stage, including content relations and Media Library database records; it preserves destination configuration and uploaded binaries. Strapi admin users and API tokens are not transferred. Strapi's transfer command still requires matching content schemas. See [Strapi Data transfer](https://docs-v5.strapi.io/cms/features/data-management/transfer).

## Cutover guardrail

Keep Drupal/DigitalOcean available until the production content and public Next.js pages are verified. Do not point the frontend to the new API or shut down the Drupal host as part of this transfer.
