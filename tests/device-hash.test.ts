import { describe, expect, it } from 'vitest';
import { hashDeviceId, isDeviceId } from '@/lib/availability/device';

const SALT = 'a-test-salt-of-sufficient-length';
const DEVICE = '12345678-1234-4123-8123-123456789abc';

describe('device hash', () => {
  it('is 64 hex characters, stable for one device, different across devices and salts', () => {
    const h = hashDeviceId(DEVICE, SALT);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashDeviceId(DEVICE.toUpperCase(), SALT)).toBe(h);
    expect(hashDeviceId('12345678-1234-4123-8123-123456789abd', SALT)).not.toBe(h);
    expect(hashDeviceId(DEVICE, SALT + 'x')).not.toBe(h);
    expect(h).not.toContain(DEVICE.replace(/-/g, ''));
  });

  it('accepts only a random UUID as device id', () => {
    expect(isDeviceId(DEVICE)).toBe(true);
    for (const bad of ['', 'abc', '00000000-0000-0000-0000-000000000000', 42, null]) expect(isDeviceId(bad)).toBe(false);
    expect(() => hashDeviceId('abc', SALT)).toThrow();
  });

  it('refuses to hash without a salt', () => {
    expect(() => hashDeviceId(DEVICE, '')).toThrow(/DEVICE_HASH_SALT/);
  });
});
