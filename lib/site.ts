// The site's public origin, for links in WhatsApp messages and for Open Graph images.
// NEXT_PUBLIC_SITE_URL wins when set; on Vercel, the production domain; otherwise the
// prototype's address.

const FALLBACK = 'https://rupturewatch-tn.vercel.app';

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && /^https?:\/\/[^\s/]+$/.test(explicit.replace(/\/$/, ''))) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel && /^[a-z0-9.-]+$/i.test(vercel)) return `https://${vercel}`;
  return FALLBACK;
}
