import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET, POST } from '@/app/api/whatsapp/webhook/route';

const URL_BASE = 'https://example.test/api/whatsapp/webhook';
const SECRET = 'route-test-secret';
const body = readFileSync(join(__dirname, 'fixtures', 'whatsapp', 'status-and-image.json'), 'utf8');
const sign = (b: string, s = SECRET) => `sha256=${createHmac('sha256', s).update(b).digest('hex')}`;

const post = (b: string, signature?: string) =>
  POST(
    new NextRequest(URL_BASE, {
      method: 'POST',
      body: b,
      headers: signature ? { 'x-hub-signature-256': signature, 'content-type': 'application/json' } : {},
    }),
  );

beforeEach(() => {
  process.env.WHATSAPP_APP_SECRET = SECRET;
  process.env.WHATSAPP_VERIFY_TOKEN = 'verify-me';
});
afterEach(() => {
  delete process.env.WHATSAPP_APP_SECRET;
  delete process.env.WHATSAPP_VERIFY_TOKEN;
});

describe('GET /api/whatsapp/webhook (verification handshake)', () => {
  it('echoes the challenge when the token matches', async () => {
    const res = await GET(new NextRequest(`${URL_BASE}?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=1158201444`));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('1158201444');
  });

  it('refuses a wrong token or mode', async () => {
    expect((await GET(new NextRequest(`${URL_BASE}?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=1`))).status).toBe(403);
    expect((await GET(new NextRequest(`${URL_BASE}?hub.mode=other&hub.verify_token=verify-me&hub.challenge=1`))).status).toBe(403);
  });
});

describe('POST /api/whatsapp/webhook', () => {
  it('answers 401 to an unsigned request', async () => {
    expect((await post(body)).status).toBe(401);
  });

  it('answers 401 to a wrong signature', async () => {
    expect((await post(body, sign(body, 'wrong-secret'))).status).toBe(401);
  });

  it('answers 400 to a signed body that is not JSON', async () => {
    expect((await post('not json', sign('not json'))).status).toBe(400);
  });

  it('answers 200 to a signed payload with no text message, touching nothing', async () => {
    expect((await post(body, sign(body))).status).toBe(200);
  });
});
