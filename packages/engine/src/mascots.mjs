// Every Opesi Mansion mascot, drawn in code on a 1024-unit square. The icon generator
// (scripts/generate-icons.mjs), the site pages, and the mascot maker all render from this file, so a
// mascot looks the same in every file and on every page. To add a mascot, add an entry to `mascots`.

const round = (n) => Math.round(n * 10) / 10;
const point = ([x, y]) => `${round(x)} ${round(y)}`;

// Mix two hex colours; t = 0 gives `a`, t = 1 gives `b`.
export function mix(a, b, t) {
  const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [ca, cb] = [channels(a), channels(b)];
  return `#${ca.map((c, i) => Math.round(c + (cb[i] - c) * t).toString(16).padStart(2, "0")).join("")}`;
}

// A closed polygon whose corners are rounded with radius r.
function roundedPolygon(points, r) {
  const toward = (p, q) => {
    const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const t = Math.min(r, length / 2) / length;
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  };
  const d = points.map((p, i) => {
    const prev = points[(i + points.length - 1) % points.length];
    const next = points[(i + 1) % points.length];
    return `${i ? "L" : "M"}${point(toward(p, prev))} Q${point(p)} ${point(toward(p, next))}`;
  });
  return `<path d="${d.join(" ")} Z"/>`;
}

// A rounded star with `count` points around (cx, cy).
function star(cx, cy, count, outer, inner, r) {
  const points = Array.from({ length: count * 2 }, (_, k) => {
    const angle = -Math.PI / 2 + (k * Math.PI) / count;
    const radius = k % 2 ? inner : outer;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });
  return roundedPolygon(points, r);
}

// A four-pointed sparkle with curved sides.
const sparkle = (x, y, s, fill) =>
  `<path fill="${fill}" d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z"/>`;

const circle = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
const rect = (x, y, width, height, rx) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}"/>`;

