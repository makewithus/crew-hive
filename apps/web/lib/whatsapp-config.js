/**
 * WhatsApp Configuration & Link Helpers
 * Reads official verified business number from environment variables
 * with fallback to configured MSG91 business number.
 */

export function getWhatsAppNumber() {
  const num =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    process.env.MSG91_WHATSAPP_NUMBER ||
    "+918139002826";
  return num ? num.trim() : "";
}

export function isWhatsAppConfigured() {
  const num = getWhatsAppNumber();
  const digits = num.replace(/\D/g, "");
  return digits.length >= 10;
}

export function getWhatsAppUrl(message = "Hi") {
  const num = getWhatsAppNumber();
  if (!num) return null;
  const digits = num.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function formatWhatsAppDisplay(number) {
  const num = number || getWhatsAppNumber();
  const digits = num.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return num;
}

