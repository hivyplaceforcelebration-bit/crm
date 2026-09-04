import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendBookingReminder } from "@/lib/actions/whatsapp"

// Runs once a day (see vercel.json) and messages everyone whose confirmed
// booking is exactly 2 days out. Uses the admin client since Vercel Cron
// has no user session - protected by CRON_SECRET instead, matching
// Vercel's documented pattern for authenticating its own cron invocations.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + 2)
  const targetDateStr = targetDate.toISOString().split("T")[0]

  const supabase = createAdminClient()
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("customer_name, customer_phone, outlet, booking_date, time_slot")
    .eq("booking_date", targetDateStr)
    .eq("status", "confirmed")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  for (const booking of bookings || []) {
    const ok = await sendBookingReminder(booking)
    if (ok) sent++
  }

  return NextResponse.json({ ok: true, targetDate: targetDateStr, total: bookings?.length || 0, sent })
}
