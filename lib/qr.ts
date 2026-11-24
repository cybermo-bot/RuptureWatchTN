// A QR code for a link of this site, drawn on the server as SVG by `qrcode` (already used by the
// tester invitation; docs/DECISIONS.md). The dark modules take the text colour of their container
// (currentColor), so the code follows the design tokens. No client JavaScript.

import 'server-only';
import QRCode from 'qrcode';

export { absoluteUrl } from '@/lib/site-url';

/** The SVG of a QR code for `url`; only the QR modules, with the dark ones in currentColor. */
export async function qrSvg(url: string): Promise<string> {
  const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#000000', light: '#ffffff' } });
  return svg.replace(/stroke="#000000"/g, 'stroke="currentColor"');
}
