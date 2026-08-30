import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const ALLOWED_ORIGINS = [
  // CRM itself
  "https://crm.bookmymoment.in",

  // ── FRIENDS FACTORY (Vadodara) ──────────────────────────────────────────
  "https://friendsfactorycafe.com",
  "https://www.friendsfactorycafe.com",
  "https://candlelightdinnervadodara.com",
  "https://www.candlelightdinnervadodara.com",
  "https://anniversarydinnervadodara.com",
  "https://www.anniversarydinnervadodara.com",
  "https://birthdaysurprisevadodara.com",
  "https://www.birthdaysurprisevadodara.com",
  "https://surprisedatevadodara.com",
  "https://www.surprisedatevadodara.com",
  "https://rooftopdatevadodara.com",
  "https://www.rooftopdatevadodara.com",

  // ── HIVY (Surat) ────────────────────────────────────────────────────────
  "https://hivy.co.in",
  "https://www.hivy.co.in",
  "https://candlelightdinnersurat.com",
  "https://www.candlelightdinnersurat.com",
  "https://anniversarydinnersurat.com",
  "https://www.anniversarydinnersurat.com",
  "https://birthdaysurprisesurat.com",
  "https://www.birthdaysurprisesurat.com",
  "https://surprisedatesurat.com",
  "https://www.surprisedatesurat.com",

  // ── Shared booking portal ───────────────────────────────────────────────
  "https://bookmymoment.in",
  "https://www.bookmymoment.in",

  // ── Vercel preview domains ──────────────────────────────────────────────
  "https://friends-factory-cafe.vercel.app",
  "https://hivy.vercel.app",
  "https://bookmymoment.vercel.app",
]

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.some((o) => origin.startsWith(o))
  return {
    "Access-Control-Allow-Origin": allowed ? origin! : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin")
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")

  // In development, allow localhost
  const isDev = process.env.NODE_ENV === "development"
  const isAllowed =
    isDev ||
    (origin && ALLOWED_ORIGINS.some((o) => origin.startsWith(o)))

  if (!isAllowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders(origin) })
  }

  try {
    const body = await request.json()
    const { name, phone, occasion_type, preferred_date, outlet, lead_source, enquiry_channel, notes, email, budget_range, source_domain } = body

    if (!name || !phone) {
      return NextResponse.json(
        { error: "name and phone are required" },
        { status: 400, headers: corsHeaders(origin) }
      )
    }

    // Use service role key so this bypasses RLS (no user session from website)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Duplicate detection: skip re-insert if same phone submitted in last 24h
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await supabase
      .from("leads")
      .select("id, created_at")
      .eq("phone", phone)
      .gte("created_at", since24h)
      .limit(1)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: true, id: existing.id, duplicate: true },
        { status: 200, headers: corsHeaders(origin) }
      )
    }

    const { data, error } = await supabase
      .from("leads")
      .insert({
        name,
        phone,
        email: email || null,
        occasion_type: occasion_type || "other",
        preferred_date: preferred_date || null,
        outlet: outlet || null,
        status: "new",
        lead_source: lead_source || "website",
        enquiry_channel: enquiry_channel || "form",
        budget_range: budget_range || null,
        notes: notes || null,
        source_domain: source_domain || (origin ? new URL(origin).hostname : null),
      })
      .select("id")
      .single()

    if (error) throw error

    return NextResponse.json(
      { success: true, id: data.id },
      { status: 201, headers: corsHeaders(origin) }
    )
  } catch (err) {
    console.error("[leads/submit]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders(origin) }
    )
  }
}
