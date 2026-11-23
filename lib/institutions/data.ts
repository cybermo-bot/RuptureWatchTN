// Reads for the institutions' spaces (centrale, Ordre, ministry), each through the caller's
// own client, so the database's access rules decide what comes back.

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Origin } from '@/lib/signal';
import { catalogueFacts, type CatalogueFacts } from './catalogue';

export type ArrivalQuantity = 'under_one_month' | 'one_to_three_months' | 'over_three_months';
export const ARRIVAL_QUANTITIES: ArrivalQuantity[] = ['under_one_month', 'one_to_three_months', 'over_three_months'];

export interface Arrival {
  id: string;
  moleculeId: string;
  expectedOn: string;
  quantity: ArrivalQuantity;
  level: 'likely' | 'confirmed';
  announcedAt: string;
  origin: Origin;
}

/** Today in Tunis, as YYYY-MM-DD. */
export function tunisToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' }).format(now);
}

/** The Tunis date `days` days from now, as YYYY-MM-DD (the latest date an arrival may be announced for). */
export function tunisDayIn(days: number, now: Date = new Date()): string {
  return tunisToday(new Date(now.getTime() + days * 86_400_000));
}

export async function loadCatalogueFacts(client: SupabaseClient, moleculeIds: string[]): Promise<Map<string, CatalogueFacts>> {
  if (moleculeIds.length === 0) return new Map();
  const { data, error } = await client.from('medicines').select('molecule_id, brand, vei_category').in('molecule_id', moleculeIds);
  if (error) throw new Error(`medicines: ${error.message}`);
  return catalogueFacts(data ?? []);
}

function toArrival(r: Record<string, unknown>): Arrival {
  return {
    id: r.id as string,
    moleculeId: r.molecule_id as string,
    expectedOn: r.expected_on as string,
    quantity: r.quantity as ArrivalQuantity,
    level: r.level_at_announcement as Arrival['level'],
    announcedAt: r.announced_at as string,
    origin: r.origin as Origin,
  };
}

const ARRIVAL_COLUMNS = 'id, molecule_id, expected_on, quantity, level_at_announcement, announced_at, origin';

/** The newest announcement still to come, per molecule (signed-in callers). */
export async function upcomingArrivals(client: SupabaseClient, moleculeIds?: string[]): Promise<Map<string, Arrival>> {
  if (moleculeIds && moleculeIds.length === 0) return new Map();
  let query = client.from('arrival_announcements').select(ARRIVAL_COLUMNS).gte('expected_on', tunisToday());
  if (moleculeIds) query = query.in('molecule_id', moleculeIds);
  const { data, error } = await query.order('announced_at', { ascending: false }).limit(500);
  if (error) throw new Error(`arrival_announcements: ${error.message}`);
  const out = new Map<string, Arrival>();
  for (const row of data ?? []) {
    const a = toArrival(row);
    if (!out.has(a.moleculeId)) out.set(a.moleculeId, a);
  }
  return out;
}

/** Every announcement, newest first, with the molecule's name: the decision log. */
export async function listArrivals(client: SupabaseClient, limit = 50): Promise<(Arrival & { moleculeName: string })[]> {
  const { data, error } = await client
    .from('arrival_announcements')
    .select(`${ARRIVAL_COLUMNS}, molecules ( name )`)
    .order('announced_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`arrival_announcements: ${error.message}`);
  return (data ?? []).map((r) => ({ ...toArrival(r), moleculeName: (r.molecules as unknown as { name: string } | null)?.name ?? '' }));
}

/** What the public may see: the date and origin, only while the medicine is "confirmée". */
export async function publicArrival(client: SupabaseClient, moleculeId: string): Promise<{ expectedOn: string; origin: Origin } | null> {
  const { data, error } = await client.rpc('public_arrival', { p_molecule_id: moleculeId });
  if (error) throw new Error(`public_arrival: ${error.message}`);
  const row = (data as { expected_on: string; origin: Origin }[] | null)?.[0];
  return row ? { expectedOn: row.expected_on, origin: row.origin } : null;
}

export interface OrderMessage {
  id: string;
  body: string;
  sentAt: string;
  origin: Origin;
  senderName?: string;
  governorates?: string[];
}

/** A pharmacy's messages from the Ordre: those addressed to its governorate. */
export async function orderMessagesForMe(client: SupabaseClient, limit = 20): Promise<OrderMessage[]> {
  const { data, error } = await client.rpc('order_messages_for_me', { p_limit: limit });
  if (error) throw new Error(`order_messages_for_me: ${error.message}`);
  return ((data ?? []) as { id: string; body: string; sent_at: string; origin: Origin; sender_name: string }[]).map((m) => ({
    id: m.id,
    body: m.body,
    sentAt: m.sent_at,
    origin: m.origin,
    senderName: m.sender_name,
  }));
}

/** The Ordre's own messages, newest first. */
export async function sentOrderMessages(client: SupabaseClient, limit = 30): Promise<OrderMessage[]> {
  const { data, error } = await client
    .from('order_messages')
    .select('id, body, sent_at, origin, governorate_codes')
    .order('sent_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`order_messages: ${error.message}`);
  return (data ?? []).map((m) => ({
    id: m.id as string,
    body: m.body as string,
    sentAt: m.sent_at as string,
    origin: m.origin as Origin,
    governorates: m.governorate_codes as string[],
  }));
}

export interface NetworkRow {
  governorate_code: string;
  governorate_name: string;
  members: string;
  active: string;
  origins: Origin[];
}

export const NETWORK_ACTIVE_DAYS = 30;

export async function pharmacyNetwork(client: SupabaseClient): Promise<NetworkRow[]> {
  const { data, error } = await client.rpc('pharmacy_network', { p_days: NETWORK_ACTIVE_DAYS });
  if (error) throw new Error(`pharmacy_network: ${error.message}`);
  return (data ?? []) as NetworkRow[];
}

export interface WeekRow {
  week_start: string;
  reports: string;
  pharmacies: string;
  origins: Origin[];
}

export async function networkWeekly(client: SupabaseClient, weeks = 8): Promise<WeekRow[]> {
  const { data, error } = await client.rpc('network_weekly', { p_weeks: weeks });
  if (error) throw new Error(`network_weekly: ${error.message}`);
  return (data ?? []) as WeekRow[];
}

export interface DayActivity {
  day: string;
  pharmacies: string;
  requests: string;
  unanswered: string;
}

/** Reports and patients' demand per day, for one medicine or (null) the country. Ministry only. */
export async function dailyActivity(client: SupabaseClient, moleculeId: string | null, days = 30, minUndeliveredHours = 72): Promise<DayActivity[]> {
  const { data, error } = await client.rpc('daily_activity', { p_molecule_id: moleculeId, p_days: days, p_min_undelivered_hours: minUndeliveredHours });
  if (error) throw new Error(`daily_activity: ${error.message}`);
  return (data ?? []) as DayActivity[];
}

export async function demandTotals(client: SupabaseClient, days = 7): Promise<{ requests: string; unanswered: string }> {
  const { data, error } = await client.rpc('demand_totals', { p_days: days });
  if (error) throw new Error(`demand_totals: ${error.message}`);
  return ((data ?? []) as { requests: string; unanswered: string }[])[0] ?? { requests: '0', unanswered: '0' };
}
