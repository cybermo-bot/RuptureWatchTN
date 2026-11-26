'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { getCurrentSession, type CurrentSession } from '@/lib/auth/session';
import { createUserClient } from '@/lib/db/server';
import { isOneClickPharmacy, isShowcaseMolecule } from '@/lib/demo/showcase';
import { hasReportedNotDelivered, signalsFor } from '@/lib/pharmacy/data';
import { DELAY_DAYS, type DelayChoice } from '@/lib/pharmacy/delay';
import type { Level } from '@/lib/signal';
import { recomputeSignal } from '@/lib/signals/recompute';
import { supabaseSignalStore } from '@/lib/signals/store';
import { REPORTS_PER_10_MIN, TEN_MINUTES_MS } from '@/lib/limits';
import { notifyLevelChange } from '@/lib/whatsapp/notify';

const DAY = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


export type ReportState =
  | { status: 'idle' }
  | { status: 'too_early' }
  | { status: 'error' }
  | { status: 'rate_limited' }
  | { status: 'showcase' };

/** Reports filed by the signed-in pharmacy in the last ten minutes (row-level security: its own only). */
async function recentReports(supabase: Awaited<ReturnType<typeof createUserClient>>, now: Date): Promise<number> {
  const { count, error } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .gte('reported_at', new Date(now.getTime() - TEN_MINUTES_MS).toISOString());
  if (error) throw new Error(`recent reports: ${error.code}`);
  return count ?? 0;
}

async function requirePharmacy(): Promise<CurrentSession | null> {
  const session = await getCurrentSession();
  return session?.organisation.type === 'pharmacy' ? session : null;
}

/**
 * A one-click demo pharmacy may not report a showcase medicine (lib/demo/showcase.ts): one juror's
 * report would change the demonstration for every visitor (pilot-1 item 3). Checked on the server
 * before any insert; the screens only tag those medicines. Refuses when the name cannot be read.
 */
async function showcaseLockedFor(session: CurrentSession, moleculeId: string): Promise<boolean> {
  if (!isOneClickPharmacy(session.organisation.id)) return false;
  const supabase = await createUserClient();
  const { data, error } = await supabase.from('molecules').select('name').eq('id', moleculeId).maybeSingle();
  if (error) return true;
  return data ? isShowcaseMolecule(data.name as string) : false;
}

function moleculeIdFrom(formData: FormData): string | null {
  const id = String(formData.get('molecule_id') ?? '');
  return UUID.test(id) ? id : null;
}

/**
 * Recomputes after a report; the report is saved even if this fails (the daily run catches up).
 * A level change also goes to the linked pharmacies on WhatsApp, after the response.
 */
async function recompute(moleculeId: string, now: Date, reporterId: string): Promise<{ before: Level; after: Level } | null> {
  try {
    const result = await recomputeSignal(supabaseSignalStore(), moleculeId, now);
    if (result.eventId !== null) after(() => notifyLevelChange(result, reporterId));
    return { before: result.previous, after: result.evaluation.level };
  } catch (error) {
    console.error('recompute after report failed', moleculeId, error instanceof Error ? error.message : error);
    return null;
  }
}

async function follow(session: CurrentSession, moleculeId: string) {
  const supabase = await createUserClient();
  const { error } = await supabase
    .from('followed_molecules')
    .insert({ organisation_id: session.organisation.id, molecule_id: moleculeId });
  // 23505: already followed.
  if (error && error.code !== '23505') throw new Error(`follow: ${error.message}`);
}

function resultUrl(moleculeId: string, type: 'nd' | 'da', levels: { before: Level; after: Level } | null) {
  const params = new URLSearchParams({ type });
  if (levels) {
    params.set('avant', levels.before);
    params.set('apres', levels.after);
  }
  return `/pharmacie/molecule/${moleculeId}/resultat?${params}`;
}

/**
 * Tap two of the report flow. "Moins de 3 jours" inserts nothing and returns the "too early"
 * state. The three other choices insert the report with the visitor's session (row-level
 * security applies), follow the molecule, recompute the signal, and open the result screen.
 */
