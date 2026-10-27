// Checks the server's routes in-process (no port, no browser). Run with: pnpm test
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { test } from "node:test";
import sharp from "sharp";
import { createApp } from "../src/app.mjs";
import { BusyError, cache, gate, rateLimiter } from "../src/limits.mjs";

// A stand-in for the built website.
const staticDir = await mkdtemp(join(tmpdir(), "mascots-web-"));
await mkdir(join(staticDir, "_astro"));
await writeFile(join(staticDir, "index.html"), "<h1>Home</h1>");
await writeFile(join(staticDir, "404.html"), "<h1>Not here</h1>");
await writeFile(join(staticDir, "_astro", "app.abc123.js"), "console.log(1)");

const quiet = { error() {} };
const app = createApp({ staticDir, log: quiet });

// The names and contents of a zip's files, read from its central directory.
function unzip(buffer) {
  const end = buffer.length - 22;
  let at = buffer.readUInt32LE(end + 16);
  const files = new Map();
  for (let i = 0; i < buffer.readUInt16LE(end + 10); i++) {
    const nameLength = buffer.readUInt16LE(at + 28);
    const name = buffer.subarray(at + 46, at + 46 + nameLength).toString();
    const local = buffer.readUInt32LE(at + 42);
    const size = buffer.readUInt32LE(at + 20);
    const start = local + 30 + buffer.readUInt16LE(local + 26);
    const packed = buffer.subarray(start, start + size);
    files.set(name, buffer.readUInt16LE(at + 10) === 8 ? inflateRawSync(packed) : packed);
    at += 46 + nameLength + buffer.readUInt16LE(at + 30) + buffer.readUInt16LE(at + 32);
  }
  return files;
}

const bytes = async (response) => Buffer.from(await response.arrayBuffer());

test("health check", async () => {
  const response = await app.request("/healthz");
  assert.deepEqual(await response.json(), { ok: true });
});

test("curated icon files are drawn on request and cached by browsers", async () => {
  const response = await app.request("/icons/kiko/web/icon-192.png");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.match(response.headers.get("cache-control"), /max-age=86400/);
  const { width, height } = await sharp(await bytes(response)).metadata();
  assert.deepEqual([width, height], [192, 192]);

  const again = await app.request("/icons/kiko/web/icon-192.png", { headers: { "If-None-Match": response.headers.get("etag") } });
  assert.equal(again.status, 304);
});

test("a curated zip holds every file", async () => {
  const response = await app.request("/icons/penny/penny-app-icons.zip");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-disposition"), /attachment; filename="penny-app-icons.zip"/);
  const files = unzip(await bytes(response));
  assert.equal(files.size, 64);
  assert.ok(files.has("penny-app-icons/ios/AppIcon.appiconset/icon-1024.png"));
});

test("unknown mascots, files, and paths outside the site get the 404 page", async () => {
  for (const path of ["/icons/nobody/web/icon-192.png", "/icons/kiko/web/nothing.png", "/icons/kiko/../../package.json", "/missing"]) {
    const response = await app.request(path);
    assert.equal(response.status, 404, path);
    assert.match(await response.text(), /Not here/, path);
  }
});

test("the maker zip is drawn from the share-link parameters", async () => {
  const response = await app.request("/api/make.zip?n=Bob+the+Star&b=star&h=leaves&c=%23ff0000&i=bean&m=grin");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-disposition"), /filename="bob-the-star-app-icons.zip"/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("content-type"), "application/zip");
  const files = unzip(await bytes(response));
  assert.match(files.get("bob-the-star-app-icons/LICENSE.txt").toString(), /"Bob the Star" by Opesi Mansion \(mascots\.opesimansion\.com\/make\)/);
  assert.match(files.get("bob-the-star-app-icons/bob-the-star.svg").toString(), /#ff0000/);
});

test("hostile maker parameters fall back to safe values", async () => {
  const response = await app.request(`/api/make.zip?n=${encodeURIComponent('../../"evil')}&c=${encodeURIComponent('"/><script>')}&b=__proto__`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-disposition"), /filename="evil-app-icons.zip"/);
  const svg = unzip(await bytes(response)).get("evil-app-icons/evil.svg").toString();
  assert.ok(!svg.includes("<script"));
});

test("maker downloads are rate limited per visitor", async () => {
  const limited = createApp({ staticDir, makerPerMinute: 2, log: quiet });
  for (let i = 0; i < 2; i++) assert.equal((await limited.request(`/api/make.zip?n=r${i}`)).status, 200);
  const response = await limited.request("/api/make.zip?n=r3");
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get("retry-after")) > 0);
  assert.match(await response.text(), /Back to the maker/);
});

test("when renders are full, extra requests are turned away instead of piling up", async () => {
  const busy = createApp({ staticDir, maxConcurrent: 1, maxQueue: 0, log: quiet });
  const statuses = (await Promise.all(["/api/make.zip?n=a", "/api/make.zip?n=b"].map((path) => busy.request(path)))).map((r) => r.status);
  assert.deepEqual(statuses.sort(), [200, 503]);
});

test("the website and the site favicons are served", async () => {
  const home = await app.request("/");
  assert.equal(await home.text(), "<h1>Home</h1>");
  assert.equal(home.headers.get("cache-control"), "no-cache");
  const asset = await app.request("/_astro/app.abc123.js");
  assert.match(asset.headers.get("cache-control"), /immutable/);
  const favicon = await app.request("/favicon.ico");
  assert.equal(favicon.headers.get("content-type"), "image/x-icon");
});

test("the gate never runs more than its limit at once", async () => {
  const run = gate(2, 10);
  let active = 0;
  let peak = 0;
  const task = async () => {
    peak = Math.max(peak, ++active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
  };
  await Promise.all(Array.from({ length: 8 }, () => run(task)));
  assert.equal(peak, 2);
  const full = gate(1, 0);
  const first = full(() => new Promise((resolve) => setTimeout(resolve, 5)));
  await assert.rejects(full(async () => {}), BusyError);
  await first;
});

test("rate limit windows reset after a minute", () => {
  let time = 0;
  const limit = rateLimiter(1, () => time);
  assert.equal(limit("a"), 0);
  assert.equal(limit("a"), 60);
  assert.equal(limit("b"), 0);
  time = 60_000;
  assert.equal(limit("a"), 0);
});

test("the cache shares one render between concurrent requests and forgets failures", async () => {
  const remember = cache(2);
  let calls = 0;
  const make = () => Promise.resolve(++calls);
  await Promise.all([remember("k", make), remember("k", make)]);
  assert.equal(calls, 1);
  await remember("bad", () => Promise.reject(new Error("no"))).catch(() => {});
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(await remember("bad", make), 2);
});
