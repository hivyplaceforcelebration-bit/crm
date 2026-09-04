"use server"

// Talks to the standalone WhatsApp automation hub (a separate Node service
// using Baileys, deployed on Railway - see /Applications/WHATSAPP NEW TOOL
// for all/backend). That hub owns one WhatsApp number connected via QR scan
// and exposes a small internal API; this file is the CRM's only integration
// point with it. Every call is best-effort: booking creation, status
// changes etc. must never fail just because a WhatsApp send failed.

const HUB_URL = process.env.WHATSAPP_HUB_URL
const HUB_API_KEY = process.env.WHATSAPP_HUB_API_KEY

const OUTLET_INFO: Record<string, { name: string; address: string }> = {
  Surat: { name: "Hivy — Place for Celebrations", address: "Adajan, Pal Gam, Surat" },
  Vadodara: { name: "Friends Factory Cafe", address: "Sevasi - Canal Rd, Gotri, Vadodara" },
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
  const outlet = OUTLET_INFO[booking.outlet] || { name: booking.outlet, address: "" }
  const date = new Date(booking.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
  const text = `Hi ${booking.customer_name}! 🎉 Your booking at *${outlet.name}* is confirmed.\n\n📅 ${date}, ${booking.time_slot}\n${booking.package_name ? `📦 ${booking.package_name}\n` : ""}💰 ₹${booking.total_amount.toLocaleString()}\n📍 ${outlet.address}\n\nWe can't wait to celebrate with you! Reply here if you need to change anything.`
  return sendWhatsAppText(booking.customer_phone, text)
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