// Mascots are built from three kinds of pieces: a body, an optional hat, and a face. The curated
// mascots below and the mascot maker (src/pages/make.astro) use the same pieces.
// Shapes are drawn on the 1024-unit square. `box` is a shape group's bounding box [x0, y0, x1, y1],
// used to place its shading. A body's `face` says where the face sits, and `top` is where a hat rests.
export const bodies = {
  house: {
    label: "House",
    box: [148, 170, 876, 846],
    top: 170,
    shapes: [
      rect(640, 232, 86, 180, 18),
      roundedPolygon([[512, 170], [876, 468], [806, 468], [806, 846], [218, 846], [218, 468], [148, 468]], 34),
    ],
    face: { cx: 512, cy: 560, gap: 118, mouthY: 700, mouthWidth: 128, doorBottom: 846 },
  },
  key: {
    label: "Key",
    box: [272, 140, 752, 870],
    top: 140,
    shapes: [circle(512, 380, 240), rect(464, 540, 96, 330, 40), rect(520, 700, 120, 62, 26), rect(520, 792, 90, 62, 26)],
    face: { cx: 512, cy: 360, gap: 82, scale: 0.9, mouthY: 470, mouthWidth: 110 },
  },
  coin: {
    label: "Coin",
    box: [212, 220, 812, 820],
    top: 220,
    shapes: [circle(512, 520, 300)],
    detail: (color) => `<circle cx="512" cy="520" r="246" fill="none" stroke="${mix(color, "#000000", 0.15)}" stroke-width="16" opacity="0.7"/>`,
    face: { cx: 512, cy: 480, gap: 92, mouthY: 590, mouthWidth: 150 },
  },
  blob: {
    label: "Blob",
    box: [210, 290, 815, 860],
    top: 290,
    shapes: [`<path d="M512 290 C690 285 810 410 815 590 C820 760 700 860 512 860 C320 860 205 765 210 590 C215 405 335 295 512 290 Z"/>`],
    face: { cx: 512, cy: 560, gap: 110, scale: 1.05, mouthY: 690, mouthWidth: 120 },
  },
  cloud: {
    label: "Cloud",
    box: [190, 260, 860, 790],
    top: 260,
    shapes: [circle(340, 600, 150), circle(520, 470, 210), circle(700, 590, 160), rect(200, 560, 640, 230, 115)],
    face: { cx: 512, cy: 590, gap: 92, scale: 0.95, mouthY: 680, mouthWidth: 100 },
  },
  brick: {
    label: "Brick",
    box: [200, 340, 824, 740],
    top: 340,
    shapes: [rect(200, 340, 624, 400, 80)],
    face: { cx: 512, cy: 520, gap: 120, scale: 0.95, mouthY: 620, mouthWidth: 130 },
  },
  seed: {
    label: "Seed",
    box: [224, 330, 800, 880],
    top: 330,
    shapes: [`<path d="M512 330 C690 330 800 480 800 650 C800 800 676 880 512 880 C348 880 224 800 224 650 C224 480 334 330 512 330 Z"/>`],
    face: { cx: 512, cy: 610, gap: 100, mouthY: 710, mouthWidth: 110 },
  },
  star: {
    label: "Star",
    box: [172, 180, 852, 860],
    top: 180,
    shapes: [star(512, 520, 8, 340, 236, 60)],
    face: { cx: 512, cy: 500, gap: 90, mouthY: 590, mouthWidth: 130 },
  },
  axolotl: {
    label: "Axolotl",
    box: [140, 230, 884, 820],
    top: 230,
    shapes: [
      `<rect x="145" y="336" width="248" height="64" rx="32" transform="rotate(-24 269 368)"/>`,
      `<rect x="140" y="461" width="246" height="64" rx="32"/>`,
      `<rect x="145" y="586" width="248" height="64" rx="32" transform="rotate(24 269 618)"/>`,
      `<rect x="631" y="336" width="248" height="64" rx="32" transform="rotate(24 755 368)"/>`,
      `<rect x="638" y="461" width="246" height="64" rx="32"/>`,
      `<rect x="631" y="586" width="248" height="64" rx="32" transform="rotate(-24 755 618)"/>`,
      rect(254, 230, 516, 590, 246),
    ],
    face: { cx: 512, cy: 480, gap: 104, mouthY: 620, mouthWidth: 150 },
  },
  octopus: {
    label: "Finned octopus",
    box: [190, 220, 834, 856],
    top: 220,
    shapes: [
      circle(280, 420, 90),
      circle(744, 420, 90),
      `<path d="M294 564 C220 628 208 748 256 806 Q282 838 320 812 C294 752 322 698 366 666 Z"/>`,
      `<path d="M390 604 C330 690 336 806 392 842 Q430 864 454 822 C424 744 442 686 478 646 Z"/>`,
      `<path d="M634 604 C694 690 688 806 632 842 Q594 864 570 822 C600 744 582 686 546 646 Z"/>`,
      `<path d="M730 564 C804 628 816 748 768 806 Q742 838 704 812 C730 752 702 698 658 666 Z"/>`,
      circle(512, 460, 246),
    ],
    face: { cx: 512, cy: 432, gap: 88, scale: 0.92, mouthY: 548, mouthWidth: 116 },
  },
  pangolin: {
    label: "Pangolin",
    box: [200, 258, 864, 866],
    top: 258,
    shapes: [
      `<path d="M672 554 C840 566 910 706 834 808 C782 880 694 876 640 820 C744 840 810 780 784 708 C764 652 710 628 652 630 Z"/>`,
      circle(318, 362, 98),
      circle(596, 350, 98),
      circle(466, 546, 264),
    ],
    detail: (color) => {
      const ink = mix(color, "#000000", 0.24);
      return `<g fill="none" stroke="${ink}" stroke-width="18" stroke-linecap="round" opacity="0.65"><path d="M312 374 Q368 316 424 374"/><path d="M432 350 Q488 292 544 350"/><path d="M548 382 Q604 324 652 386"/><path d="M360 432 Q406 392 448 426"/><path d="M504 414 Q556 376 604 418"/></g>`;
    },
    face: { cx: 466, cy: 530, gap: 94, mouthY: 648, mouthWidth: 112 },
  },
  tardigrade: {
    label: "Tardigrade",
    box: [150, 230, 874, 850],
    top: 230,
    shapes: [
      ...[410, 510, 610, 710].flatMap((y) => [
        `<rect x="156" y="${y}" width="174" height="88" rx="44" transform="rotate(-28 243 ${y + 44})"/>`,
        `<rect x="694" y="${y}" width="174" height="88" rx="44" transform="rotate(28 781 ${y + 44})"/>`,
      ]),
      rect(244, 230, 536, 620, 250),
    ],
    detail: (color) => `<g fill="none" stroke="${mix(color, "#000000", 0.2)}" stroke-width="14" opacity="0.4"><path d="M320 640 Q512 720 704 640"/><path d="M350 746 Q512 816 674 746"/></g>`,
    face: { cx: 512, cy: 430, gap: 98, mouthY: 555, mouthWidth: 124 },
  },
};

