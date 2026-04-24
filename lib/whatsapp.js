import logger from './logger';

/**
 * lib/whatsapp.js — MSG91 WhatsApp Integration (Production)
 *
 * Sends text, interactive-button, and list messages via MSG91 API.
 * ALL outbound messages flow through sendConversationMessage().
 */

const MSG91_BASE_URL =
  'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/';

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Digits-only phone, e.g. "+91 98765 43210" → "919876543210" */
const normalizePhone = (phone) => String(phone).replace(/\D/g, '');

const getAuthKey = () => {
  const key = process.env.MSG91_AUTH_KEY;
  if (!key) logger.error('❌ MSG91_AUTH_KEY is not set in environment!');
  return key || '';
};

const getIntegratedNumber = () => {
  const num = process.env.MSG91_WHATSAPP_NUMBER;
  if (!num) logger.error('❌ MSG91_WHATSAPP_NUMBER is not set in environment!');
  return normalizePhone(num || '');
};

// ─── Core HTTP request ────────────────────────────────────────────────────────
const makeRequest = async (body) => {
  const authKey = getAuthKey();
  // Send authkey both as header AND query param — MSG91 control panel API accepts either
  const endpoint = `${MSG91_BASE_URL}?authkey=${encodeURIComponent(authKey)}`;

  logger.log('📡 MSG91 Request to:', MSG91_BASE_URL, '| authKey starts with:', authKey.slice(0, 8));
  logger.log('📡 MSG91 Payload:', JSON.stringify(body, null, 2));

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authkey: authKey,
      'Authorization': authKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    data = { raw: await res.text().catch(() => '') };
  }

  logger.log(`📡 MSG91 Response [${res.status}]:`, JSON.stringify(data));

  if (!res.ok) {
    logger.error('❌ MSG91 API error:', data);
    throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  }

  return { success: true, data };
};

// ─── Text message ─────────────────────────────────────────────────────────────
export const sendTextMessage = async (to, text) => {
  const recipient = normalizePhone(to);
  logger.log(`📤 sendTextMessage → ${recipient}: "${String(text).slice(0, 60)}..."`);

  try {
    return await makeRequest({
      integrated_number: getIntegratedNumber(),
      recipient_number: recipient,
      content_type: 'text',
      text: String(text),
    });
  } catch (err) {
    logger.error('❌ MSG91 sendTextMessage error:', err.message);
    return { success: false, error: err.message };
  }
};

// ─── Interactive quick-reply buttons (max 3) ──────────────────────────────────
export const sendInteractiveButtons = async (to, body, buttons, header = null, footer = null) => {
  const recipient = normalizePhone(to);
  logger.log(`📤 sendInteractiveButtons → ${recipient} | ${buttons.length} buttons`);

  try {
    const interactive = {
      type: 'button',
      body: { text: String(body) },
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
    if (header) interactive.header = { type: 'text', text: String(header) };
    if (footer) interactive.footer = { text: String(footer) };

    return await makeRequest({
      integrated_number: getIntegratedNumber(),
      recipient_number: recipient,
      content_type: 'interactive',
      interactive,
    });
  } catch (err) {
    logger.error('❌ MSG91 sendInteractiveButtons error:', err.message);
    // Fallback to plain text with numbered options
    const fallback = `${body}\n\n${buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n')}`;
    logger.log('⚠️  Falling back to text message for buttons');
    return sendTextMessage(to, fallback);
  }
};

// ─── Interactive list ─────────────────────────────────────────────────────────
export const sendInteractiveList = async (to, body, sections, buttonText = 'Select', header = null, footer = null) => {
  const recipient = normalizePhone(to);
  const totalRows = sections.reduce((sum, s) => sum + (s.rows?.length || 0), 0);
  logger.log(`📤 sendInteractiveList → ${recipient} | ${totalRows} rows`);

  try {
    const interactive = {
      type: 'list',
      body: { text: String(body) },
      action: {
        button: String(buttonText).slice(0, 20),
        sections: sections.map((s) => ({
          ...(s.title ? { title: String(s.title).slice(0, 24) } : {}),
          rows: (s.rows || []).map((r) => ({
            id: String(r.id).slice(0, 200),
            title: String(r.title).slice(0, 24),
            ...(r.description ? { description: String(r.description).slice(0, 72) } : {}),
          })),
        })),
      },
    };
    if (header) interactive.header = { type: 'text', text: String(header) };
    if (footer) interactive.footer = { text: String(footer) };

    return await makeRequest({
      integrated_number: getIntegratedNumber(),
      recipient_number: recipient,
      content_type: 'interactive',
      interactive,
    });
  } catch (err) {
    logger.error('❌ MSG91 sendInteractiveList error:', err.message);
    // Fallback to plain text
    const rows = sections.flatMap((s) => s.rows || []);
    const fallback = `${body}\n\n${rows.map((r) => `• ${r.title}`).join('\n')}`;
    logger.log('⚠️  Falling back to text message for list');
    return sendTextMessage(to, fallback);
  }
};

// ─── Dispatcher ───────────────────────────────────────────────────────────────
/**
 * Routes any conversation engine response to the correct MSG91 method.
 * @param {string} to  — phone number (any format)
 * @param {object} message — { type, text, buttons?, sections?, ... }
 */
export const sendConversationMessage = async (to, message) => {
  // Safety: always ensure message is valid
  if (!message || !message.text) {
    logger.warn('⚠️  sendConversationMessage called with invalid message, using fallback');
    message = { type: 'text', text: 'Something went wrong. Please try again.' };
  }

  logger.log(`📤 sendConversationMessage → ${normalizePhone(to)} | type: ${message.type || 'text'}`);

  try {
    if (message.type === 'buttons' && message.buttons?.length) {
      return await sendInteractiveButtons(to, message.text, message.buttons, message.header, message.footer);
    }
    if (message.type === 'list' && message.sections?.length) {
      return await sendInteractiveList(
        to,
        message.text,
        message.sections,
        message.buttonText || 'Select',
        message.header,
        message.footer,
      );
    }
    return await sendTextMessage(to, message.text);
  } catch (err) {
    logger.error('❌ sendConversationMessage unhandled error:', err.message);
    // Last-resort fallback
    try {
      return await sendTextMessage(to, message.text || 'Something went wrong. Please try again.');
    } catch (e2) {
      logger.error('❌ Fallback sendTextMessage also failed:', e2.message);
      return { success: false, error: e2.message };
    }
  }
};
