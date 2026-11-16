// Renders media/icon.png (128×128) from simple vector shapes. Original artwork:
// an open book under an eight-pointed star (Rub el Hizb motif) on a green tile.
// No dependencies: shapes are rasterised with 4×4 supersampling and encoded with zlib.
//   node scripts/build-icon.mjs

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SIZE = 128;
const SS = 4; // supersampling per axis

const COLORS = {
  tile: [15, 94, 78],
  page: [244, 235, 208],
  line: [196, 182, 140],
  star: [227, 179, 65],
};

// --- geometry -------------------------------------------------------------

function inPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inRoundedRect(x, y, w, h, r) {
  const cx = Math.min(Math.max(x, r), w - r);
  const cy = Math.min(Math.max(y, r), h - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r && x >= 0 && y >= 0 && x <= w && y <= h;
}

function square(cx, cy, half, angle) {
  return [0, 1, 2, 3].map((k) => {
    const a = angle + Math.PI / 4 + (k * Math.PI) / 2;
    const d = half * Math.SQRT2;
    return [cx + d * Math.cos(a), cy + d * Math.sin(a)];
  });
}

/** Thin band from p to q with the given thickness. */
function band([x1, y1], [x2, y2], t) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const nx = (-(y2 - y1) / len) * (t / 2);
  const ny = ((x2 - x1) / len) * (t / 2);
  return [
    [x1 + nx, y1 + ny],
    [x2 + nx, y2 + ny],
    [x2 - nx, y2 - ny],
    [x1 - nx, y1 - ny],
  ];
}

const leftPage = [[18, 52], [61, 58], [61, 108], [18, 102]];
const rightPage = leftPage.map(([x, y]) => [SIZE - x, y]);
const lines = [];
for (const dy of [10, 20, 30, 40]) {
  lines.push(band([25, 52 + dy], [55, 58 + dy - 0.5], 2.2));
  lines.push(band([SIZE - 25, 52 + dy], [SIZE - 55, 58 + dy - 0.5], 2.2));
}
const star = [square(64, 30, 11, 0), square(64, 30, 11, Math.PI / 4)];

// Later layers paint over earlier ones.
const layers = [
  { color: COLORS.tile, test: (x, y) => inRoundedRect(x, y, SIZE, SIZE, 24) },
  { color: COLORS.page, test: (x, y) => inPolygon(x, y, leftPage) || inPolygon(x, y, rightPage) },
  { color: COLORS.line, test: (x, y) => lines.some((l) => inPolygon(x, y, l)) },
  { color: COLORS.star, test: (x, y) => star.some((s) => inPolygon(x, y, s)) },
];

// --- raster ---------------------------------------------------------------

const rgba = Buffer.alloc(SIZE * SIZE * 4);
for (let py = 0; py < SIZE; py++) {
  for (let px = 0; px < SIZE; px++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const x = px + (sx + 0.5) / SS;
        const y = py + (sy + 0.5) / SS;
        let c;
        for (const l of layers) if (l.test(x, y)) c = l.color;
        if (c) {
          r += c[0]; g += c[1]; b += c[2]; a += 1;
        }
      }
    }
    const o = (py * SIZE + px) * 4;
    if (a > 0) {
      rgba[o] = Math.round(r / a);
      rgba[o + 1] = Math.round(g / a);
      rgba[o + 2] = Math.round(b / a);
    }
    rgba[o + 3] = Math.round((a / (SS * SS)) * 255);
  }
}

// --- PNG encoding ---------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
const rows = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) rgba.copy(rows, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(rows, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
const out = new URL('../media/icon.png', import.meta.url);
writeFileSync(out, png);
console.log(`build-icon: wrote ${out.pathname} (${png.length} bytes)`);
