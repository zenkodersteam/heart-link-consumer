/**
 * Generates the app icon, Android adaptive icon and splash logo from the
 * HeartLink mark, so every launcher asset comes from one definition instead of
 * being traced by hand at each size.
 *
 * Run with `node scripts/generate-brand-assets.mjs`. Output is committed - this
 * script exists so the assets can be regenerated when the brand moves, not as a
 * build step.
 *
 * There is no image library in this project (no sharp, no ImageMagick, no
 * librosvg), and adding one for three PNGs is not worth the install, so this
 * rasterises the mark directly and writes the PNG with zlib. The mark is drawn
 * from the classic heart curve rather than traced from
 * assets/logo/heartlink-emblem.png, which is only 296x251 and would be a blurry
 * mess upscaled to the 1024x1024 that iOS and Android both want.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── Brand ────────────────────────────────────────────────────────────────────
// Values from heart-link-consumer/src/theme.ts and the HeartLink Branding Book.
const PURPLE_DEEP = [0x16, 0x05, 0x1f];
const PURPLE = [0x2e, 0x12, 0x40];
const PINK = [0xe9, 0x1e, 0x73];
const PINK_BRIGHT = [0xff, 0x4f, 0x92];
const PINK_DEEP = [0xc8, 0x18, 0x60];
const GOLD = [0xd6, 0xa8, 0x4f];
const GOLD_DEEP = [0xc9, 0x91, 0x2e];

// ── Tiny PNG writer (8-bit RGBA, no interlace) ───────────────────────────────
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  // 10..12 = compression, filter, interlace: all 0

  // One filter byte (0 = None) per scanline, then the row's pixels.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Drawing helpers ──────────────────────────────────────────────────────────
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/**
 * Classic heart curve: (x² + y² − 1)³ − x²y³ ≤ 0, with y pointing up.
 * `scale` is the half-width of the curve's unit space in pixels.
 */
function insideHeart(px, py, cx, cy, scale) {
  const x = (px - cx) / scale;
  const y = (cy - py) / scale;
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0;
}

/**
 * Extent of the curve in unit space, measured rather than hardcoded.
 *
 * The heart is not symmetric about y and sits low in its own unit box, so
 * centring on the curve's origin leaves it visibly below centre - which
 * matters on Android, where only the middle ~66% of the adaptive icon is
 * guaranteed to survive the launcher's mask.
 */
const EXTENT = (() => {
  const STEP = 0.002;
  let xMax = 0;
  let yMin = 0;
  let yMax = 0;
  for (let x = -2; x <= 2; x += STEP) {
    for (let y = -2; y <= 2; y += STEP) {
      const a = x * x + y * y - 1;
      if (a * a * a - x * x * y * y * y > 0) continue;
      if (x > xMax) xMax = x;
      if (y > yMax) yMax = y;
      if (y < yMin) yMin = y;
    }
  }
  return { xMax, yMin, yMax };
})();

/** Keyhole: a circle over a trapezoid, as on the HeartLink emblem. */
function insideKeyhole(px, py, cx, cy, r) {
  const dx = px - cx;
  const dy = py - cy;
  if (dx * dx + dy * dy <= r * r) return true;
  const stemTop = cy + r * 0.45;
  const stemBottom = cy + r * 2.5;
  if (dy < r * 0.45 || py > stemBottom) return false;
  const t = (py - stemTop) / (stemBottom - stemTop);
  const halfWidth = r * (0.42 + 0.5 * t);
  return Math.abs(dx) <= halfWidth;
}

/**
 * Renders the mark at `size`, supersampling `ss`× per axis for antialiasing.
 *
 * `background` false leaves everything outside the mark transparent, which is
 * what the Android adaptive foreground and the splash logo need; iOS wants an
 * opaque square because it applies its own squircle mask and shows black
 * through any alpha.
 */
function renderMark({ size, ss = 4, background, markScale }) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  // `markScale` is the fraction of the canvas the mark spans horizontally, so
  // the safe-zone maths below is about the drawn shape rather than the curve's
  // arbitrary unit box.
  const outer = (size * markScale) / (2 * EXTENT.xMax);
  const cy = size / 2 + ((EXTENT.yMax + EXTENT.yMin) / 2) * outer;
  const gold = outer * 0.955;
  const inner = outer * 0.9;
  const keyR = outer * 0.19;
  const keyY = cy - outer * 0.12;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = x + (sx + 0.5) / ss;
          const py = y + (sy + 0.5) / ss;

          let col = null;
          let alpha = 0;

          if (background) {
            // Deep purple ground, lifted diagonally so the icon has depth.
            const d = clamp01((px / size) * 0.5 + (py / size) * 0.5);
            col = mix(PURPLE, PURPLE_DEEP, d);
            alpha = 1;

            // Pink bloom behind the heart.
            const dist = Math.hypot(px - cx, py - cy) / (size * 0.52);
            const glow = Math.pow(clamp01(1 - dist), 2.2) * 0.42;
            col = mix(col, PINK, glow);
          }

          if (insideHeart(px, py, cx, cy, outer)) {
            col = PINK_DEEP;
            alpha = 1;
          }
          if (insideHeart(px, py, cx, cy, gold)) {
            // Gold rim, brighter at the top like a bevelled edge.
            col = mix(GOLD, GOLD_DEEP, clamp01((py - (cy - outer)) / (outer * 2)));
            alpha = 1;
          }
          if (insideHeart(px, py, cx, cy, inner)) {
            const t = clamp01((px / size) * 0.35 + (py / size) * 0.85 - 0.1);
            col = mix(PINK_BRIGHT, PINK, t);
            alpha = 1;
          }
          if (insideKeyhole(px, py, cx, keyY, keyR) && insideHeart(px, py, cx, cy, inner)) {
            col = PURPLE;
            alpha = 1;
          }

          if (col && alpha) {
            r += col[0];
            g += col[1];
            b += col[2];
            a += alpha;
          }
        }
      }

      const n = ss * ss;
      const i = (y * size + x) * 4;
      if (a > 0) {
        // Average over covered subsamples so edge colour is not darkened by
        // the transparent ones, then carry coverage into alpha.
        rgba[i] = Math.round(r / a);
        rgba[i + 1] = Math.round(g / a);
        rgba[i + 2] = Math.round(b / a);
        rgba[i + 3] = Math.round((a / n) * 255);
      }
    }
  }
  return rgba;
}

function write(relPath, size, opts) {
  const out = join(ROOT, relPath);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, encodePng(size, size, renderMark({ size, ...opts })));
  console.log(`wrote ${relPath} (${size}x${size})`);
}

// iOS home screen + the Expo `icon`. Opaque; iOS masks the corners itself.
write('assets/icon.png', 1024, { background: true, markScale: 0.66 });

// Android adaptive foreground. Android crops hard - only the middle ~66% of the
// canvas is guaranteed visible - so the mark stays inside that circle.
write('assets/adaptive-icon.png', 1024, { background: false, markScale: 0.46 });

// Splash logo, shown on the brand ground set in app.config.ts.
write('assets/splash-icon.png', 1024, { background: false, markScale: 0.82 });

// Web favicon.
write('assets/favicon.png', 256, { background: true, markScale: 0.72 });
