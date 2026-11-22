import { NextResponse, type NextRequest } from 'next/server';
import { searchCatalogue } from '@/lib/db/medicines';

/** Catalogue search: `molecules` (a DCI leads to its molecule first), then `results` (medicines). */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';
  try {
    const body = await searchCatalogue(q);
    return NextResponse.json(body, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (error) {
    console.error('medicine search failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'search_failed' }, { status: 500 });
  }
}
