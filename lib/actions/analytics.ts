"use server"

import { createClient } from "@/lib/supabase/server"

// ─── Helpers ────────────────────────────────────────────────────────────────

function startOf(days: number): string {
  const d = new Date()
  if (days === 0) {
    // Year to date
    d.setMonth(0, 1)
    d.setHours(0, 0, 0, 0)
  } else {
    d.setDate(d.getDate() - days)
  }
  return d.toISOString()
}

function monthKey(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function monthLabel(key: string) {
  const [y, m] = key.split("-")
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("en-IN", {
    month: "short", year: "2-digit",
  })
}

// ─── Main Analytics Query ────────────────────────────────────────────────────

export async function getAnalyticsData(days: number, outlet?: string) {
  const supabase = await createClient()
  const since = startOf(days)

  // Build base booking query
  let bookingQ = supabase
    .from("bookings")
    .select("id,outlet,booking_date,total_amount,amount_paid,payment_status,status,experience_type,time_slot,package_name,created_at")
    .gte("created_at", since)
    .neq("status", "cancelled")

  if (outlet && outlet !== "all") bookingQ = bookingQ.eq("outlet", outlet)

  // Lead query (not filtered by outlet — leads are global)
  const leadQ = supabase
    .from("leads")
    .select("id,lead_source,source_domain,status,created_at")
    .gte("created_at", since)

  // Customer repeat rate
  const custQ = supabase
    .from("customers")
    .select("id,total_bookings,total_spend")

  // Invoice revenue (only paid)
  let invQ = supabase
    .from("invoices")
    .select("id,outlet,total_amount,amount_paid,payment_status,created_at")
    .gte("created_at", since)
    .eq("payment_status", "paid")

  if (outlet && outlet !== "all") invQ = invQ.eq("outlet", outlet)

  const [{ data: bookings }, { data: leads }, { data: customers }, { data: invoices }] =
    await Promise.all([bookingQ, leadQ, custQ, invQ])

  const bk = bookings || []
  const ld = leads || []
  const cs = customers || []
  const iv = invoices || []

  // ── Summary Metrics ────────────────────────────────────────────────────────

  const totalRevenue = iv.reduce((s, i) => s + (i.total_amount || 0), 0)
  const totalBookings = bk.length
  const avgBookingValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0

  const totalLeads = ld.length
  const convertedLeads = ld.filter((l) => l.status === "converted").length
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0

  const repeatCustomers = cs.filter((c) => (c.total_bookings || 0) > 1).length
  const repeatRate = cs.length > 0 ? Math.round((repeatCustomers / cs.length) * 100) : 0

  // ── Revenue by Month (last 6 months) ──────────────────────────────────────

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)

  // Build 6-month keys
  const monthKeys: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    monthKeys.push(monthKey(d.toISOString()))
  }

  const revenueMap: Record<string, number> = {}
  monthKeys.forEach((k) => (revenueMap[k] = 0))

  // Use invoices for revenue by month (paid only, no outlet filter for trend)
  const allInvQ = await supabase
    .from("invoices")
    .select("total_amount,created_at")
    .gte("created_at", sixMonthsAgo.toISOString())
    .eq("payment_status", "paid")

  ;(allInvQ.data || []).forEach((inv) => {
    const k = monthKey(inv.created_at)
    if (revenueMap[k] !== undefined) revenueMap[k] += inv.total_amount || 0
  })

  const revenueByMonth = monthKeys.map((k) => ({
    month: monthLabel(k),
    revenue: revenueMap[k],
  }))

  // ── Occasion Breakdown ────────────────────────────────────────────────────

  const occasionMap: Record<string, number> = {}
  bk.forEach((b) => {
    const key = b.experience_type || "other"
    occasionMap[key] = (occasionMap[key] || 0) + 1
  })

  const occasionBreakdown = Object.entries(occasionMap)
    .map(([occasion, count]) => ({ occasion, count }))
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      ...item,
      percentage: totalBookings > 0 ? Math.round((item.count / totalBookings) * 100) : 0,
    }))

  // ── Lead Source Breakdown ─────────────────────────────────────────────────

  const sourceMap: Record<string, { total: number; converted: number }> = {}
  ld.forEach((l) => {
    const src = l.lead_source || "other"
    if (!sourceMap[src]) sourceMap[src] = { total: 0, converted: 0 }
    sourceMap[src].total++
    if (l.status === "converted") sourceMap[src].converted++
  })

  const leadSources = Object.entries(sourceMap)
    .map(([source, { total, converted }]) => ({
      source,
      total,
      converted,
      rate: total > 0 ? Math.round((converted / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)

  // ── Outlet Performance ────────────────────────────────────────────────────

  const outletMap: Record<string, { bookings: number; revenue: number }> = {}
  bk.forEach((b) => {
    const key = b.outlet || "Unknown"
    if (!outletMap[key]) outletMap[key] = { bookings: 0, revenue: 0 }
    outletMap[key].bookings++
    outletMap[key].revenue += b.total_amount || 0
  })

  const outletPerformance = Object.entries(outletMap).map(([outlet, { bookings, revenue }]) => ({
    outlet,
    bookings,
    revenue,
    avgValue: bookings > 0 ? Math.round(revenue / bookings) : 0,
  }))

  // ── Time Slot Performance ─────────────────────────────────────────────────

  const slotMap: Record<string, number> = {}
  bk.forEach((b) => {
    if (b.time_slot) slotMap[b.time_slot] = (slotMap[b.time_slot] || 0) + 1
  })

  const maxSlotCount = Math.max(...Object.values(slotMap), 1)
  const timeSlots = Object.entries(slotMap)
    .map(([slot, count]) => ({
      slot,
      count,
      pct: Math.round((count / maxSlotCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  // ── Leads by Domain (source_domain) ──────────────────────────────────────

  const domainMap: Record<string, number> = {}
  ld.forEach((l) => {
    const domain = (l as any).source_domain || l.lead_source || "direct"
    domainMap[domain] = (domainMap[domain] || 0) + 1
  })

  const leadsByDomain = Object.entries(domainMap)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)

  // ── Package Performance ───────────────────────────────────────────────────

  const pkgMap: Record<string, { bookings: number; revenue: number }> = {}
  bk.forEach((b) => {
    const key = b.package_name || b.experience_type || "Custom"
    if (!pkgMap[key]) pkgMap[key] = { bookings: 0, revenue: 0 }
    pkgMap[key].bookings++
    pkgMap[key].revenue += b.total_amount || 0
  })

  const maxPkgBookings = Math.max(...Object.values(pkgMap).map((p) => p.bookings), 1)
  const packagePerformance = Object.entries(pkgMap)
    .map(([name, { bookings, revenue }]) => ({
      name,
      bookings,
      revenue,
      pct: Math.round((bookings / maxPkgBookings) * 100),
    }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 8)

  return {
    summary: { totalRevenue, totalBookings, avgBookingValue, conversionRate, repeatRate, totalLeads, convertedLeads },
    revenueByMonth,
    occasionBreakdown,
    leadSources,
    leadsByDomain,
    outletPerformance,
    timeSlots,
    packagePerformance,
  }
}
