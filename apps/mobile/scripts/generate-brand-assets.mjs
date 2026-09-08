/**
 * Derives every launcher icon and favicon in the repo from one drawing:
 * `apps/mobile/assets/heartlink-app-icon.png`.
 *
 * Run with `node scripts/generate-brand-assets.mjs` from `apps/mobile`. Output
 * is committed - this script exists so the assets can be regenerated when the
 * brand moves, not as a build step. Replace the source PNG, re-run, and every
 * surface follows; the phone app also needs `npx expo prebuild -p ios` after,
 * because the iOS icons are baked into `ios/`.
 *
 * The earlier version of this script drew the mark procedurally with a hand
 * rolled PNG writer, because nothing in the repo could resize an image. The
 * artwork is now supplied as a real drawing, so this reads it with `sharp`
 * (already present - Expo's own image tooling depends on it) and only resizes,
 * flattens and pads.
 *
 * Two rules drive the shapes below:
 *
 * - iOS icons must be opaque and square. Alpha is rendered as black, and iOS
 *   applies its own squircle mask, so the artwork is trimmed to its tile and
 *   flattened onto the brand ground rather than left with soft corners.
 * - Android adaptive foregrounds are cropped hard by whatever mask the launcher
 *   uses; only the middle ~66% is guaranteed to survive. The tile is scaled to
 *   sit inside that circle, on a transparent canvas, over the ground colour set
 *   in app.config.ts.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const MOBILE = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = join(MOBILE, '..', '..');

// sharp lives in the workspace root, hoisted there by Expo's image tooling.
const sharp = createRequire(join(REPO, 'package.json'))('sharp');

const SOURCE = join(MOBILE, 'assets', 'heartlink-app-icon.png');

/** The page ground, from packages/design-tokens. Icons sit on it opaquely. */
const GROUND = '#FDF9F6';

/**
 * The drawing is a tile floating on transparency, and the margin around it is
 * not quite even. Everything below is cut from the tile's own bounding box -
 * found by alpha rather than hard-coded - so the artwork is centred on its
 * shape instead of on the canvas it happens to sit in.
 */
let cachedTile;
async function tile() {
  if (cachedTile) return cachedTile;

  const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] > 200) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Square the box around the tile's centre: a lopsided crop would show up as
  // the mark sitting off-centre in the launcher.
  const side = Math.max(maxX - minX + 1, maxY - minY + 1);
  const left = Math.round((minX + maxX + 1 - side) / 2);
  const top = Math.round((minY + maxY + 1 - side) / 2);

  cachedTile = { left, top, side };
  return cachedTile;
}

/**
 * Square, opaque, full-bleed: iOS home screen, Apple touch icon.
 *
 * The crop reaches slightly inside the tile so the artwork's own rounded
 * corners fall outside the icon, leaving iOS's squircle to do the rounding.
 * Left whole, the two radii stack up and the icon reads as a card inside a
 * card. Any corner that is still transparent lands on the ground colour.
 */
async function opaque(size) {
  const { left, top, side } = await tile();
  const inset = Math.round(side * 0.06);
  return sharp(SOURCE)
    .extract({ left: left + inset, top: top + inset, width: side - inset * 2, height: side - inset * 2 })
    .resize(size, size, { fit: 'fill' })
    .flatten({ background: GROUND })
    .png()
    .toBuffer();
}