// Hats are drawn for a body whose top is at `rest`, then moved to the actual body's top.
// A hat with `behind` is drawn behind the body (leaves grow out from under it).
export const hats = {
  none: { label: "None" },
  roof: { label: "Roof", color: "#1f1f1f", rest: 290, box: [384, 150, 640, 330], shapes: [roundedPolygon([[512, 150], [640, 262], [640, 330], [384, 330], [384, 262]], 14)] },
  hardHat: { label: "Hard hat", color: "#ffcc1f", rest: 340, box: [290, 210, 734, 386], shapes: [`<path d="M330 360 A182 150 0 0 1 694 360 Z"/>`, rect(290, 340, 444, 46, 23)] },
  leaves: {
    label: "Leaves",
    color: "#6fdc5a",
    rest: 330,
    behind: true,
    box: [262, 170, 790, 366],
    shapes: [
      rect(496, 300, 32, 80, 16),
      `<path d="M500 352 C460 240 370 190 262 206 C284 314 380 366 500 352 Z"/>`,
      `<path d="M524 352 C572 222 676 170 790 190 C768 304 664 364 524 352 Z"/>`,
    ],
  },
};

export const eyes = { bean: "Bean", googly: "Googly", window: "Window", sleepy: "Happy" };
export const mouths = { smile: "Smile", grin: "Grin", door: "Door" };

const moved = (shape, dy) => (dy ? shape.replace(/^<(\w+)/, `<$1 transform="translate(0 ${dy})"`) : shape);

// Turn a mascot description into the parts the renderer draws. A description has:
// body, color (one colour, or two for a top-to-bottom gradient), optional hat and hatColor,
// background (top and bottom colours), ink (eyes and mouth), face { eye, mouth, cheeks },
// finish ("soft": gradients, a highlight, a ground shadow; "bold": flat fill, thick outline),
// and sparkles (true adds two sparkles around the character).
export function buildMascot(spec) {
  const body = bodies[spec.body];
  const hat = hats[spec.hat ?? "none"];
  const parts = [{ color: spec.color, box: body.box, shapes: body.shapes }];
  if (hat.shapes) {
    const dy = body.top - hat.rest;
    const part = { color: spec.hatColor ?? hat.color, box: [hat.box[0], hat.box[1] + dy, hat.box[2], hat.box[3] + dy], shapes: hat.shapes.map((shape) => moved(shape, dy)) };
    if (hat.behind) parts.unshift(part);
    else parts.push(part);
  }
  // A tall body with a hat can rise past the top of the icon. If so, shrink the character towards its base.
  const top = Math.min(...parts.map((p) => p.box[1]));
  const base = Math.max(...parts.map((p) => p.box[3]));
  const fit = top < 110 ? { scale: round((base - 110) / (base - top) * 1000) / 1000, base } : undefined;
  return {
    ...spec,
    finish: spec.finish ?? "soft",
    parts,
    detail: body.detail?.([spec.color].flat()[0]) ?? "",
    face: { ...body.face, ...spec.face },
    decoration: spec.sparkles ? sparkle(800, 236, 56, "#ffffff") + sparkle(232, 806, 38, "#ffffff") : "",
    fit,
  };
}

