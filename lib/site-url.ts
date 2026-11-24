// The absolute URL of a path on the host that served this request (a preview deployment points
// to itself, production to production). Used by the QR codes and the "Partager ce statut" link.

import 'server-only';
import { headers } from 'next/headers';

export async function absoluteUrl(path: string): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}${path}`;
}
