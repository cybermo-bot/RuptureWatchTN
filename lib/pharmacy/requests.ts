// The patients' availability requests routed to the signed-in pharmacy (its governorate, still
// open, not answered yet), read through requests_for_my_pharmacy: never the device hash, never
// another pharmacy's answer.

import 'server-only';
import { createUserClient } from '@/lib/db/server';

export interface OpenRequest {
  request_id: string;
  molecule_id: string;
  molecule_name: string;
  medicine_id: string | null;
  medicine_label: string | null;
  delegation: string | null;
  created_at: string;
  expires_at: string;
  /** Minutes left before the request closes, by this server's clock when the page was drawn. */
  minutes_left: number;
}

export async function getOpenRequests(): Promise<OpenRequest[]> {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc('requests_for_my_pharmacy');
  if (error) throw new Error(`requests_for_my_pharmacy: ${error.message}`);
  const now = Date.now();
  return ((data ?? []) as Omit<OpenRequest, 'minutes_left'>[]).map((r) => ({
    ...r,
    minutes_left: Math.max(1, Math.ceil((Date.parse(r.expires_at) - now) / 60_000)),
  }));
}

export async function countOpenRequests(): Promise<number> {
  return (await getOpenRequests()).length;
}
