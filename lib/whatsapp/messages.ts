// Outbound WhatsApp messages: text, list, reply buttons, template. Pure: builds the Cloud API
// request body, with Meta's size limits applied (interactive message reference, read
// 23 November 2026): list button 20 characters, 10 rows, row title 24, row description 72,
// row id 200; reply buttons 3, title 20, id 256; interactive body 1,024; header and footer 60.

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export type Outbound =
  | { type: 'text'; body: string }
  | { type: 'list'; body: string; button: string; sectionTitle: string; rows: ListRow[]; footer?: string }
  | { type: 'buttons'; body: string; buttons: { id: string; title: string }[]; footer?: string }
  | {
      type: 'template';
      name: string;
      language: string;
      bodyParams: string[];
      /** Parameter of the template's first URL button (authentication templates: the code). */
      urlButtonParam?: string;
    };

/** Where to send: the phone number when known, else the business-scoped user id. */
export interface Target {
  to?: string | null;
  recipient?: string | null;
}

export const LIMITS = {
  textBody: 4096,
  interactiveBody: 1024,
  listButton: 20,
  listRows: 10,
  rowTitle: 24,
  rowDescription: 72,
  rowId: 200,
  sectionTitle: 24,
  buttons: 3,
  buttonTitle: 20,
  buttonId: 256,
  footer: 60,
} as const;

/** Shortens to `max` characters, ending with an ellipsis when cut. */
export function clip(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join('')}…`;
}

function interactive(msg: Extract<Outbound, { type: 'list' | 'buttons' }>) {
  const footer = msg.footer ? { footer: { text: clip(msg.footer, LIMITS.footer) } } : {};
  const body = { text: clip(msg.body, LIMITS.interactiveBody) };
  if (msg.type === 'list') {
    return {
      type: 'list',
      body,
      ...footer,
      action: {
        button: clip(msg.button, LIMITS.listButton),
        sections: [
          {
            title: clip(msg.sectionTitle, LIMITS.sectionTitle),
            rows: msg.rows.slice(0, LIMITS.listRows).map((r) => ({
              id: r.id.slice(0, LIMITS.rowId),
              title: clip(r.title, LIMITS.rowTitle),
              ...(r.description ? { description: clip(r.description, LIMITS.rowDescription) } : {}),
            })),
          },
        ],
      },
    };
  }
  return {
    type: 'button',
    body,
    ...footer,
    action: {
      buttons: msg.buttons.slice(0, LIMITS.buttons).map((b) => ({
        type: 'reply',
        reply: { id: b.id.slice(0, LIMITS.buttonId), title: clip(b.title, LIMITS.buttonTitle) },
      })),
    },
  };
}

/** The JSON body of POST /{phone-number-id}/messages. */
export function graphPayload(target: Target, msg: Outbound, replyTo?: string): Record<string, unknown> {
  const to = target.to ? { to: target.to } : target.recipient ? { recipient: target.recipient } : null;
  if (!to) throw new Error('WhatsApp message: no phone number or user id to send to');
  const base = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    ...to,
    ...(replyTo ? { context: { message_id: replyTo } } : {}),
  };
  switch (msg.type) {
    case 'text':
      return { ...base, type: 'text', text: { preview_url: false, body: clip(msg.body, LIMITS.textBody) } };
    case 'list':
    case 'buttons':
      return { ...base, type: 'interactive', interactive: interactive(msg) };
    case 'template': {
      const components: Record<string, unknown>[] = [];
      if (msg.bodyParams.length) {
        components.push({ type: 'body', parameters: msg.bodyParams.map((text) => ({ type: 'text', text })) });
      }
      if (msg.urlButtonParam) {
        components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: msg.urlButtonParam }] });
      }
      return { ...base, type: 'template', template: { name: msg.name, language: { code: msg.language }, components } };
    }
  }
}
