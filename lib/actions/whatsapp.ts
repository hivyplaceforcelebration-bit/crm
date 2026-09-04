"use server"

// Talks to the standalone WhatsApp automation hub (a separate Node service
// using Baileys, deployed on Railway - see /Applications/WHATSAPP NEW TOOL
// for all/backend). That hub owns one WhatsApp number connected via QR scan
// and exposes a small internal API; this file is the CRM's only integration
// point with it. Every call is best-effort: booking creation, status
// changes etc. must never fail just because a WhatsApp send failed.

import { createClient } from "@/lib/supabase/server"

const HUB_URL = process.env.WHATSAPP_HUB_URL
const HUB_API_KEY = process.env.WHATSAPP_HUB_API_KEY

// The customer/team confirmation messages are stored as real, editable rows
// in message_templates (see migration 012) instead of hardcoded text, so
// Settings > Templates can change what actually gets sent without a
// redeploy. Falls back to a hardcoded body if the row is ever missing.
async function getTemplateBody(name: string, fallback: string): Promise<string> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("message_templates")
      .select("body")
      .eq("name", name)
      .maybeSingle()
    return data?.body || fallback
  } catch {
    return fallback
  }
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match)
}

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

const CUSTOMER_CONFIRMATION_FALLBACK = `🎉 BOOKING CONFIRMED — {outlet_name}

Hi {customer_name} 👋

Your celebration at {outlet_name}, {outlet_city} is confirmed! ✨

👤 Name: {customer_name}
📞 Contact: {phone}
📅 Date: {date}
⏰ Preferred Time: {time}
🎁 Occasion: {occasion}
📦 Package: {package_name}

🕯️ Reminder: Please call us 15 minutes before your booking time for the candle-light setup/glow.

✨ We look forward to making your special moment memorable at {outlet_name}!`

function bookingVars(booking: {
  customer_name: string
  customer_phone: string
  outlet: string
  booking_date: string
  time_slot: string
  package_name?: string | null
  occasion?: string | null
}) {
  const outlet = OUTLET_INFO[booking.outlet] || { name: booking.outlet, address: "", teamPhone: "" }
  const date = new Date(booking.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
  return {
    outlet_name: outlet.name,
    outlet_city: booking.outlet,
    outlet_address: outlet.address,
    outlet_phone: outlet.teamPhone,
    customer_name: booking.customer_name,
    phone: booking.customer_phone,
    date,
    time: booking.time_slot,
    occasion: booking.occasion || "—",
    package_name: booking.package_name || "—",
  }
}

export async function sendBookingConfirmation(booking: {
  customer_name: string
  customer_phone: string
  outlet: string
  booking_date: string
  time_slot: string
  package_name?: string | null
  occasion?: string | null
  total_amount: number
}) {
  const template = await getTemplateBody("Booking Confirmation - Customer", CUSTOMER_CONFIRMATION_FALLBACK)
  const text = fillTemplate(template, bookingVars(booking))
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

const TEAM_ALERT_FALLBACK = `🔔 NEW BOOKING CONFIRMED

A new customer booking has been received.

👤 Customer: {customer_name}
📞 Phone: {phone}
📍 City: {outlet_city}
📦 Package: {package_name}
🎁 Occasion: {occasion}
📅 Date: {date}
⏰ Time: {time}

✅ Booking Status: CONFIRMED

Please check the booking details and make the necessary arrangements for the customer's celebration.

Venue: {outlet_name}, {outlet_city}
Contact: {outlet_phone}

❤️ Every occasion turns into a forever memory under the stars.`

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
  occasion?: string | null
  total_amount: number
}) {
  const outlet = OUTLET_INFO[booking.outlet] || { name: booking.outlet, address: "", teamPhone: "" }
  if (!outlet.teamPhone) return false
  const template = await getTemplateBody("Booking Confirmation - Team", TEAM_ALERT_FALLBACK)
  const text = fillTemplate(template, bookingVars(booking))
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
