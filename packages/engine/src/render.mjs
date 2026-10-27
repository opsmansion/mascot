// Server-side rendering with sharp (Node only). Turns a mascot and its file list into file bytes or a zip.
import { deflateRawSync } from "node:zlib";
import sharp from "sharp";
import { iconSvg } from "./mascots.mjs";
import { buildIconFiles, zip } from "./pack.mjs";

// Each layout is rendered once at 1024 px, then scaled down for every size.
function pngRenderer(mascot) {
  const masters = new Map();
  const master = (layout) => {
    if (!masters.has(layout)) masters.set(layout, sharp(Buffer.from(iconSvg(mascot, { layout })), { density: 72 }).png().toBuffer());
    return masters.get(layout);
  };
  return async (layout, size, { opaque = false, grayscale = false } = {}) => {
    let image = sharp(await master(layout)).resize(size, size, { kernel: "lanczos3" });
    if (opaque) image = image.flatten({ background: mascot.background[1] });
    if (grayscale) image = image.grayscale();
    return new Uint8Array(await image.png({ compressionLevel: 9 }).toBuffer());
  };
}

const tools = (mascot) => ({ renderPng: pngRenderer(mascot), svg: (layout) => iconSvg(mascot, { layout }) });

// The bytes of one file from an icon set.
export async function renderFile(mascot, file) {
  const [built] = await buildIconFiles([{ files: [file] }], tools(mascot));
  return built.data;
}

// Every file in `sets`, zipped inside one folder.
export async function renderZip(mascot, sets, folder) {
  const files = await buildIconFiles(sets, tools(mascot));
  return zip(
    files.map(({ path, data }) => ({ name: `${folder}/${path}`, data })),
    async (data) => deflateRawSync(data, { level: 9 }),
  );
}
