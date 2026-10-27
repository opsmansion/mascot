// Checks the engine without a browser: drawing, the maker link format, packing, and server rendering.
import assert from "node:assert/strict";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { test } from "node:test";
import sharp from "sharp";
import { bodies, buildMascot, eyes, hats, iconSvg, mascots, mouths } from "../src/mascots.mjs";
import { defaultSpec, fromParams, randomSpec, slugify, toParams } from "../src/maker.mjs";
import { iconSets } from "../src/icon-sets.mjs";
import { zip } from "../src/pack.mjs";
import { renderFile, renderZip } from "../src/render.mjs";

test("a spec survives the round trip through a share link", () => {
  for (const spec of [defaultSpec, randomSpec("Round trip", mulberry(7))]) {
    assert.deepEqual(fromParams(new URLSearchParams(toParams(spec).toString())), spec);
  }
});

test("curated mascots load into the maker", () => {
  assert.equal(mascots.length, 12);
  assert.equal(new Set(mascots.map((m) => m.slug)).size, mascots.length);
  for (const m of mascots) {
    const spec = fromParams(toParams(m));
    assert.equal(spec.body, m.body);
    assert.equal(spec.face.eye, m.face.eye);
  }
});

test("hostile link values fall back to defaults and never reach the SVG", () => {
  const evil = '"/><script>alert(1)</script>';
  const params = new URLSearchParams({ n: evil, b: "__proto__", h: "toString", c: evil, t: "red", u: "#12345g", e: "#abc", f: "glow", i: evil, m: "x", k: "yes", s: "1" });
  const spec = fromParams(params);
  assert.equal(spec.body, defaultSpec.body);
  assert.equal(spec.hat, defaultSpec.hat);
  assert.equal(spec.color, defaultSpec.color);
  assert.deepEqual(spec.background, defaultSpec.background);
  assert.equal(spec.ink, defaultSpec.ink);
  assert.equal(spec.finish, defaultSpec.finish);
  assert.equal(spec.face.cheeks, false);
  assert.equal(spec.sparkles, true);
  assert.equal(fromParams(new URLSearchParams({ n: "x".repeat(100) })).name.length, 40);
  assert.ok(!iconSvg(buildMascot(spec)).includes("<script"));
});

test("slugs are safe file names", () => {
  assert.equal(slugify("My Mascot!"), "my-mascot");
  assert.equal(slugify("../../etc"), "etc");
  assert.equal(slugify("   "), "mascot");
});

test("every body, hat, eye, mouth, and finish renders in every layout", async () => {
  const layouts = ["full", "dark", "rounded", "foreground", "monochrome", "background", "circle", "macos"];
  for (const body of Object.keys(bodies))
    for (const hat of Object.keys(hats))
      for (const eye of Object.keys(eyes))
        for (const mouth of Object.keys(mouths))
          for (const finish of ["soft", "bold"]) {
            const m = buildMascot({ ...defaultSpec, body, hat, finish, face: { eye, mouth, cheeks: true }, sparkles: true });
            const layout = layouts[(body.length + hat.length + eye.length + mouth.length) % layouts.length];
            const { width } = await sharp(Buffer.from(iconSvg(m, { layout }))).resize(64).png().toBuffer({ resolveWithObject: true }).then((r) => r.info);
            assert.equal(width, 64, `${body} ${hat} ${eye} ${mouth} ${finish} ${layout}`);
          }
});

test("zips are readable both stored and deflated", async () => {
  const data = new TextEncoder().encode("hello hello hello");
  for (const deflate of [undefined, async (d) => deflateRawSync(d)]) {
    const bytes = Buffer.from(await zip([{ name: "a/b.txt", data }], deflate));
    assert.equal(bytes.readUInt32LE(0), 0x04034b50);
    const method = bytes.readUInt16LE(8);
    const size = bytes.readUInt32LE(18);
    const nameLength = bytes.readUInt16LE(26);
    const body = bytes.subarray(30 + nameLength, 30 + nameLength + size);
    assert.equal((method === 8 ? inflateRawSync(body) : body).toString(), "hello hello hello");
  }
});

test("maker downloads credit the maker page", () => {
  const licence = iconSets({ slug: "bob", name: "Bob", page: "/make" })[0].files.find((f) => f.path === "LICENSE.txt");
  assert.match(licence.make.content, /mascots\.opesimansion\.com\/make/);
});

test("the server renders a complete, valid icon set", async () => {
  const kiko = mascots.find((m) => m.slug === "kiko");
  const sets = iconSets(kiko);
  const files = sets.flatMap((set) => set.files);
  const bytes = Buffer.from(await renderZip(kiko, sets, "kiko-app-icons"));
  assert.equal(bytes.readUInt32LE(bytes.length - 22), 0x06054b50);
  assert.equal(bytes.readUInt16LE(bytes.length - 22 + 10), files.length);

  const appStore = files.find((f) => f.path === "ios/AppIcon.appiconset/icon-1024.png");
  const info = await sharp(Buffer.from(await renderFile(kiko, appStore))).metadata();
  assert.deepEqual([info.width, info.height, info.hasAlpha], [1024, 1024, false]);

  const favicon = Buffer.from(await renderFile(kiko, files.find((f) => f.path === "web/favicon.ico")));
  assert.equal(favicon.readUInt16LE(4), 3);
});

function mulberry(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
