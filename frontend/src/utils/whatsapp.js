/**
 * Normalise a Nigerian phone number to international format (no + or spaces).
 * Handles: "0901 234 5678", "+234 901 234 5678", "2349012345678"
 */
export function normalisePhone(phone) {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  if (digits.startsWith('234')) return digits
  if (digits.startsWith('0'))   return '234' + digits.slice(1)
  return digits
}

/**
 * Opens WhatsApp with an optional pre-filled message.
 * On mobile: opens the WhatsApp app directly.
 * On desktop: opens WhatsApp Web.
 */
export function openWhatsAppChat(phone, message = '') {
  const number = normalisePhone(phone)
  if (!number) return
  const text   = message ? `?text=${encodeURIComponent(message)}` : ''
  window.open(`https://wa.me/${number}${text}`, '_blank', 'noopener,noreferrer')
}

export const waMessages = {
  paymentChase: (name, amount) =>
    `Hi ${name}, this is Blessed Palm Oil. You have an outstanding balance of ${amount}. Kindly let us know when you can make payment. Thank you.`,

  receiptFollowUp: (name, saleRef) =>
    `Hi ${name}, thank you for your purchase (Ref: #${saleRef}). Please contact us if you have any questions.`,

  generalContact: (name) =>
    `Hi ${name}, this is Blessed Palm Oil. We'd like to follow up with you.`,

  paymentReceived: (name, amount) =>
    `Hi ${name}, we have received your payment of ${amount}. Thank you! Please contact us if you need a receipt.`,
}
