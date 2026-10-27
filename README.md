# Mascots

The service behind mascots.opesimansion.com. It offers original mascot app icons drawn by Opesi Mansion and a maker for building your own. Everything is free, with no sign-up and no payment. In return, people credit Opesi Mansion (see Licence).

Each mascot comes with every icon size the main platforms ask for, as single files and as one zip:

- **Source:** the vector SVG, a 1024 px PNG, and `LICENSE.txt` with the credit line.
- **iOS and iPadOS:** a ready `AppIcon.appiconset` (the single 1024 px icon Xcode 14 and later use, with iOS 18 dark and tinted versions), plus the older fixed sizes from 20 to 180 px. All are square and opaque, as the App Store requires.
- **Android:** the 512 px Play Store icon and a `res` folder to copy into `app/src/main/`. It has adaptive icon layers (foreground, background, and the monochrome layer Android 13 uses for themed icons) and legacy square and round launcher icons for every density from mdpi to xxxhdpi.
- **macOS:** an `AppIcon.iconset` on Apple's macOS grid, from 16 to 1024 px. Convert it with `iconutil -c icns AppIcon.iconset`.
- **Web:** `favicon.ico` (16, 32 and 48 px), an SVG favicon, `apple-touch-icon.png`, PWA icons (192, 512 and maskable 512), and a matching manifest `icons` entry.

## Layout

A pnpm workspace with one shared engine, a frontend, and a backend:

| Folder | What it is |
| --- | --- |
| `packages/engine` | The drawing engine. `src/mascots.mjs` draws mascots as SVG, `src/icon-sets.mjs` lists every file and its size, `src/maker.mjs` reads and checks maker settings, `src/pack.mjs` writes ZIP and ICO files, and `src/render.mjs` turns SVG into PNGs with sharp (server only). |
| `apps/web` | The website: a static Astro site. Its pages show mascots as inline SVG from the engine, and link to the server for every file. |
| `apps/server` | The backend: a Node server (Hono). It draws every icon file and zip on request and serves the built website. |

The website never draws PNGs or zips itself; the server does, with the same engine the pages use for previews, so a preview always matches the download.

## How the server works

| Route | Returns |
| --- | --- |
| `GET /icons/<slug>/<path>` | One file of a curated mascot, for example `/icons/kiko/web/icon-192.png`. Paths match `src/icon-sets.mjs`. |
| `GET /icons/<slug>/<slug>-app-icons.zip` | Every file of a curated mascot in one zip. |
| `GET /api/make.zip?<settings>` | A full icon set for a mascot from the maker. The query string is the maker's share-link format. |
| `GET /favicon.ico`, `/favicon.svg`, `/apple-touch-icon.png` | The site's own icons, drawn from Manor. |
| `GET /healthz` | `{ "ok": true }` for Docker health checks. |
| Anything else | The built website from `apps/web/dist`, or its 404 page. |

These routes exist for the website. They are not a published API.

Visitors are anonymous, so the server protects itself without accounts or a database:

- **Per-visitor limit:** each visitor can download 6 maker zips a minute; more get a "try again in N seconds" page (HTTP 429).
- **Render cap:** at most 2 icon sets are drawn at once, and up to 20 more wait their turn. Beyond that, visitors are asked to retry (HTTP 503) instead of slowing the server down.
- **Caching:** curated files are drawn once and kept in memory, and browsers keep them for a day, with ETags so they can check cheaply. The last 24 maker zips are also kept, and identical requests arriving together share one render.
- **Untrusted input:** every maker setting is checked in `packages/engine/src/maker.mjs` before use. Anything unexpected falls back to a default, so nothing from a link reaches the SVG markup or a file name unchecked.

A full set of 64 files takes about 0.6 seconds to draw on a laptop.

