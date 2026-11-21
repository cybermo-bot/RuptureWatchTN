// Minimal WhatsApp Cloud API client: send one text message.
// Called directly over HTTPS, no SDK. Server only.

import 'server-only';

/** Graph API version. Recorded in docs/DECISIONS.md; change it here only. */
export const GRAPH_API_VERSION = 'v27.0';

export interface SendTextInput {
  /** Phone number, when the webhook gave one. */
  to?: string | null;
  /** Business-scoped user id, used only when there is no phone number. */
  recipient?: string | null;
  body: string;
  /** wamid of the message being answered (shows as a quoted reply). */
  replyTo?: string;
}

export async function sendText(input: SendTextInput, env: { accessToken: string; phoneNumberId: string }) {
  const target = input.to ? { to: input.to } : input.recipient ? { recipient: input.recipient } : null;
  if (!target) throw new Error('sendText: no phone number or user id to send to');

  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${env.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      ...target,
      type: 'text',
      text: { preview_url: false, body: input.body },
      ...(input.replyTo ? { context: { message_id: input.replyTo } } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    // Log the API error code only: the body may echo the recipient.
    let code: unknown = null;
    try {
      code = ((await res.json()) as { error?: { code?: unknown } }).error?.code ?? null;
    } catch {
      // ignore
    }
    throw new Error(`WhatsApp send failed: HTTP ${res.status}, error code ${String(code)}`);
  }
}