export const mascots = [
  {
    slug: "manor",
    name: "Manor",
    about: "The Opesi Mansion house itself, with window eyes and a front door for a mouth.",
    body: "house",
    color: "#f6efe3",
    background: ["#2e2e2e", "#000000"],
    ink: "#16131f",
    face: { eye: "window", mouth: "door" },
  },
  {
    slug: "kiko",
    name: "Kiko",
    about: "A cheerful key for anything about access, sign-in, or unlocking something new.",
    body: "key",
    color: "#2fd6b4",
    background: ["#ff4f8b", "#d61e63"],
    ink: "#10212b",
    face: { eye: "googly", mouth: "smile", cheeks: true },
  },
  {
    slug: "penny",
    name: "Penny",
    about: "A gold coin with a big grin, for payments, savings, and earning.",
    body: "coin",
    color: "#ffc531",
    background: ["#6b3cf0", "#3d17b0"],
    ink: "#3b2405",
    face: { eye: "bean", mouth: "grin", cheeks: true },
    sparkles: true,
  },
  {
    slug: "mo",
    name: "Mo",
    about: "A soft blue blob wearing a tiny Opesi Mansion roof as a hat.",
    body: "blob",
    color: "#4d8bff",
    hat: "roof",
    background: ["#d4ff4a", "#8ee61b"],
    ink: "#0d1b3d",
    face: { eye: "googly", mouth: "smile", cheeks: true },
  },
  {
    slug: "nimbus",
    name: "Nimbus",
    about: "A bold, outlined cloud for anything synced, stored, or online.",
    body: "cloud",
    finish: "bold",
    color: "#ffffff",
    background: ["#ffe14d", "#ffc400"],
    ink: "#141414",
    face: { eye: "bean", mouth: "smile" },
  },
  {
    slug: "brick",
    name: "Brick",
    about: "A terracotta brick in a hard hat, for building, making, and home projects.",
    body: "brick",
    color: "#e8643c",
    hat: "hardHat",
    background: ["#fff3e3", "#ffd7ad"],
    ink: "#2a1208",
    face: { eye: "googly", mouth: "grin", cheeks: true },
  },
  {
    slug: "sprout",
    name: "Sprout",
    about: "A seed with its first two leaves, for growth, progress, and starting small.",
    body: "seed",
    color: "#e3a466",
    hat: "leaves",
    background: ["#14473a", "#06221a"],
    ink: "#2b1606",
    face: { eye: "bean", mouth: "smile", cheeks: true },
  },
  {
    slug: "zip",
    name: "Zip",
    about: "A happy burst of energy for speed, launches, and anything new.",
    body: "star",
    color: ["#ffb21e", "#ff3d7f"],
    background: ["#24242c", "#0a0a0f"],
    ink: "#2a0b19",
    face: { eye: "sleepy", mouth: "grin" },
  },
  {
    slug: "luma",
    name: "Luma",
    about: "A bright axolotl with feathery gills.",
    body: "axolotl",
    color: "#ff92b8",
    background: ["#5b49d6", "#25167d"],
    ink: "#402039",
    face: { eye: "bean", mouth: "smile", cheeks: true },
  },
  {
    slug: "nori",
    name: "Nori",
    about: "A finned deep-sea octopus with four waving arms.",
    body: "octopus",
    color: "#bd94f4",
    background: ["#17446f", "#081b3f"],
    ink: "#28204b",
    face: { eye: "googly", mouth: "smile", cheeks: true },
  },
  {
    slug: "rolo",
    name: "Rolo",
    about: "A curled pangolin with a little suit of scales.",
    body: "pangolin",
    color: "#e8a86c",
    background: ["#4d2c5e", "#261435"],
    ink: "#382015",
    face: { eye: "bean", mouth: "grin" },
  },
  {
    slug: "mossi",
    name: "Mossi",
    about: "An eight-legged tardigrade ready for tiny adventures.",
    body: "tardigrade",
    color: "#91d68f",
    background: ["#245e91", "#102f5f"],
    ink: "#173a32",
    face: { eye: "googly", mouth: "smile", cheeks: true },
  },
].map(buildMascot);

export const findMascot = (slug) => mascots.find((m) => m.slug === slug);

function eye(kind, x, y, s, ink) {
  switch (kind) {
    case "bean":
      return `<ellipse cx="${x}" cy="${y}" rx="${40 * s}" ry="${54 * s}" fill="${ink}"/><circle cx="${x - 12 * s}" cy="${y - 20 * s}" r="${13 * s}" fill="#fff"/>`;
    case "googly":
      return (
        `<ellipse cx="${x}" cy="${y}" rx="${62 * s}" ry="${70 * s}" fill="#fff"/>` +
        `<ellipse cx="${x + 6 * s}" cy="${y + 10 * s}" rx="${36 * s}" ry="${42 * s}" fill="${ink}"/>` +
        `<circle cx="${x - 6 * s}" cy="${y - 6 * s}" r="${11 * s}" fill="#fff"/>`
      );
    case "window":
      return `<rect x="${x - 55 * s}" y="${y - 60 * s}" width="${110 * s}" height="${120 * s}" rx="${26 * s}" fill="${ink}"/><circle cx="${x - 20 * s}" cy="${y - 24 * s}" r="${15 * s}" fill="#fff"/>`;
    case "sleepy":
      return `<path d="M${x - 40 * s} ${y + 12 * s} Q${x} ${y - 34 * s} ${x + 40 * s} ${y + 12 * s}" fill="none" stroke="${ink}" stroke-width="${20 * s}" stroke-linecap="round"/>`;
  }
}

