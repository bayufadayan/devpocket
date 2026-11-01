# DevPocket

React, Vite, and Cloudflare Worker app with a local D1 database.

## Local development

```sh
npm install
npm run db:migrate:local
npm run dev
```

The migration creates the local database under `.wrangler/state`. The app does not need Cloudflare credentials for local development.

AI capture and semantic search use the Gemini API. To enable them locally, copy `.dev.vars.example` to `.dev.vars` and add a Gemini API key. Keep `.dev.vars` private; it is ignored by Git. AI calls stay on the Worker and the key is not sent to the browser.

## Commands

- `npm run dev` starts Vite and the local Worker.
- `npm run build` builds the Worker and browser app.
- `npm run db:migrate:local` applies D1 migrations to the local database.
- `npm run db:migrate:remote` applies the same migrations to the Cloudflare production D1 database.
- `npm run deploy` builds the production Worker and deploys it.
- `npm run cf:typegen` regenerates Cloudflare binding types.

The production Worker uses a separate D1 binding. Local migrations remain isolated from production. The production URL is protected by Cloudflare Access; keep its allow policy restricted to your account/email. Preview URLs are disabled. The app includes a PWA manifest and service worker; only the app shell is cached, while notes require an internet connection.

Add the Gemini key as a Worker secret to enable AI.
