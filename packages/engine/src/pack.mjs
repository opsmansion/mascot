// File packing shared by the icon generator (Node) and the mascot maker (browser): ICO and zip
// writers on plain Uint8Arrays, so the same code runs in both places.

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data) {
  let c = 0xffffffff;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const concat = (chunks) => {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
};

// An ICO file holding PNG images directly. `images` is [{ size, data }].
export function ico(images) {
  const header = new Uint8Array(6 + images.length * 16);
  const view = new DataView(header.buffer);
  view.setUint16(2, 1, true);
  view.setUint16(4, images.length, true);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const entry = 6 + i * 16;
    view.setUint8(entry, size >= 256 ? 0 : size);
    view.setUint8(entry + 1, size >= 256 ? 0 : size);
    view.setUint16(entry + 4, 1, true);
    view.setUint16(entry + 6, 32, true);
    view.setUint32(entry + 8, data.length, true);
    view.setUint32(entry + 12, offset, true);
    offset += data.length;
  });
  return concat([header, ...images.map(({ data }) => data)]);
}

// A zip of `entries` ([{ name, data }]). `deflate` is an optional async function that returns raw
// deflate data; without it, files are stored uncompressed. Entries are dated 1 January 1980 so the
// same input always gives the same zip.
export async function zip(entries, deflate) {
  const DOS_DATE = (0 << 9) | (1 << 5) | 1;
  const encoder = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBytes = encoder.encode(name);
    const packed = deflate ? await deflate(data) : data;
    const fields = (view, at) => {
      view.setUint16(at, 20, true);
      view.setUint16(at + 2, 0x0800, true);
      view.setUint16(at + 4, deflate ? 8 : 0, true);
      view.setUint16(at + 8, DOS_DATE, true);
      view.setUint32(at + 10, crc32(data), true);
      view.setUint32(at + 14, packed.length, true);
      view.setUint32(at + 18, data.length, true);
      view.setUint16(at + 22, nameBytes.length, true);
    };
    const local = new Uint8Array(30);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    fields(localView, 4);
    const central = new Uint8Array(46);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    fields(centralView, 6);
    centralView.setUint32(42, offset, true);
    locals.push(local, nameBytes, packed);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + packed.length;
  }
  const directory = concat(centrals);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, directory.length, true);
  endView.setUint32(16, offset, true);
  return concat([...locals, directory, end]);
}

// Every file in an icon set, made with platform-specific helpers:
// renderPng(layout, size, { opaque, grayscale }) and svg(layout) return a file's bytes.
export async function buildIconFiles(sets, { renderPng, svg }) {
  const encoder = new TextEncoder();
  const files = [];
  for (const set of sets) {
    for (const file of set.files) {
      const { make } = file;
      let data;
      if (make.type === "png") data = await renderPng(make.layout, file.size, make);
      else if (make.type === "svg") data = encoder.encode(`${svg(make.layout)}\n`);
      else if (make.type === "ico") data = ico(await Promise.all(make.sizes.map(async (size) => ({ size, data: await renderPng("rounded", size, {}) }))));
      else data = encoder.encode(make.content);
      files.push({ path: file.path, data });
    }
  }
  return files;
}
