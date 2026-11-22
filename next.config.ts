import type { NextConfig } from 'next';

// Cache Components is off on purpose: every page here reads the session cookie,
// and the request-time model is simpler to reason about with Supabase auth.
// See docs/DECISIONS.md.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Two root layouts (app/(site) and app/(public)): one 404 page for unknown addresses.
  experimental: { globalNotFound: true },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