function mouth(face, s, ink) {
  const { cx, mouthY: y, mouthWidth: w } = face;
  switch (face.mouth) {
    case "smile":
      return `<path d="M${cx - w / 2} ${y} Q${cx} ${y + w * 0.45} ${cx + w / 2} ${y}" fill="none" stroke="${ink}" stroke-width="${20 * s}" stroke-linecap="round"/>`;
    case "grin":
      return `<path d="M${cx - w / 2} ${y} Q${cx} ${y + w * 0.9} ${cx + w / 2} ${y} Z" fill="${ink}" stroke="${ink}" stroke-width="${10 * s}" stroke-linejoin="round"/><ellipse cx="${cx}" cy="${y + w * 0.3}" rx="${w * 0.2}" ry="${w * 0.1}" fill="#ff6b8a"/>`;
    case "door":
      const bottom = face.doorBottom ?? y + w * 1.1;
      return `<path d="M${cx - w / 2} ${bottom} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${cx + w / 2} ${y + w / 2} V${bottom} Z" fill="${ink}"/>`;
  }
}

function renderFace(m) {
  const { face, ink } = m;
  const s = face.scale ?? 1;
  const cheeks = face.cheeks
    ? [-1, 1].map((side) => `<ellipse cx="${face.cx + side * (face.gap + 34 * s)}" cy="${face.cy + 76 * s}" rx="${40 * s}" ry="${24 * s}" fill="#ff7a9a" opacity="0.45"/>`).join("")
    : "";
  return eye(face.eye, face.cx - face.gap, face.cy, s, ink) + eye(face.eye, face.cx + face.gap, face.cy, s, ink) + cheeks + mouth(face, s, ink);
}

// The character as a single-colour silhouette with the face cut out, for Android themed icons.
function renderSilhouette(m, id) {
  const shapes = m.parts.flatMap((p) => p.shapes).join("");
  const outline = m.finish === "bold" ? ` stroke="#fff" stroke-width="36" stroke-linejoin="round"` : "";
  return (
    `<defs><mask id="${id}-mono"><g fill="#fff"${outline}>${shapes}</g>${renderFace({ ...m, ink: "#000" })}</mask></defs>` +
    `<rect width="1024" height="1024" fill="#fff" mask="url(#${id}-mono)"/>`
  );
}

// The character alone (no background), with all ids prefixed by `id` so several icons can share a page.
function renderCharacter(m, id) {
  const soft = m.finish === "soft";
  const defs = [`<filter id="${id}-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>`];
  const layers = [];

  if (soft) {
    const [x0, , x1, y1] = m.parts.reduce(
      ([a, b, c, d], { box }) => [Math.min(a, box[0]), Math.min(b, box[1]), Math.max(c, box[2]), Math.max(d, box[3])],
      [Infinity, Infinity, -Infinity, -Infinity],
    );
    layers.push(`<ellipse cx="${(x0 + x1) / 2}" cy="${y1 + 14}" rx="${(x1 - x0) * 0.4}" ry="34" fill="#000" opacity="0.3" filter="url(#${id}-blur)"/>`);
  } else {
    const outline = m.parts.flatMap((p) => p.shapes).join("");
    layers.push(`<g fill="${m.ink}" stroke="${m.ink}" stroke-width="36" stroke-linejoin="round">${outline}</g>`);
  }

  m.parts.forEach((part, i) => {
    const [x0, y0, x1, y1] = part.box;
    const [w, h] = [x1 - x0, y1 - y0];
    const shapes = part.shapes.join("");
    const stops = Array.isArray(part.color)
      ? `<stop offset="0" stop-color="${part.color[0]}"/><stop offset="1" stop-color="${part.color[1]}"/>`
      : soft
        ? `<stop offset="0" stop-color="${mix(part.color, "#ffffff", 0.35)}"/><stop offset="0.55" stop-color="${part.color}"/><stop offset="1" stop-color="${mix(part.color, "#000000", 0.22)}"/>`
        : `<stop offset="0" stop-color="${part.color}"/>`;
    defs.push(
      `<linearGradient id="${id}-fill-${i}" gradientUnits="userSpaceOnUse" x1="${x0 + w * 0.2}" y1="${y0}" x2="${x0 + w * 0.8}" y2="${y1}">${stops}</linearGradient>`,
      `<clipPath id="${id}-clip-${i}">${shapes}</clipPath>`,
    );
    const highlight = `<ellipse cx="${x0 + w * 0.36}" cy="${y0 + h * 0.24}" rx="${w * 0.3}" ry="${h * 0.18}" fill="#fff" opacity="${soft ? 0.5 : 0.3}" filter="url(#${id}-blur)"/>`;
    const shade = soft
      ? `<ellipse cx="${x0 + w * 0.62}" cy="${y1 + h * 0.06}" rx="${w * 0.6}" ry="${h * 0.3}" fill="#000" opacity="0.22" filter="url(#${id}-blur)"/>`
      : "";
    layers.push(`<g fill="url(#${id}-fill-${i})">${shapes}</g><g clip-path="url(#${id}-clip-${i})">${highlight}${shade}</g>`);
  });

  layers.push(m.detail ?? "", renderFace(m));
  const character = m.fit
    ? `<g transform="translate(512 ${m.fit.base}) scale(${m.fit.scale}) translate(-512 ${-m.fit.base})">${layers.join("")}</g>`
    : layers.join("");
  return `<defs>${defs.join("")}</defs>${character}${m.decoration ?? ""}`;
}

