// Minimal WhatsApp Cloud API client: send one message (text, list, buttons or template).
// Called directly over HTTPS, no SDK. Server only.

import 'server-only';
import { graphPayload, type Outbound, type Target } from './messages';

/** Graph API version. Recorded in docs/DECISIONS.md; change it here only. */
export const GRAPH_API_VERSION = 'v27.0';

export interface WhatsAppEnv {
  accessToken: string;
  phoneNumberId: string;
}

/** The sending values, or null when WhatsApp is not configured on this deployment. */
export function whatsappEnv(): WhatsAppEnv | null {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return accessToken && phoneNumberId ? { accessToken, phoneNumberId } : null;
}

export class WhatsAppSendError extends Error {
  constructor(
    readonly status: number,
    /** Meta's error code, e.g. 131047 when a free-form message is sent outside the 24-hour window. */
    readonly code: number | null,
  ) {
    super(`WhatsApp send failed: HTTP ${status}, error code ${String(code)}`);
    this.name = 'WhatsAppSendError';
  }
}

export async function sendMessage(target: Target, message: Outbound, env: WhatsAppEnv, replyTo?: string): Promise<void> {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${env.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(graphPayload(target, message, replyTo)),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    // Keep the API error code only: the body may echo the recipient.
    let code: number | null = null;
    try {
      const c = ((await res.json()) as { error?: { code?: unknown } }).error?.code;
      code = typeof c === 'number' ? c : null;
    } catch {
      // ignore
    }
    throw new WhatsAppSendError(res.status, code);
  }
}

export interface SendTextInput extends Target {
  body: string;
  /** wamid of the message being answered (shows as a quoted reply). */
  replyTo?: string;
}

export async function sendText(input: SendTextInput, env: WhatsAppEnv) {
  await sendMessage({ to: input.to, recipient: input.recipient }, { type: 'text', body: input.body }, env, input.replyTo);
}
