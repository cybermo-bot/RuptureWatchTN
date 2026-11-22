// The availability request rate limit, without knowing who the visitor is.
// The visitor's browser keeps a random id (localStorage, never sent anywhere but here). Our
// server turns it into a salted hash before it reaches the database, which keeps only the
// hash, and only to refuse a second request for the same medicine within 24 hours.

import 'server-only';
import { createHmac } from 'node:crypto';

/** A device id is a random UUID made by the browser (crypto.randomUUID). */
const DEVICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isDeviceId(value: unknown): value is string {
  return typeof value === 'string' && DEVICE_ID.test(value);
}

/** 64 hex characters: HMAC-SHA256 of the device id with DEVICE_HASH_SALT. */
export function hashDeviceId(deviceId: string, salt = process.env.DEVICE_HASH_SALT): string {
  if (!salt || salt.length < 16) throw new Error('DEVICE_HASH_SALT is missing or too short');
  if (!isDeviceId(deviceId)) throw new Error('not a device id');
  return createHmac('sha256', salt).update(deviceId.toLowerCase()).digest('hex');
}

/** SQLSTATE raised by create_availability_request for a second request within 24 hours. */
export const RATE_LIMITED = 'RW429';
