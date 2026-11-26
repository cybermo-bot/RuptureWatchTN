// Pilot-3 item 2: which presentations pharmacies name on their reports. Read through the two
// database functions (migration 20261126020000_presentations_reported.sql); never a pharmacy.
import 'server-only';
import { createAnonClient, createUserClient } from '@/lib/db/server';

/** The window of presentations_reported, in days (fixed in the function). */
export const PRESENTATIONS_WINDOW_DAYS = 14;

export interface ReportedPresentation {
  medicine_id: string;
  label: string;
  brand: string;
  /** Distinct pharmacies over the window; '<3' below 3. */
  pharmacies: number | '<3';
}

export interface NamedPresentation {
  medicine_id: string;
  label: string;
  brand: string;
}

/**
 * For the coordination unit, the centrale and hospitals. Null when the list cannot be read (for
 * example before the migration is applied): the panel then shows nothing rather than failing.
 */
export async function presentationsReported(moleculeId: string): Promise<ReportedPresentation[] | null> {
  const { data, error } = await (await createUserClient()).rpc('presentations_reported', { p_molecule_id: moleculeId });
  if (error) {
    console.error('presentations_reported failed', { code: error.code });
    return null;
  }
  return (data ?? []) as ReportedPresentation[];
}

/** For the public page: product names only, and only while « confirmée » on real data. */
export async function presentationsReportedPublic(moleculeId: string): Promise<NamedPresentation[]> {
  const { data, error } = await createAnonClient().rpc('presentations_reported_public', { p_molecule_id: moleculeId });
  if (error) {
    console.error('presentations_reported_public failed', { code: error.code });
    return [];
  }
  return (data ?? []) as NamedPresentation[];
}
