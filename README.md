# Glory & Game

Glory & Game now runs on Astro with a cleaner page-based architecture and a lightweight client-side submission flow.

## Stack

- Astro 6
- Vercel adapter for server output
- EmDash for `/media/` editorial content
- JSON athlete data in `src/data/athletes.json`
- Pinecone for persisted athlete submissions and searchable text records
- Vercel Blob for uploaded athlete images
- Small browser scripts for submission and directory hydration

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
npm run import:seed-athletes
npx emdash init -d ./.emdash/data.db
npx emdash seed ./.emdash/seed.json -d ./.emdash/data.db
```

## Pinecone Setup

This app now supports persisted athlete submissions through Pinecone.

1. Copy `.env.example` to `.env`.
2. Add `PINECONE_API_KEY`.
3. Add either `PINECONE_INDEX_NAME` or `PINECONE_INDEX_HOST`.
4. Create a Pinecone index with integrated embeddings and map the model text field to `chunk_text`.
5. Add `BLOB_READ_WRITE_TOKEN` so uploaded profile photos can be stored in Vercel Blob.
6. Add `ADMIN_SECRET` so the moderation dashboard can review, edit, approve, and delete submissions.

Use Pinecone to store athlete metadata and the uploaded image URL. The image file itself now lives in Vercel Blob.

## EmDash Production Setup

Local development uses EmDash with a file-backed SQLite database in `.emdash/`. Production only enables the live EmDash admin/runtime when these environment variables are configured:

- `EMDASH_DATABASE_URL`
- `EMDASH_DATABASE_AUTH_TOKEN` if your libSQL provider needs one
- `EMDASH_STORAGE_ENDPOINT`
- `EMDASH_STORAGE_BUCKET`
- `EMDASH_STORAGE_ACCESS_KEY_ID`
- `EMDASH_STORAGE_SECRET_ACCESS_KEY`
- `EMDASH_STORAGE_PUBLIC_URL` optional CDN/base URL
- `EMDASH_STORAGE_REGION` optional region override

Until those are present, production keeps `/media/` live by reading the seeded stories in [`.emdash/seed.json`](/Users/mikebrisk/CODE/briskstudios/glory-and-game/.emdash/seed.json) and leaves the EmDash admin runtime disabled.

## Structure

- `src/pages/` route-based Astro pages
- `src/layouts/` shared layout shell
- `src/lib/athletes.js` athlete data utilities
- `src/lib/athlete-repository.js` server-side athlete persistence and Pinecone access
- `src/pages/api/athletes.js` API route for listing and creating athlete profiles
- `src/pages/api/admin/athletes.js` admin API route for moderation, editing, and deletion
- `src/pages/admin/index.astro` admin moderation dashboard
- `src/pages/media/` EmDash-powered editorial routes
- `src/live.config.ts` Astro live collection bridge for EmDash
- `.emdash/seed.json` initial EmDash schema and sample content for `/media/`
- `src/scripts/athletes-client.js` browser-side submission logic
- `scripts/import-seed-athletes.mjs` one-time importer for moving the seeded athlete directory into Vercel Blob + Pinecone
- `src/styles/global.css` shared site styling
- `public/` static assets and images still used by the site

## Notes

- `src/data/athletes.json` still seeds the built-in athlete directory.
- When Pinecone is configured, new athlete submissions are persisted as `pending` and merged into the public site only after approval.
- Astro is configured for server output so athlete detail routes can resolve persisted slugs dynamically.
- EmDash currently powers only the `/media/` editorial flow. The athlete directory and moderation dashboard remain on the existing custom system.