Settings (environment variables, all optional):

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3000` | Port the server listens on. |
| `HOST` | `0.0.0.0` | Address the server listens on. |
| `MASCOTS_MAKER_RATE_PER_MINUTE` | `6` | Maker zips per visitor per minute. |
| `MASCOTS_MAX_CONCURRENT` | `2` | Icon sets drawn at once. |
| `MASCOTS_MAX_QUEUE` | `20` | Icon sets waiting before visitors are asked to retry. |
| `MASCOTS_TRUST_PROXY` | off | Set to `1` behind Nginx, so the visitor's address is read from `X-Forwarded-For`. Leave it off when the server faces the internet directly, or visitors could fake their address. |
| `MASCOTS_STATIC_DIR` | `apps/web/dist` | Where the built website is. |

## How mascots are made

Every mascot is drawn in code in `packages/engine/src/mascots.mjs`. No artwork files are read, so the output is the same on every machine. A mascot is built from:

- a **body**: house, key, coin, blob, cloud, brick, seed, or star, in one colour (or two for a gradient);
- an optional **hat**: roof, hard hat, or leaves;
- a **face**: eyes (`bean`, `googly`, `window`, `sleepy`), mouth (`smile`, `grin`, `door`), and optional cheeks;
- a **background**: two colours, top to bottom, and a **face colour** for the eyes and mouth;
- a **finish**: `soft` (gradient shading, a highlight, and a ground shadow) or `bold` (flat fill with a thick outline);
- optional **sparkles**.

Bodies and hats are drawn on a 1024 by 1024 square and stay roughly within 150 to 870 on both axes, clear of iOS corner masks and the Android safe zone. A tall body with a hat is shrunk towards its base so it never leaves the icon. To add a new body or hat, add it to `bodies` or `hats`; it then appears in the maker automatically.

To add a curated mascot:

1. Design it in the maker at `/make`. Its share link holds every choice.
2. Add an entry to `mascots` in `packages/engine/src/mascots.mjs` with a new `slug`, `name`, one-sentence `about`, and those pieces.
3. Run `pnpm dev` and open `/icons/<slug>/<slug>-1024.png` and a small size, such as `/icons/<slug>/ios/legacy/icon-40.png`, to check that the character still reads when small.

The site picks up the new mascot automatically: a card on the home page and its own page at `/<slug>`.

## The mascot maker

`/make` lets anyone build a mascot from the same pieces. The preview is drawn in the browser as SVG, so it updates instantly. "Download all sizes" asks the server for `/api/make.zip` with the current settings.

The maker is a normal form whose field names are the share-link keys. Without JavaScript, the form submits to the server and the browser saves the zip. With JavaScript, the page fetches the zip itself, so it can show progress and the server's message if a limit is hit. The settings are also kept in the page address, so every mascot has a share link. Zips from the maker include the same CC BY 4.0 licence, with a credit line pointing to `/make`.

## Development

```bash
pnpm install
pnpm dev      # the server on port 3000 and the Astro dev server, which passes /icons and /api on to it
pnpm build    # builds the website into apps/web/dist
pnpm start    # runs the server, serving the built website, on port 3000
pnpm test     # engine and server tests (no browser)
pnpm check    # Astro and TypeScript diagnostics
```

The tests call the server's routes in-process. They cover every file and zip, the 404 page, hostile maker settings, the rate limit, the render cap, and caching. The maker page's own download script is not covered, because the project does not run browsers; check it by hand in Chrome, Safari, and Firefox after changing `apps/web/src/pages/make.astro`.

## Deployment

The service runs as one Docker container behind Nginx, the same way as Opesi Studio:

1. At the DNS provider for opesimansion.com, add an `A` record for `mascots` pointing to the server.
2. On the server, clone the project (for example to `/opt/mascots`), copy `.env.example` to `.env`, and change any values you need.
3. Start it with `sudo docker compose up -d --build`. The container listens on `127.0.0.1:3300` only.
4. Copy `deploy/nginx-mascots.conf` to `/etc/nginx/sites-available/mascots.opesimansion.com`, enable it, reload Nginx, and run `sudo certbot --nginx -d mascots.opesimansion.com`.

To update: `cd /opt/mascots && git pull && sudo docker compose up -d --build`.

The server keeps nothing on disk and needs no database. Restarting it only clears the render cache.

## Licence

The mascots are licensed under [Creative Commons Attribution 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/): anyone may use, change, and share them for free, including commercially, as long as they credit Opesi Mansion. Every zip includes a `LICENSE.txt` with the terms and a ready credit line, and each mascot page shows the same line. The wording lives in `packages/engine/src/icon-sets.mjs`.

The Reddit Sans font in `apps/web/public/fonts/` is under the SIL Open Font License; see `apps/web/public/fonts/reddit-sans/README.txt`.