/** Square, transparent outside the tile: browser tabs, Android foreground. */
async function transparent(size, scale = 1) {
  const { left, top, side } = await tile();
  const inner = Math.round(size * scale);
  const pad = Math.round((size - inner) / 2);
  return sharp(SOURCE)
    .extract({ left, top, width: side, height: side })
    .resize(inner, inner, { fit: 'fill' })
    .extend({
      top: pad,
      bottom: size - inner - pad,
      left: pad,
      right: size - inner - pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

/**
 * A white silhouette of the heart, for the Android notification tray. Android
 * throws away every colour in a notification icon and keeps only the alpha, so
 * a full-colour icon arrives as a white blob.
 *
 * The shape is lifted from the artwork rather than drawn again: pixels that are
 * strongly coloured or nearly black are the mark, cream is the ground. That
 * also catches the orbiting dots and rings, so only the blob connected to the
 * centre of the drawing - the heart - is kept, flood filled from the middle.
 * The keyhole is inside that blob and fills in with it, which is what you want
 * at 24dp.
 */
async function silhouette(size) {
  const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;

  const mark = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const p = i * channels;
    if (data[p + 3] < 128) continue;
    const max = Math.max(data[p], data[p + 1], data[p + 2]);
    const min = Math.min(data[p], data[p + 1], data[p + 2]);
    const saturation = max === 0 ? 0 : (max - min) / max;
    if ((saturation > 0.45 && max > 60) || max < 90) mark[i] = 1;
  }

  // Flood fill from the centre to keep the heart and drop the orbit.
  const keep = new Uint8Array(w * h);
  const start = Math.floor(h / 2) * w + Math.floor(w / 2);
  if (!mark[start]) throw new Error('the centre of the artwork is not part of the mark');
  const queue = [start];
  keep[start] = 1;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  while (queue.length) {
    const i = queue.pop();
    const x = i % w;
    const y = (i - x) / w;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
      if (j >= 0 && mark[j] && !keep[j]) {
        keep[j] = 1;
        queue.push(j);
      }
    }
  }

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;

  // The gloss on the heart is pale enough to read as ground, which leaves the
  // silhouette full of holes. Anything enclosed by the shape is filled in:
  // flood the gaps from the edge of the crop, and whatever the flood cannot
  // reach was inside.
  const outside = new Uint8Array(cw * ch);
  const edges = [];
  for (let x = 0; x < cw; x++) edges.push(x, (ch - 1) * cw + x);
  for (let y = 0; y < ch; y++) edges.push(y * cw, y * cw + cw - 1);
  for (const e of edges) {
    if (!keep[(Math.floor(e / cw) + minY) * w + (e % cw) + minX] && !outside[e]) {
      outside[e] = 1;
      const gaps = [e];
      while (gaps.length) {
        const i = gaps.pop();
        const x = i % cw;
        const y = (i - x) / cw;
        for (const j of [x > 0 ? i - 1 : -1, x < cw - 1 ? i + 1 : -1, y > 0 ? i - cw : -1, y < ch - 1 ? i + cw : -1]) {
          if (j >= 0 && !outside[j] && !keep[(Math.floor(j / cw) + minY) * w + (j % cw) + minX]) {
            outside[j] = 1;
            gaps.push(j);
          }
        }
      }
    }
  }

  const white = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const p = (y * cw + x) * 4;
      white[p] = 255;
      white[p + 1] = 255;
      white[p + 2] = 255;
      white[p + 3] = outside[y * cw + x] ? 0 : 255;
    }
  }

  // Android draws the icon inside a 24dp box with the art inset; 70% leaves the
  // margin the platform expects instead of a silhouette jammed against the edge.
  const inner = Math.round(size * 0.7);
  const pad = Math.round((size - inner) / 2);
  return sharp(white, { raw: { width: cw, height: ch, channels: 4 } })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: pad,
      bottom: size - inner - pad,
      left: pad,
      right: size - inner - pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

/**
 * An .ico wrapping PNGs, which every browser in use has read for a decade.
 * sharp cannot write .ico, and the container is a 6-byte header plus one
 * 16-byte directory entry per image, so it is assembled here.
 */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // 0 means 256
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

function write(absPath, buffer, note) {
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, buffer);
  console.log(`wrote ${relative(REPO, absPath)} - ${note}`);
}

// ── Phone app ────────────────────────────────────────────────────────────────

// iOS home screen and the Expo `icon`.
write(join(MOBILE, 'assets/icon.png'), await opaque(1024), '1024 opaque');

// Android adaptive foreground, inside the guaranteed-visible circle.
write(join(MOBILE, 'assets/adaptive-icon.png'), await transparent(1024, 0.66), '1024 inset 66%');

// Expo web favicon.
write(join(MOBILE, 'assets/favicon.png'), await transparent(256), '256');

// Android's splash is a centred logo on a plain ground - the platform's own
// splash API allows nothing else - so the phone splash artwork cannot be used
// there. This is the tile, kept small enough to survive the circular mask.
write(join(MOBILE, 'assets/splash-icon.png'), await transparent(1024, 0.72), '1024 inset 72%');

// Android notification tray.
write(join(MOBILE, 'assets/notification-icon.png'), await silhouette(192), '192 white silhouette');

// ── Website and admin console ────────────────────────────────────────────────
// Next.js serves these by filename: `icon` is the tab icon, `apple-icon` the
// iOS home-screen bookmark (opaque, because Safari does not mask transparency).

for (const app of ['web', 'admin']) {
  const appDir = join(REPO, 'apps', app, 'src', 'app');
  write(join(appDir, 'icon.png'), await transparent(512), '512');
  write(join(appDir, 'apple-icon.png'), await opaque(180), '180 opaque');
  write(
    join(appDir, 'favicon.ico'),
    ico(
      await Promise.all(
        [16, 32, 48].map(async (size) => ({ size, png: await transparent(size) })),
      ),
    ),
    'ico 16/32/48',
  );
}
