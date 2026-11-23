import 'server-only';
import { connection } from 'next/server';
import { requestsConfigured } from '@/lib/availability/device';
import { createAnonClient } from '@/lib/db/server';

export interface Health {
  status: 'ok' | 'error';
  /** Read from the database (system_meta), so a value here proves the database answered. */
  schemaVersion: number | null;
  /** Git commit of the deployment (Vercel system variable), null when run locally. */
  commit: string | null;
  checkedAt: string;
  /** Patients' requests can be taken (their device-hash salt is configured). Yes or no only. */
  patientRequests: boolean;
}

export async function checkHealth(): Promise<Health> {
  await connection(); // always a live check, never prerendered
  const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? null;
  const checkedAt = new Date().toISOString();
  const patientRequests = requestsConfigured();
  try {
    const { data, error } = await createAnonClient()
      .from('system_meta')
      .select('schema_version')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'no row');
    return { status: 'ok', schemaVersion: data.schema_version as number, commit, checkedAt, patientRequests };
  } catch (error) {
    console.error('health check failed', error instanceof Error ? error.message : error);
    return { status: 'error', schemaVersion: null, commit, checkedAt, patientRequests };
  }
}
