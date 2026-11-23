// A visitor's availability request as the public may see it (request_answers_public): counts
// of pharmacies asked and answering (small counts as "<3"), and only the pharmacies that said
// "disponible" and chose to show themselves (CLAUDE.md rule 1, the one exception).

import 'server-only';
import { createAnonClient } from '@/lib/db/server';
import type { Origin } from '@/lib/signal';
import { isUuid } from './medicine';

export interface ShownAnswer {
  display_name: string;
  latitude: number | null;
  longitude: number | null;
  public_address: string | null;
  answered_at: string;
  origin: Origin;
}

export interface PublicRequest {
  request_id: string;
  molecule_id: string;
  governorate_code: string;
  created_at: string;
  expires_at: string;
  asked: string;
  answered: string;
  available: ShownAnswer[];
}

export async function getPublicRequest(id: string): Promise<PublicRequest | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await createAnonClient().rpc('request_answers_public', { p_request_id: id });
  if (error) throw new Error(`request_answers_public: ${error.message}`);
  return (data as PublicRequest | null) ?? null;
}

/** Whole minutes until a time, at least 1 (the server's clock, read once per page). */
export function minutesUntil(at: string): number {
  return Math.max(1, Math.ceil((Date.parse(at) - Date.now()) / 60_000));
}

export function hasPassed(at: string): boolean {
  return Date.parse(at) <= Date.now();
}
