# Admin interface languages

The admin panel supports English and Ukrainian. `src/admin/app.tsx` enables
`en` and `uk`, and `src/admin/translations/uk.json` supplements Strapi's bundled
Ukrainian translations. Missing Ukrainian messages fall back to English.

Each administrator chooses their own language: open the user menu, select
**Profile settings**, then under **Experience** set **Interface language** to
**Українська** or **English** and save. This changes that administrator's
interface language; content localization is configured separately.

## Verify locally

1. Use Node.js 22, matching the Docker image, and the local development database
   and storage settings in `.env`.
2. Run `npm run build`, then `npm start`.
3. Open `http://localhost:1337/admin` and sign in with a local admin account.
4. Choose Ukrainian in the profile, save, and check the home page, Content
   Manager, Media Library, and an entry editor.
5. Switch back to English and check that the interface changes back. Reload
   the page to confirm the saved preference persists.

## Apply on Render after local review

Deploy the reviewed commit using the existing Render Docker build. The Dockerfile
runs `npm run build`, which bundles the language configuration and translations.
No extra Render environment variables or database migration are needed for these
interface translations. Repeat the language-switching checks in the deployed
admin panel. If an older bundle remains open in the browser, fully reload it.

Some third-party plugin interfaces and newer Strapi screens may still show
English where they do not provide Ukrainian translations. Add message overrides
to `src/admin/translations/uk.json` using the exact message IDs, including plugin
prefixes, and rebuild the admin panel.
