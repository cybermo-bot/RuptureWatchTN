// A QR code for a link of this site, drawn on the server as SVG by `qrcode` (already used by the
// tester invitation; docs/DECISIONS.md). The dark modules take the text colour of their container
// (currentColor), so the code follows the design tokens. No client JavaScript.

import 'server-only';
import { headers } from 'next/headers';
import QRCode from 'qrcode';

/** The absolute URL of a path on the host that served this request (preview or production). */
export async function absoluteUrl(path: string): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}${path}`;
}

/** The SVG of a QR code for `url`; only the QR modules, with the dark ones in currentColor. */
export async function qrSvg(url: string): Promise<string> {
  const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#000000', light: '#ffffff' } });
  return svg.replace(/stroke="#000000"/g, 'stroke="currentColor"');
}
