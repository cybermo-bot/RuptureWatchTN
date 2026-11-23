import { NextResponse, type NextRequest } from 'next/server';
import { getPublicStatus, isUuid } from '@/lib/public/medicine';

// "Préviens-moi": the phone asks for the public status of the medicines it follows, each time
// RuptureWatch opens. The list is not stored or logged here; the answer is the same public
// status anyone can read on the medicine's page.
const MAX = 20;

export async function GET(request: NextRequest) {
  const ids = [...new Set((request.nextUrl.searchParams.get('ids') ?? '').split(','))].filter(isUuid).slice(0, MAX);
  try {
    const statuses = await Promise.all(ids.map(async (id) => [id, await getPublicStatus(id)] as const));
    const body = Object.fromEntries(statuses.map(([id, s]) => [id, { level: s.level, since: s.since }]));
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'status_failed' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
