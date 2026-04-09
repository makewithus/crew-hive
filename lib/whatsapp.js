/**
 * MSG91 WhatsApp Integration — CrewHive
 * Sends text, interactive-button, and list messages via MSG91 WhatsApp API.
 */

const MSG91_BASE_URL =
  'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';

/** Strip all non-digit characters — MSG91 expects e.g. "919876543210" */
const normalizePhone = (phone) => String(phone).replace(/\D/g, '');

/** Outbound number from env (digits only) */
const integratedNumber = () => normalizePhone(process.env.MSG91_WHATSAPP_NUMBER || '');

const makeRequest = async (body) => {
  const res = await fetch(MSG91_BASE_URL, {
    method: 'POST',
    headers: {
      authkey: process.env.MSG91_AUTH_KEY || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  let data = {};
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    console.error('[MSG91] API error:', data);
    throw new Error(data?.message || `HTTP ${res.status}`);
  }
  return { success: true, data };
};

// ─── Text ─────────────────────────────────────────────────────────────────────
export const sendTextMessage = async (to, text) => {
  try {
    return await makeRequest({
      integrated_number: integratedNumber(),
      content_type: 'text',
      payload: {
        messaging_product: 'whatsapp',
        to: normalizePhone(to),
        type: 'text',
        text: { body: text },
      },
    });
  } catch (err) {
    console.error('[MSG91] sendTextMessage error:', err.message);
    return { success: false, error: err.message };
  }
};

// ─── Interactive quick-reply buttons (max 3) ──────────────────────────────────
export const sendInteractiveButtons = async (
  to,
  body,
  buttons,
  header = null,
  footer = null,
) => {
  try {
    const interactive = {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: {
            id: String(b.id).slice(0, 256),
            title: String(b.title).slice(0, 20),
          },
        })),
      },
    };
    if (header) interactive.header = { type: 'text', text: header };
    if (footer) interactive.footer = { text: footer };

    return await makeRequest({
      integrated_number: integratedNumber(),
      content_type: 'interactive',
      payload: {
        messaging_product: 'whatsapp',
        to: normalizePhone(to),
        type: 'interactive',
        interactive,
      },
    });
  } catch (err) {
    console.error('[MSG91] sendInteractiveButtons error:', err.message);
    return { success: false, error: err.message };
  }
};

// ─── Interactive list (selection from up to 10 rows per section) ──────────────
export const sendInteractiveList = async (
  to,
  body,
  sections,
  buttonText = 'Select',
  header = null,
  footer = null,
) => {
  try {
    const interactive = {
      type: 'list',
      body: { text: body },
      action: {
        button: buttonText.slice(0, 20),
        sections: sections.map((s) => ({
          ...(s.title ? { title: s.title.slice(0, 24) } : {}),
          rows: s.rows.map((r) => ({
            id: String(r.id).slice(0, 200),
            title: String(r.title).slice(0, 24),
            ...(r.description ? { description: String(r.description).slice(0, 72) } : {}),
          })),
        })),
      },
    };
    if (header) interactive.header = { type: 'text', text: header };
    if (footer) interactive.footer = { text: footer };

    return await makeRequest({
      integrated_number: integratedNumber(),
      content_type: 'interactive',
      payload: {
        messaging_product: 'whatsapp',
        to: normalizePhone(to),
        type: 'interactive',
        interactive,
      },
    });
  } catch (err) {
    console.error('[MSG91] sendInteractiveList error:', err.message);
    return { success: false, error: err.message };
  }
};

// ─── Dispatcher — routes any conversation engine response to the right method ─
export const sendConversationMessage = async (to, msg) => {
  if (msg.type === 'buttons') {
    return sendInteractiveButtons(to, msg.text, msg.buttons, msg.header, msg.footer);
  }
  if (msg.type === 'list') {
    return sendInteractiveList(
      to,
      msg.text,
      msg.sections,
      msg.buttonText || 'Select',
      msg.header,
      msg.footer,
    );
  }
  return sendTextMessage(to, msg.text);
};
