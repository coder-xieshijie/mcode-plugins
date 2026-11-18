// Minimal PNG writer for plugin icons: a rounded tile split into colour swatches. Zero deps.
import { deflateSync } from 'node:zlib';
import { asColor } from './color.mjs';

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** RGBA pixels (Uint8Array, width*height*4) → PNG buffer. */
export function encodePng(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Swatch icon: background colour with a grid of rounded colour dots.
 * colors: [background, ...dots] (CSS colour strings).
 */
export function swatchIcon(colors, size = 256) {
  const [bg, ...dots] = colors.map(asColor);
  const px = new Uint8Array(size * size * 4);
  const radius = size * 0.22;
  const n = Math.max(1, dots.length);
  const cols = n <= 2 ? n : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const cell = (size * 0.7) / Math.max(cols, rows);
  const dotR = cell * 0.36;
  const ox = (size - cols * cell) / 2, oy = (size - rows * cell) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // rounded tile mask
      const dx = Math.max(radius - x, 0, x - (size - 1 - radius));
      const dy = Math.max(radius - y, 0, y - (size - 1 - radius));
      const out = Math.hypot(dx, dy) - radius;
      const tileA = out <= -1 ? 1 : out >= 0 ? 0 : -out;
      let c = bg;
      for (let k = 0; k < dots.length; k++) {
        const cx = ox + (k % cols + 0.5) * cell, cy = oy + (Math.floor(k / cols) + 0.5) * cell;
        if (Math.hypot(x - cx, y - cy) <= dotR) { c = dots[k]; break; }
      }
      px[i] = c.r; px[i + 1] = c.g; px[i + 2] = c.b; px[i + 3] = Math.round(255 * tileA);
    }
  }
  return encodePng(size, size, px);
}
