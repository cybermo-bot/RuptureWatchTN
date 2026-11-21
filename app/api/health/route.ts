import { NextResponse } from 'next/server';
import { checkHealth } from '@/lib/db/health';

// Used by the daily keep-alive workflow and by humans. Real database query, no cache.
export async function GET() {
  const health = await checkHealth();
  return NextResponse.json(health, {
    status: health.status === 'ok' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
