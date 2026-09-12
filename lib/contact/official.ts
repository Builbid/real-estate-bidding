/** Official BuilBid materials desk — phone and WhatsApp share the same number. */
export const BUILBID_MATERIALS_CONTACT = {
  phoneDisplay: '+91 70860 24400',
  phoneTel: '+917086024400',
  email: 'materials@builbid.in',
  whatsappE164: '917086024400',
  whatsappMessage:
    'Hello BuilBid, I would like to discuss construction materials for my project.',
} as const;

export function materialsWhatsAppHref(): string {
  return `https://wa.me/${BUILBID_MATERIALS_CONTACT.whatsappE164}?text=${encodeURIComponent(
    BUILBID_MATERIALS_CONTACT.whatsappMessage,
  )}`;
}
