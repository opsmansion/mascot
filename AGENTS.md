# Project instructions

- This is mascots.opesimansion.com: free mascot app icons by Opesi Mansion. Nothing here is sold or put behind a sign-up or paywall. Visitors are anonymous: no accounts, no database. The icons are licensed under CC BY 4.0, so users must credit Opesi Mansion; keep the licence and credit line on every mascot page and in every zip.
- Do not use emoji in project code or documentation.
- Never launch or open a browser engine, including headless browsers, browser automation, visual previews, screenshots, or browser testing. Use non-browser checks, such as rendering icons to PNG with sharp and viewing the image file, or calling server routes with `app.request()` or curl.
- This is a pnpm workspace:
  - `packages/engine` draws mascots (`src/mascots.mjs`), lists every icon file (`src/icon-sets.mjs`), checks maker settings (`src/maker.mjs`), packs ZIP and ICO files (`src/pack.mjs`), and renders PNGs with sharp (`src/render.mjs`, server only).
  - `apps/web` is the static Astro frontend. Routes are in `src/pages/`, shared styling in `src/styles/global.css`.
  - `apps/server` is the Node (Hono) backend. It draws every icon file and zip on request and serves the built frontend. Its routes exist for the website and are not a public API.
- All PNG and zip generation happens on the server. Keep the browser to SVG previews.
- Every value from a maker link or query string must go through `fromParams` in `packages/engine/src/maker.mjs` before it is used.
- Run `pnpm test` and `pnpm check` after changing the engine, the server, or the maker.
- Mascots must be original. Do not trace or copy characters from other icon shops or brands.
