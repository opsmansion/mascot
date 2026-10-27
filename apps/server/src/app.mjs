// The Mascots server. It draws every icon file and zip on request with the shared engine,
// and serves the built website from apps/web/dist. There are no accounts and no database: visitors
// are anonymous, so maker downloads are rate limited per visitor and renders are capped per machine.
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { getConnInfo } from "@hono/node-server/conninfo";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { etag } from "hono/etag";
import { buildMascot, findMascot, fromParams, iconSets, slugify, toParams, zipName } from "@opesi-mascots/engine";
import { renderFile, renderZip } from "@opesi-mascots/engine/render";
import { BusyError, cache, gate, rateLimiter } from "./limits.mjs";

const TYPES = {
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".zip": "application/zip",
};

// The site's own favicons are drawn from Manor, the Opesi Mansion house.
const SITE_ICONS = {
  "/favicon.ico": { path: "favicon.ico", make: { type: "ico", sizes: [16, 32, 48] } },
  "/favicon.svg": { path: "favicon.svg", make: { type: "svg", layout: "rounded" } },
  "/apple-touch-icon.png": { path: "apple-touch-icon.png", size: 180, make: { type: "png", layout: "full", opaque: true } },
};

const DAY = "public, max-age=86400";

export function createApp({
  staticDir,
  makerPerMinute = 6,
  maxConcurrent = 2,
  maxQueue = 20,
  trustProxy = false,
  log = console,
} = {}) {
  const app = new Hono();
  const run = gate(maxConcurrent, maxQueue);
  const curated = cache(Infinity); // A fixed set of mascots, about 65 files each.
  const made = cache(24); // Maker zips, by their share-link parameters.
  const limit = rateLimiter(makerPerMinute);

  const visitor = (c) => {
    if (trustProxy) return c.req.header("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    try {
      return getConnInfo(c).remote.address ?? "unknown";
    } catch {
      return "unknown";
    }
  };

  const file = (c, data, path, cacheControl = DAY) =>
    c.body(data, 200, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream", "Cache-Control": cacheControl });

  // Errors on downloads are shown as a short page, because visitors without JavaScript land on them.
  const problem = (c, status, message, headers = {}) =>
    c.html(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mascots</title>` +
        `<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 64px auto; padding: 0 16px"><p>${message}</p><p><a href="/make">Back to the maker</a></p></body>`,
      status,
      headers,
    );

  app.get("/healthz", (c) => c.json({ ok: true }));

  app.use("/icons/*", etag());
  app.use("/favicon.*", etag());
  app.use("/apple-touch-icon.png", etag());

  // One file, or the whole zip, of a curated mascot. Paths match the icon list in the engine.
  app.get("/icons/:slug/:path{.+}", async (c) => {
    const { slug, path } = c.req.param();
    const mascot = findMascot(slug);
    if (!mascot) return c.notFound();
    const sets = iconSets(mascot);
    try {
      if (path === zipName(slug)) {
        const data = await curated(`${slug}/${path}`, () => run(() => renderZip(mascot, sets, `${slug}-app-icons`)));
        c.header("Content-Disposition", `attachment; filename="${path}"`);
        return file(c, data, path);
      }
      const entry = sets.flatMap((set) => set.files).find((f) => f.path === path);
      if (!entry) return c.notFound();
      return file(c, await curated(`${slug}/${path}`, () => run(() => renderFile(mascot, entry))), path);
    } catch (error) {
      if (error instanceof BusyError) return c.text("The server is busy. Please try again in a moment.", 503, { "Retry-After": "10" });
      throw error;
    }
  });

  for (const [route, entry] of Object.entries(SITE_ICONS)) {
    app.get(route, async (c) => file(c, await curated(`site${route}`, () => renderFile(findMascot("manor"), entry)), entry.path));
  }

  // A full icon set for a mascot from the maker. The query string is the maker's share-link format;
  // fromParams checks every value, so anything unexpected falls back to a default.
  app.get("/api/make.zip", async (c) => {
    const spec = fromParams(new URL(c.req.url).searchParams);
    const key = toParams(spec).toString();
    const slug = slugify(spec.name);
    const wait = limit(visitor(c));
    if (wait) {
      return problem(c, 429, `You have made a lot of icon sets in the last minute. Please try again in ${wait} seconds.`, { "Retry-After": String(wait) });
    }
    try {
      const data = await made(key, () =>
        run(() => renderZip(buildMascot(spec), iconSets({ slug, name: spec.name, page: "/make" }), `${slug}-app-icons`)),
      );
      const name = `${slug}-app-icons.zip`;
      c.header("Content-Disposition", `attachment; filename="${name}"`);
      return file(c, data, name, "no-store");
    } catch (error) {
      if (error instanceof BusyError) return problem(c, 503, "The server is busy making other icon sets. Please try again in a moment.", { "Retry-After": "10" });
      throw error;
    }
  });

  if (staticDir) {
    app.use(
      "*",
      async (c, next) => {
        await next();
        if (!c.res.ok || c.res.headers.has("Cache-Control")) return;
        // Astro puts a content hash in every file name under /_astro/, so those never change.
        // Pages are rechecked on every visit so a new deploy shows at once.
        const type = extname(c.req.path);
        c.res.headers.set("Cache-Control", c.req.path.startsWith("/_astro/") ? "public, max-age=31536000, immutable" : type && type !== ".html" ? DAY : "no-cache");
      },
      serveStatic({ root: staticDir }),
    );
  }

  app.notFound(async (c) => {
    const page = staticDir ? await readFile(join(staticDir, "404.html"), "utf8").catch(() => null) : null;
    return page ? c.html(page, 404) : c.text("Not found", 404);
  });

  app.onError((error, c) => {
    log.error(error);
    return c.text("Something went wrong on our side.", 500);
  });

  return app;
}
