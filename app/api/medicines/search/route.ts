import { NextResponse, type NextRequest } from 'next/server';
import { searchMedicines } from '@/lib/db/medicines';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';
  try {
    const results = await searchMedicines(q);
    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (error) {
    console.error('medicine search failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'search_failed' }, { status: 500 });
  }
}
