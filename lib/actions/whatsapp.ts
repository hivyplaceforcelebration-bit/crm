"use server"

// Talks to the standalone WhatsApp automation hub (a separate Node service
// using Baileys, deployed on Railway - see /Applications/WHATSAPP NEW TOOL
// for all/backend). That hub owns one WhatsApp number connected via QR scan
// and exposes a small internal API; this file is the CRM's only integration
// point with it. Every call is best-effort: booking creation, status
// changes etc. must never fail just because a WhatsApp send failed.

const HUB_URL = process.env.WHATSAPP_HUB_URL
const HUB_API_KEY = process.env.WHATSAPP_HUB_API_KEY

const OUTLET_INFO: Record<string, { name: string; address: string; teamPhone: string }> = {
  Surat: { name: "Hivy — Place for Celebrations", address: "Adajan, Pal Gam, Surat", teamPhone: "919727027278" },
  Vadodara: { name: "Friends Factory Cafe", address: "Sevasi - Canal Rd, Gotri, Vadodara", teamPhone: "917487888730" },
}

async function sendWhatsAppText(toPhone: string, text: string): Promise<boolean> {
  if (!HUB_URL || !HUB_API_KEY) {
    console.warn("WhatsApp hub not configured (WHATSAPP_HUB_URL / WHATSAPP_HUB_API_KEY) - skipping send")
    return false
  }
  try {
    const res = await fetch(`${HUB_URL}/internal/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": HUB_API_KEY },
      body: JSON.stringify({ toPhone, text }),
    })
    if (!res.ok) {
      console.error("WhatsApp send failed", res.status, await res.text().catch(() => ""))
      return false
    }
    return true
  } catch (err) {
    console.error("WhatsApp send error", err)
    return false
  }
}

export async function sendBookingConfirmation(booking: {
  customer_name: string
  customer_phone: string
  outlet: string
  booking_date: string
  time_slot: string
  package_name?: string | null
  total_amount: number
}) {
  const outlet = OUTLET_INFO[booking.outlet] || { name: booking.outlet, address: "", teamPhone: "" }
  const date = new Date(booking.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
  const text = `Hi ${booking.customer_name}! 🎉 Your booking at *${outlet.name}* is confirmed.\n\n📅 ${date}, ${booking.time_slot}\n${booking.package_name ? `📦 ${booking.package_name}\n` : ""}💰 ₹${booking.total_amount.toLocaleString()}\n📍 ${outlet.address}\n\nWe can't wait to celebrate with you! Reply here if you need to change anything.`
  return sendWhatsAppText(booking.customer_phone, text)
}

export async function sendInvoiceMessage(invoice: {
  invoice_number: string
  customer_name: string
  customer_phone: string
  outlet: string | null
  subtotal: number
  discount: number
  tax: number
  total_amount: number
  amount_paid: number
  payment_status: string
}) {
  const outlet = (invoice.outlet && OUTLET_INFO[invoice.outlet]) || { name: invoice.outlet || "", address: "", teamPhone: "" }
  const lines = [
    `🧾 Invoice *${invoice.invoice_number}* from *${outlet.name}*`,
    ``,
    `Subtotal: ₹${invoice.subtotal.toLocaleString()}`,
  ]
  if (invoice.discount > 0) lines.push(`Discount: -₹${invoice.discount.toLocaleString()}`)
  if (invoice.tax > 0) lines.push(`Tax: ₹${invoice.tax.toLocaleString()}`)
  lines.push(
    `*Total: ₹${invoice.total_amount.toLocaleString()}*`,
    `Paid: ₹${invoice.amount_paid.toLocaleString()} (${invoice.payment_status})`,
    ``,
    `Thank you for choosing us! 💕`
  )
  return sendWhatsAppText(invoice.customer_phone, lines.join("\n"))
}

// Alerts the outlet's own team number whenever a booking is confirmed
// (whether from a fresh booking or a converted lead), so staff know a new
// booking landed without having to watch the CRM.
export async function sendTeamBookingAlert(booking: {
  customer_name: string
  customer_phone: string
  outlet: string
  booking_date: string
  time_slot: string
  package_name?: string | null
  total_amount: number
}) {
  const outlet = OUTLET_INFO[booking.outlet] || { name: booking.outlet, address: "", teamPhone: "" }
  if (!outlet.teamPhone) return false
  const date = new Date(booking.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
  const text = `🔔 New booking at *${outlet.name}*\n\n👤 ${booking.customer_name} (${booking.customer_phone})\n📅 ${date}, ${booking.time_slot}\n${booking.package_name ? `📦 ${booking.package_name}\n` : ""}💰 ₹${booking.total_amount.toLocaleString()}`
  return sendWhatsAppText(outlet.teamPhone, text)
}

export async function sendBookingReminder(booking: {
  customer_name: string
  customer_phone: string
  outlet: string
  booking_date: string
  time_slot: string
}) {
  const outlet = OUTLET_INFO[booking.outlet] || { name: booking.outlet, address: "" }
  const date = new Date(booking.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "long" })
  const text = `Hi ${booking.customer_name}! Just a reminder that your celebration at *${outlet.name}* is coming up on ${date} at ${booking.time_slot}. See you soon! 💕`
  return sendWhatsAppText(booking.customer_phone, text)
}

export async function sendReviewRequest(booking: {
  customer_name: string
  customer_phone: string
  outlet: string
}) {
  const text = `Hi ${booking.customer_name}! Thank you for celebrating with us at ${OUTLET_INFO[booking.outlet]?.name || booking.outlet} 💕 We'd love to hear about your experience - could you spare a minute to leave us a review? It really helps us out!`
  return sendWhatsAppText(booking.customer_phone, text)
}

export async function getWhatsAppHubStatus(): Promise<{ configured: boolean; connected?: boolean; phoneNumber?: string | null }> {
  if (!HUB_URL || !HUB_API_KEY) return { configured: false }
  try {
    const res = await fetch(`${HUB_URL}/internal/session`, {
      headers: { "x-api-key": HUB_API_KEY },
      cache: "no-store",
    })
    if (!res.ok) return { configured: true, connected: false }
    const data = await res.json()
    return {
      configured: true,
      connected: data.session?.status === "CONNECTED",
      phoneNumber: data.session?.phoneNumber ?? null,
    }
  } catch {
    return { configured: true, connected: false }
  }
}

// Starts (or restarts) the hub's WhatsApp session so a QR code becomes
// available, then fetches it. Called from the "Connect WhatsApp" button on
// Settings so pairing never again requires calling the hub's API by hand.
export async function startWhatsAppPairing(): Promise<{ ok: boolean; error?: string }> {
  if (!HUB_URL || !HUB_API_KEY) return { ok: false, error: "WhatsApp hub not configured" }
  try {
    const res = await fetch(`${HUB_URL}/internal/session`, {
      method: "POST",
      headers: { "x-api-key": HUB_API_KEY },
    })
    if (!res.ok) return { ok: false, error: `Hub returned ${res.status}` }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to reach hub" }
  }
}

// Logs the paired WhatsApp number out of the hub (clears its saved auth),
// so a different number can be paired via "Connect WhatsApp" afterward.
export async function disconnectWhatsApp(): Promise<{ ok: boolean; error?: string }> {
  if (!HUB_URL || !HUB_API_KEY) return { ok: false, error: "WhatsApp hub not configured" }
  try {
    const res = await fetch(`${HUB_URL}/internal/session/logout`, {
      method: "POST",
      headers: { "x-api-key": HUB_API_KEY },
    })
    if (!res.ok) return { ok: false, error: `Hub returned ${res.status}` }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to reach hub" }
  }
}

export async function getWhatsAppQr(): Promise<{ status: string; qr: string | null; phoneNumber?: string | null }> {
  if (!HUB_URL || !HUB_API_KEY) return { status: "NOT_CONFIGURED", qr: null }
  try {
    const res = await fetch(`${HUB_URL}/internal/session/qr`, {
      headers: { "x-api-key": HUB_API_KEY },
      cache: "no-store",
    })
    if (!res.ok) return { status: "ERROR", qr: null }
    const data = await res.json()
    return { status: data.status, qr: data.qr ?? null, phoneNumber: data.phoneNumber ?? null }
  } catch {
    return { status: "ERROR", qr: null }
  }
}
