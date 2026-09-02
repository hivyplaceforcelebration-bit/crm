import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { isOriginAllowed, corsHeaders } from "@/lib/allowed-origins"

// In-memory sliding-window rate limit, per IP. Resets when the serverless
// instance recycles — not a substitute for a shared store at scale, but it
// stops basic single-instance abuse without external deps.
const RATE_LIMIT_MAX = 60
const RATE_LIMIT_WINDOW_MS = 60_000
const requestLog = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = (requestLog.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  timestamps.push(now)
  requestLog.set(ip, timestamps)
  if (requestLog.size > 5000) requestLog.clear()
  return timestamps.length > RATE_LIMIT_MAX
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  return forwarded?.split(",")[0]?.trim() || "unknown"
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin")
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")
  const isDev = process.env.NODE_ENV === "development"

  if (!isDev && !isOriginAllowed(origin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders(origin) })
  }

  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: corsHeaders(origin) }
    )
  }

  try {
    const body = await request.json()
    const { site, source_domain, page_path, referrer, session_id } = body

    if (!site || !source_domain || !page_path || !session_id) {
      return NextResponse.json(
        { error: "site, source_domain, page_path and session_id are required" },
        { status: 400, headers: corsHeaders(origin) }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase.from("page_views").insert({
      site,
      source_domain,
      page_path,
      referrer: referrer || null,
      session_id,
      user_agent: request.headers.get("user-agent") || null,
    })

    if (error) throw error

    return NextResponse.json({ success: true }, { status: 201, headers: corsHeaders(origin) })
  } catch (err) {
    console.error("[track]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders(origin) }
    )
  }
}