export async function submitReport(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const session = await requirePharmacy();
  const moleculeId = moleculeIdFrom(formData);
  const choice = String(formData.get('delay') ?? '') as DelayChoice;
  if (!session || !moleculeId) return { status: 'error' };
  if (choice === 'lt3') return { status: 'too_early' };
  if (!(choice in DELAY_DAYS)) return { status: 'error' };
  if (await showcaseLockedFor(session, moleculeId)) return { status: 'showcase' };

  const now = new Date();
  const supabase = await createUserClient();
  if ((await recentReports(supabase, now)) >= REPORTS_PER_10_MIN) return { status: 'rate_limited' };
  const { error } = await supabase.from('reports').insert({
    organisation_id: session.organisation.id,
    governorate_code: session.organisation.governorateCode,
    molecule_id: moleculeId,
    kind: 'not_delivered',
    ordered_at: new Date(now.getTime() - DELAY_DAYS[choice as keyof typeof DELAY_DAYS] * DAY).toISOString(),
    reported_at: now.toISOString(),
    channel: 'web',
    origin: session.organisation.origin,
  });
  if (error) {
    console.error('report insert failed', { code: error.code });
    return { status: 'error' };
  }

  try {
    await follow(session, moleculeId);
  } catch (followError) {
    console.error(followError instanceof Error ? followError.message : followError);
  }
  const levels = await recompute(moleculeId, now, session.organisation.id);
  revalidatePath('/pharmacie', 'layout');
  redirect(resultUrl(moleculeId, 'nd', levels));
}

/** "Livré à nouveau": only when the level is likely or confirmed and this pharmacy reported it. */
export async function reportDeliveredAgain(formData: FormData): Promise<void> {
  const session = await requirePharmacy();
  const moleculeId = moleculeIdFrom(formData);
  if (!session || !moleculeId) redirect('/pharmacie');
  if (await showcaseLockedFor(session, moleculeId)) redirect(`/pharmacie/molecule/${moleculeId}?erreur=demo`);

  const signal = (await signalsFor([moleculeId])).get(moleculeId);
  const allowed =
    (signal?.level === 'likely' || signal?.level === 'confirmed') && (await hasReportedNotDelivered(moleculeId));
  if (!allowed) redirect(`/pharmacie/molecule/${moleculeId}`);

  const now = new Date();
  const supabase = await createUserClient();
  if ((await recentReports(supabase, now)) >= REPORTS_PER_10_MIN) redirect(`/pharmacie/molecule/${moleculeId}?erreur=limite`);
  const { error } = await supabase.from('reports').insert({
    organisation_id: session.organisation.id,
    governorate_code: session.organisation.governorateCode,
    molecule_id: moleculeId,
    kind: 'delivered_again',
    ordered_at: null,
    reported_at: now.toISOString(),
    channel: 'web',
    origin: session.organisation.origin,
  });
  if (error) {
    console.error('delivered_again insert failed', { code: error.code });
    redirect(`/pharmacie/molecule/${moleculeId}?erreur=1`);
  }
  const levels = await recompute(moleculeId, now, session.organisation.id);
  revalidatePath('/pharmacie', 'layout');
  redirect(resultUrl(moleculeId, 'da', levels));
}

export async function followMolecule(formData: FormData): Promise<void> {
  const session = await requirePharmacy();
  const moleculeId = moleculeIdFrom(formData);
  if (!session || !moleculeId) return;
  await follow(session, moleculeId);
  revalidatePath('/pharmacie', 'layout');
}

export async function unfollowMolecule(formData: FormData): Promise<void> {
  const session = await requirePharmacy();
  const moleculeId = moleculeIdFrom(formData);
  if (!session || !moleculeId) return;
  const supabase = await createUserClient();
  const { error } = await supabase.from('followed_molecules').delete().eq('molecule_id', moleculeId);
  if (error) console.error('unfollow failed', { code: error.code });
  revalidatePath('/pharmacie', 'layout');
}

export async function markAlertRead(formData: FormData): Promise<void> {
  const id = String(formData.get('alert_id') ?? '');
  if (!UUID.test(id)) return;
  const supabase = await createUserClient();
  const { error } = await supabase.from('alerts').update({ read_at: new Date().toISOString() }).eq('id', id).is('read_at', null);
  if (error) console.error('mark alert read failed', { code: error.code });
  revalidatePath('/pharmacie', 'layout');
}

export async function markAllAlertsRead(): Promise<void> {
  const session = await getCurrentSession();
  if (!session) return;
  const supabase = await createUserClient();
  const { error } = await supabase
    .from('alerts')
    .update({ read_at: new Date().toISOString() })
    .eq('organisation_id', session.organisation.id)
    .is('read_at', null);
  if (error) console.error('mark all alerts read failed', { code: error.code });
  revalidatePath('/pharmacie', 'layout');
}
