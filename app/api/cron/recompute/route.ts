import { NextResponse, type NextRequest } from 'next/server';
import { safeEqual } from '@/lib/whatsapp/inbound';
import { recomputeAll } from '@/lib/signals/recompute';
import { supabaseSignalStore } from '@/lib/signals/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Daily re-evaluation of every molecule with a signal row, so time-based rules
 * (quiet period, stale, cleared expiry) apply without new reports.
 * Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization') ?? '';
  if (!secret || !safeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const summary = await recomputeAll(supabaseSignalStore(), new Date());
    console.info('cron recompute', summary);
    return NextResponse.json(summary, { status: summary.failed ? 500 : 200 });
  } catch (error) {
    console.error('cron recompute failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
