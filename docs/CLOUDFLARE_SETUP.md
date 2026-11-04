# Cloudflare setup

## Provisioned

- Cloudflare Worker: `devpocket`
- D1 database: `devpocket` (primary location hint: Asia Pacific)
- D1 migrations `0001_initial_schema.sql` through `0004_draft_as_folder.sql`: applied
- R2 bucket `devpocket-icons`: created (Standard, Asia Pacific)
- Latest Worker version: deployed `d4f0daab-fa4b-48d8-89e1-aa25b8d6873e` (folder routes and item detail modal URLs)
- Production URL: https://devpocket.fadayan.workers.dev
- PWA: manifest, install icons, install button, and app-shell service worker are enabled
- Cloudflare Access: enabled for all Worker traffic; unauthenticated requests to both `/` and `/api/health` redirect to Access
- Preview URLs: disabled
- Gemini API key: not configured; AI features remain inactive

## Keep access private

Cloudflare Access is configured in the dashboard for **All traffic**. Keep its allow policy limited to your own Cloudflare account or email. Do not add an everyone/bypass policy.

The production Worker is published at the URL above, but Cloudflare Access requires sign-in before serving either the UI or API. Preview URLs are disabled in `app/wrangler.jsonc`.

## Install DevPocket

Open the production URL and sign in through Cloudflare Access first. Use **Pasang** in the app header when the browser supports the install prompt. On iPhone/iPad, open the URL in Safari, tap **Bagikan**, then **Tambahkan ke Layar Utama**. Other browsers may offer **Pasang aplikasi** in their menu.

The service worker caches the app shell and static assets only. Notes and API responses are not cached, so an internet connection is still needed to read and save notes. The current app icon is a temporary pocket-and-code mark.

## Database commands

- Local database: `npm run db:migrate:local`
- Production D1: `npm run db:migrate:remote`
- Production build and deploy: `npm run deploy` (keeps the Access policy in place)

For the folder/pin update, run `npm run db:migrate:remote` before `npm run deploy`. Migration 0004 moves existing Draft notes into the new system Draft folder while preserving note content and metadata.

Do not use `--remote` for local database work. Production uses a separate D1 binding in the `production` environment.

## R2 ikon

The Worker expects a private R2 bucket named `devpocket-icons`, in Standard storage and the Asia Pacific location. Create it in the Cloudflare dashboard, and leave public access disabled. The production binding is already declared in `app/wrangler.jsonc`.

Local development uses Wrangler's local R2 storage under `.wrangler`; it does not write to the production bucket. Uploaded images are limited to PNG, JPEG, and WebP files up to 2 MB. The Worker serves them through the app, so the bucket does not need a public domain.

The icon metadata migration is applied to production D1, and the Worker is deployed with the R2 binding.

## Optional AI setup

Add `GEMINI_API_KEY` as a Worker secret for the production environment to enable link capture and semantic search. Keep it out of source files and browser code. AI search asks before sending note excerpts to Gemini.

## References

- [Cloudflare D1 setup](https://developers.cloudflare.com/d1/get-started/)
- [Protect a Worker with Cloudflare Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
- [D1 pricing and free limits](https://developers.cloudflare.com/d1/platform/pricing/)
