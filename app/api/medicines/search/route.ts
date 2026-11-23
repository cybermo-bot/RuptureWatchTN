import { NextResponse, type NextRequest } from 'next/server';
import { searchCatalogue } from '@/lib/db/medicines';
import { matchesDpm } from '@/lib/dpm/match';

/**
 * Catalogue search: `molecules` (a DCI leads to its molecule first), then `results` (medicines).
 * When the catalogue has nothing, `dpm` says whether the name is registered in Tunisia (DPM list)
 * without being followed by RuptureWatch.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';
  try {
    const body = await searchCatalogue(q);
    const dpm = body.molecules.length === 0 && body.results.length === 0 && matchesDpm(q);
    return NextResponse.json({ ...body, dpm }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (error) {
    console.error('medicine search failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'search_failed' }, { status: 500 });
  }
}
