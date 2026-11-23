import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Refreshes the Supabase session cookie on page requests, as recommended by @supabase/ssr.
// No authorisation decision is taken here: pages and the database check access themselves.
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Validates and, if needed, refreshes the token. Do not remove.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: [
    // Skip static files, images and the API routes that do not use the visitor session.
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*opengraph-image|api/whatsapp|api/health|api/cron|api/places|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)',
  ],
};
