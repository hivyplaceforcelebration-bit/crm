import { google } from "googleapis"

// ─── Site → Outlet mapping ──────────────────────────────────────────────────
//
// All 9 marketing sites are already verified in Google Search Console.
// 5 are Vadodara / Friends Factory Cafe branded, 4 are Surat / HIVY branded.
// Update the URLs below to match the exact GSC property URLs (use the
// "sc-domain:example.com" form for Domain properties, or the full
// "https://example.com/" form for URL-prefix properties — must match GSC
// exactly, including trailing slash for URL-prefix properties).

export type SiteOutlet = "Vadodara" | "Surat"

export const SITE_OUTLET_MAP: Record<string, SiteOutlet> = {
  // ── Vadodara / Friends Factory Cafe ──────────────────────────────────────
  "https://friendsfactorycafe.com/": "Vadodara",
  "https://candlelightdinnervadodara.com/": "Vadodara",
  "https://anniversarydinnervadodara.com/": "Vadodara",
  "https://surprisedatevadodara.com/": "Vadodara",
  "https://rooftopdatevadodara.com/": "Vadodara",
  "https://birthdaysurprisevadodara.com/": "Vadodara",
  "sc-domain:friendsfactorycafe.com": "Vadodara",
  "sc-domain:candlelightdinnervadodara.com": "Vadodara",
  "sc-domain:anniversarydinnervadodara.com": "Vadodara",
  "sc-domain:surprisedatevadodara.com": "Vadodara",
  "sc-domain:rooftopdatevadodara.com": "Vadodara",
  "sc-domain:birthdaysurprisevadodara.com": "Vadodara",

  // ── Surat / HIVY ─────────────────────────────────────────────────────────
  "https://birthdaysurprisesurat.com/": "Surat",
  "https://candlelightdinnersurat.com/": "Surat",
  "https://anniversarydinnersurat.com/": "Surat",
  "https://surprisedatesurat.com/": "Surat",
  "sc-domain:birthdaysurprisesurat.com": "Surat",
  "sc-domain:candlelightdinnersurat.com": "Surat",
  "sc-domain:anniversarydinnersurat.com": "Surat",
  "sc-domain:surprisedatesurat.com": "Surat",
}

export function getOutletForSite(siteUrl: string): SiteOutlet | "Unmapped" {
  if (SITE_OUTLET_MAP[siteUrl]) return SITE_OUTLET_MAP[siteUrl]
  const lower = siteUrl.toLowerCase()
  if (lower.includes("vadodara") || lower.includes("friendsfactory")) return "Vadodara"
  if (lower.includes("surat") || lower.includes("hivy")) return "Surat"
  return "Unmapped"
}

export function getConfiguredSites(): string[] {
  return Object.keys(SITE_OUTLET_MAP)
}

// ─── Auth ────────────────────────────────────────────────────────────────

let cachedClient: ReturnType<typeof google.searchconsole> | null = null

export function isSearchConsoleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SC_CLIENT_EMAIL && process.env.GOOGLE_SC_PRIVATE_KEY)
}

function getClient() {
  if (cachedClient) return cachedClient

  const email = process.env.GOOGLE_SC_CLIENT_EMAIL
  // Private keys are usually stored in env vars with literal "\n" sequences
  // instead of real newlines — convert them back.
  const key = process.env.GOOGLE_SC_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!email || !key) {
    throw new Error("Google Search Console credentials are not configured")
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  })

  cachedClient = google.searchconsole({ version: "v1", auth })
  return cachedClient
}

// ─── Query ───────────────────────────────────────────────────────────────

export type SearchConsoleRow = {
  siteUrl: string
  date: string // YYYY-MM-DD
  clicks: number
  impressions: number
  ctr: number
  position: number
}

/**
 * Fetches per-day search analytics for a single site, for the given date
 * range (inclusive, YYYY-MM-DD). Returns [] on any per-site failure (e.g.
 * the service account hasn't been granted access to that property yet)
 * rather than throwing, so one broken site doesn't take down the whole
 * dashboard.
 */
async function fetchSiteRows(siteUrl: string, startDate: string, endDate: string): Promise<SearchConsoleRow[]> {
  try {
    const sc = getClient()
    const res = await sc.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["date"],
        rowLimit: 25000,
      },
    })

    const rows = res.data.rows || []
    return rows.map((r) => ({
      siteUrl,
      date: r.keys?.[0] || "",
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    }))
  } catch (err) {
    console.error(`[search-console] failed to fetch data for ${siteUrl}:`, err)
    return []
  }
}

/**
 * Fetches per-day search analytics for every configured site in parallel.
 * Throws only if credentials are missing entirely — call
 * isSearchConsoleConfigured() first to avoid that.
 */
export async function fetchAllSitesRows(startDate: string, endDate: string): Promise<SearchConsoleRow[]> {
  if (!isSearchConsoleConfigured()) {
    throw new Error("Google Search Console credentials are not configured")
  }

  let sites = getConfiguredSites()
  try {
    const sc = getClient()
    const listRes = await sc.sites.list()
    const verified = (listRes.data.siteEntry || [])
      .filter((e) => e.permissionLevel && e.permissionLevel !== "siteUnverifiedUser" && e.siteUrl)
      .map((e) => e.siteUrl as string)

    if (verified.length > 0) {
      sites = verified
    }
  } catch (err) {
    console.warn("[search-console] could not auto-list verified sites, falling back to static list:", err)
  }

  const results = await Promise.all(sites.map((site) => fetchSiteRows(site, startDate, endDate)))
  return results.flat()
}
