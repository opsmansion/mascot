// The mascot maker's state. A mascot description is kept as short URL parameters, which are also
// the maker form's field names, so the form, the share link, and the description are one format.
// Every value is checked here, because links can carry anything and colours end up inside SVG.
import { bodies, eyes, hats, mouths } from "./mascots.mjs";

const HEX = /^#[0-9a-f]{6}$/i;

export const finishes = { soft: "Soft 3D", bold: "Bold outline" };

export const defaultSpec = {
  name: "My mascot",
  body: "blob",
  hat: "none",
  hatColor: "#1f1f1f",
  color: "#ff8a3d",
  background: ["#5b5bf0", "#3434c2"],
  ink: "#1a1030",
  finish: "soft",
  face: { eye: "googly", mouth: "smile", cheeks: true },
  sparkles: false,
};

// Accepts maker specs and built mascots alike (a built mascot may have a two-colour body).
export function toParams(spec) {
  const hat = spec.hat ?? "none";
  return new URLSearchParams({
    n: spec.name,
    b: spec.body,
    h: hat,
    hc: spec.hatColor ?? hats[hat].color ?? defaultSpec.hatColor,
    c: [spec.color].flat()[0],
    t: spec.background[0],
    u: spec.background[1],
    e: spec.ink,
    f: spec.finish ?? "soft",
    i: spec.face.eye,
    m: spec.face.mouth,
    k: spec.face.cheeks ? "1" : "0",
    s: spec.sparkles ? "1" : "0",
  });
}

export function fromParams(params) {
  const one = (key, options) => (Object.hasOwn(options, params.get(key) ?? "") ? params.get(key) : undefined);
  const colour = (key, fallback) => (HEX.test(params.get(key) ?? "") ? params.get(key).toLowerCase() : fallback);
  const d = defaultSpec;
  return {
    name: (params.get("n") ?? "").trim().slice(0, 40) || d.name,
    body: one("b", bodies) ?? d.body,
    hat: one("h", hats) ?? d.hat,
    hatColor: colour("hc", d.hatColor),
    color: colour("c", d.color),
    background: [colour("t", d.background[0]), colour("u", d.background[1])],
    ink: colour("e", d.ink),
    finish: one("f", finishes) ?? d.finish,
    face: { eye: one("i", eyes) ?? d.face.eye, mouth: one("m", mouths) ?? d.face.mouth, cheeks: params.get("k") === "1" },
    sparkles: params.get("s") === "1",
  };
}

export const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "mascot";

function hsl(h, s, l) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const channel = (n) => {
    const k = (n + h / 30) % 12;
    const value = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

// A random mascot: a background hue, a body in a contrasting hue, and random pieces.
export function randomSpec(name, random = Math.random) {
  const pick = (list) => list[Math.floor(random() * list.length)];
  const hue = Math.floor(random() * 360);
  const body = pick(Object.keys(bodies));
  const hat = random() < 0.5 ? "none" : pick(Object.keys(hats).filter((h) => h !== "none"));
  const finish = random() < 0.8 ? "soft" : "bold";
  return {
    name,
    body,
    hat,
    hatColor: hats[hat].color ?? defaultSpec.hatColor,
    color: finish === "bold" ? "#ffffff" : hsl((hue + 150 + random() * 60) % 360, 80, 62),
    background: [hsl(hue, 85, 62), hsl(hue, 85, 45)],
    ink: hsl(hue, 40, 12),
    finish,
    face: { eye: pick(Object.keys(eyes)), mouth: pick(body === "house" ? Object.keys(mouths) : ["smile", "grin"]), cheeks: random() < 0.6 },
    sparkles: random() < 0.3,
  };
}
