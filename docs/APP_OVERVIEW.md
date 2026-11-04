# DevPocket

DevPocket is a personal place to save coding ideas, tools, libraries, and open-source projects found online.

## Main model

- A **note** is the saved item. It keeps a title, Markdown content, optional source URL, platform, and timestamps.
- A **folder** is a collection such as Tools, Concepts, or Library. Folders can contain subfolders and items, and may be empty.
- **Draft** is the fixed first system folder. It can contain subfolders; items anywhere below it are drafts. Items in other folders have one usage state: Try, Active, or Reference.

## Main flow

The app opens at Collections. Folder view shows Draft first, followed by other folders. Folder cards open the folder and their plus action starts an item assigned to that folder. Add subfolders from inside any folder. A second view shows all items with Standard tabs or Compare columns; Compare is also available inside every folder. Search covers all items, and folder filters include nested folders.

## First implementation slice

- Create, edit, read, and delete notes.
- Create nested folders; Draft stays first and can contain subfolders. Each folder can open a preselected item form.
- Create, edit, read, and render Markdown with a write/preview mode.
- Search notes by title, content, source URL, folder, and platform.
- Browse all notes in Standard tabs or Compare columns, with drag-and-drop status changes.
- Pin items and folders. Items can use built-in icons, uploaded images, or an HTTPS image URL.
- Store notes and folders in Cloudflare D1 through a Worker API.

AI capture and semantic search endpoints are implemented through the Gemini API, but they are inactive until a key is configured. Capture asks Gemini to read one public URL and suggest a title plus Markdown for review before saving. Semantic search embeds note snippets at query time and ranks the existing notes; it does not save embeddings. The first semantic search asks before sending note titles and content snippets to Gemini. Gemini's free tier may use submitted data to improve its products. Public pages only: sign-in walls, video, audio, and paywalled sources may not be readable.

## Stack

- React, TypeScript, and Vite for the interface.
- Cloudflare Worker with Hono for the API.
- Cloudflare D1 with SQL migrations for durable data.
- Cloudflare Vite plugin for local Worker development and deployment builds.

Production uses a separate Cloudflare D1 database and a private R2 bucket for uploaded note icons. The Worker is deployed at `https://devpocket.fadayan.workers.dev` and protected by Cloudflare Access. The app has PWA installation support; its service worker caches only the app shell, while note data remains online-only. See `CLOUDFLARE_SETUP.md` for current deployment details.
