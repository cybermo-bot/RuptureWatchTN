// Builds the PNG app icons and app/favicon.ico from the mark in lib/og/mark.tsx (same drawing
// as app/icon.svg). Run after changing the mark: npm run icons:build. Writes:
//   app/favicon.ico            16, 32 and 48 px (PNG entries), for browsers asking /favicon.ico
//   app/apple-icon.png         180 px, square (iOS rounds the corners itself)
//   public/icons/icon-192.png  and icon-512.png, for the web app manifest

import { writeFile } from 'node:fs/promises';
import { ImageResponse } from 'next/og';
import { Mark } from '../lib/og/mark';

async function png(size: number, rounded = true): Promise<Buffer> {
  const res = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex' }}>
        <Mark size={size} rounded={rounded} />
      </div>
    ),
    { width: size, height: size },
  );
  return Buffer.from(await res.arrayBuffer());
}

/** An ICO file holding PNG images (supported by every current browser). */
function ico(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

async function main() {
  const small = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(size) })));
  await writeFile('app/favicon.ico', ico(small));
  await writeFile('app/apple-icon.png', await png(180, false));
  await writeFile('public/icons/icon-192.png', await png(192));
  await writeFile('public/icons/icon-512.png', await png(512));
  console.log('Wrote app/favicon.ico, app/apple-icon.png, public/icons/icon-192.png, public/icons/icon-512.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