function renderBackground(m, id, dark = false) {
  const [top, bottom] = dark ? m.background.map((c) => mix(c, "#000000", 0.82)) : m.background;
  return (
    `<defs><linearGradient id="${id}-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>` +
    `<radialGradient id="${id}-glow" cx="0.5" cy="0.45" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="1024" height="1024" fill="url(#${id}-bg)"/><rect width="1024" height="1024" fill="url(#${id}-glow)"/>`
  );
}

// Layouts:
// "full"        square, edge to edge. iOS and Android apply their own corner mask to this.
// "dark"        the full icon on a darkened background, for iOS 18 dark mode (and, in grey, tinted mode).
// "rounded"     the full icon with rounded corners and transparent outside, for the web and previews.
// "foreground"  the character alone, shrunk into the Android adaptive-icon safe zone.
// "monochrome"  a white silhouette in the same safe zone, for Android 13 themed icons.
// "background"  the background alone, for Android adaptive icons.
// "circle"      the full icon cut to a circle, for Android round launcher icons.
// "macos"       the rounded icon on Apple's macOS grid: an 824-unit tile with a shadow, inside 1024.
export function iconSvg(m, { layout = "full", id = m.slug } = {}) {
  const full = renderBackground(m, id) + renderCharacter(m, id);
  let body;
  switch (layout) {
    case "full":
      body = full;
      break;
    case "dark":
      body = renderBackground(m, id, true) + renderCharacter(m, id);
      break;
    case "background":
      body = renderBackground(m, id);
      break;
    case "foreground":
      body = `<g transform="translate(512 512) scale(0.66) translate(-512 -512)">${renderCharacter(m, id)}</g>`;
      break;
    case "monochrome":
      body = `<g transform="translate(512 512) scale(0.66) translate(-512 -512)">${renderSilhouette(m, id)}</g>`;
      break;
    case "rounded":
      body = `<defs><clipPath id="${id}-tile"><rect width="1024" height="1024" rx="230"/></clipPath></defs><g clip-path="url(#${id}-tile)">${full}</g>`;
      break;
    case "circle":
      body = `<defs><clipPath id="${id}-tile"><circle cx="512" cy="512" r="512"/></clipPath></defs><g clip-path="url(#${id}-tile)">${full}</g>`;
      break;
    case "macos":
      body =
        `<defs><clipPath id="${id}-tile"><rect width="1024" height="1024" rx="230"/></clipPath>` +
        `<filter id="${id}-drop" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter></defs>` +
        `<rect x="100" y="112" width="824" height="824" rx="185" fill="#000" opacity="0.3" filter="url(#${id}-drop)"/>` +
        `<g transform="translate(100 100) scale(0.8047)"><g clip-path="url(#${id}-tile)">${full}</g></g>`;
      break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${body}</svg>`;
}
