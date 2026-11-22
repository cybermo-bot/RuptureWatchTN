// GET /api/coordination/export?format=csv|json — coordinators only.
// Aggregates only: signals_view and governorate_counts through the coordinator's own session,
// so every count is already suppressed by the database. Documented on /coordination/export.

import { getCurrentSession } from '@/lib/auth/session';
import { toCsv, toJson, type ExportSignal } from '@/lib/coordination/export';
import { createUserClient } from '@/lib/db/server';
import { governorateCounts, listSignals, sortSignals } from '@/lib/signals/views';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const session = await getCurrentSession();
  if (!session || session.organisation.type !== 'coordinator') {
    return Response.json({ error: 'forbidden', message: 'The export is for the coordination unit.' }, { status: 403 });
  }
  const format = new URL(request.url).searchParams.get('format') === 'json' ? 'json' : 'csv';
  const supabase = await createUserClient();
  const now = new Date();
  const signals = sortSignals(await listSignals(supabase));
  const rows: ExportSignal[] = await Promise.all(
    signals.map(async (signal) => ({ signal, counts: await governorateCounts(supabase, signal.molecule_id, now) })),
  );
  const stamp = now.toISOString().slice(0, 10);
  const headers = { 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename="rupturewatch-signaux-${stamp}.${format}"` };
  if (format === 'json') {
    return new Response(JSON.stringify(toJson(rows, now), null, 2), {
      headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  // UTF-8 byte order mark so spreadsheet programs read the accents correctly.
  return new Response('﻿' + toCsv(rows), { headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8' } });
}
