'use server';

import { hashDeviceId, isDeviceId, RATE_LIMITED } from '@/lib/availability/device';
import { createServiceClient } from '@/lib/db/server';
import { GOVERNORATE_CODES } from '@/lib/public/governorates';
import { isUuid } from '@/lib/public/medicine';

// Creates an availability request. Receives only the molecule, a governorate code and the
// phone's random id; the id is hashed here and the hash is all the database keeps, to refuse a
// second request for the same medicine within 24 hours (CLAUDE.md rule 3). No name, no phone
// number, no position, no free text.

export type RequestResult = { ok: true; id: string } | { ok: false; error: 'invalid' | 'limited' | 'failed' };

export async function createRequest(input: { moleculeId: unknown; governorate: unknown; deviceId: unknown }): Promise<RequestResult> {
  const { moleculeId, governorate, deviceId } = input;
  if (!isUuid(moleculeId) || typeof governorate !== 'string' || !GOVERNORATE_CODES.has(governorate) || !isDeviceId(deviceId)) {
    return { ok: false, error: 'invalid' };
  }
  try {
    const { data, error } = await createServiceClient().rpc('create_availability_request', {
      p_molecule_id: moleculeId,
      p_medicine_id: null,
      p_governorate_code: governorate,
      p_delegation: null,
      p_device_hash: hashDeviceId(deviceId),
      p_origin: 'tester',
    });
    if (error) {
      if (error.code === RATE_LIMITED) return { ok: false, error: 'limited' };
      console.error('availability request failed', error.code);
      return { ok: false, error: 'failed' };
    }
    return { ok: true, id: data as string };
  } catch (error) {
    // Never logs the device id or its hash.
    console.error('availability request failed', error instanceof Error ? error.message.slice(0, 80) : 'unknown');
    return { ok: false, error: 'failed' };
  }
}
