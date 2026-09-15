"use server"

import {
  fetchAllSitesRows,
  isSearchConsoleConfigured,
  SITE_OUTLET_MAP,
  type SearchConsoleRow,
  type SiteOutlet,
} from "@/lib/google-search-console"

// ─── Helpers ────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7) // YYYY-MM
}

function monthLabel(key: string) {
  const [y, m] = key.split("-")
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  })
}

function quarterKey(dateStr: string) {
  const [y, m] = dateStr.split("-")
  const q = Math.ceil(parseInt(m) / 3)
  return `${y}-Q${q}`
}

function quarterLabel(key: string) {
  const [y, q] = key.split("-")
  return `${q} '${y.slice(2)}`
}

function yearKey(dateStr: string) {
  return dateStr.slice(0, 4)
}

function yearLabel(key: string) {
  return key
}

type Bucket = {
  key: string
  label: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

function bucketRows(
  rows: SearchConsoleRow[],
  keyFn: (d: string) => string,
  labelFn: (k: string) => string
): Bucket[] {
  const map: Record<string, { clicks: number; impressions: number; positionWeighted: number }> = {}

  rows.forEach((r) => {
    const key = keyFn(r.date)
    if (!map[key]) map[key] = { clicks: 0, impressions: 0, positionWeighted: 0 }
    map[key].clicks += r.clicks
    map[key].impressions += r.impressions
    map[key].positionWeighted += r.position * r.impressions
  })

  return Object.entries(map)
    .map(([key, v]) => ({
      key,
      label: labelFn(key),
      clicks: v.clicks,
      impressions: v.impressions,
      ctr: v.impressions > 0 ? Math.round((v.clicks / v.impressions) * 1000) / 10 : 0,
      position: v.impressions > 0 ? Math.round((v.positionWeighted / v.impressions) * 10) / 10 : 0,
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

// ─── Main Query ──────────────────────────────────────────────────────────────

export type SearchConsoleData = {
  configured: boolean
  summary: {
    totalClicks: number
    totalImpressions: number
    avgCtr: number
    avgPosition: number
  } | null
  monthly: Bucket[]
  quarterly: Bucket[]
  yearly: Bucket[]
  bySite: {
    site: string
    outlet: SiteOutlet | "Unmapped"
    clicks: number
    impressions: number
    ctr: number
    position: number
  }[]
}

const NOT_CONFIGURED: SearchConsoleData = {
  configured: false,
  summary: null,
  monthly: [],
  quarterly: [],
  yearly: [],
  bySite: [],
}

/**
 * Fetches Google Search Console performance (impressions, clicks, CTR, avg
 * position) across all configured marketing sites, bucketed by month /
 * quarter / year, and optionally filtered down to a single outlet's sites.
 *
 * Returns configured: false (instead of throwing) when the service account
 * env vars aren't set yet, so the UI can render a clean empty state.
 */
export async function getSearchConsoleData(outlet?: string): Promise<SearchConsoleData> {
  if (!isSearchConsoleConfigured()) return NOT_CONFIGURED

  // GSC data typically lags 2-3 days behind real time, and only ~16 months
  // of history is available. Fetch a ~13 month window so monthly, quarterly,
  // and yearly rollups all have enough data to be meaningful.
  const end = new Date()
  end.setDate(end.getDate() - 3)
  const start = new Date(end)
  start.setDate(start.getDate() - 395)

  let rows: SearchConsoleRow[]
  try {
    rows = await fetchAllSitesRows(toDateStr(start), toDateStr(end))
  } catch (err) {
    console.error("[search-console] getSearchConsoleData failed:", err)
    return NOT_CONFIGURED
  }

  if (outlet && outlet !== "all") {
    rows = rows.filter((r) => SITE_OUTLET_MAP[r.siteUrl] === outlet)
  }

  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0)
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0)
  const positionWeighted = rows.reduce((s, r) => s + r.position * r.impressions, 0)

  const summary = {
    totalClicks,
    totalImpressions,
    avgCtr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 1000) / 10 : 0,
    avgPosition: totalImpressions > 0 ? Math.round((positionWeighted / totalImpressions) * 10) / 10 : 0,
  }

  const monthly = bucketRows(rows, monthKey, monthLabel)
  const quarterly = bucketRows(rows, quarterKey, quarterLabel)
  const yearly = bucketRows(rows, yearKey, yearLabel)

  const siteMap: Record<string, { clicks: number; impressions: number; positionWeighted: number }> = {}
  rows.forEach((r) => {
    if (!siteMap[r.siteUrl]) siteMap[r.siteUrl] = { clicks: 0, impressions: 0, positionWeighted: 0 }
    siteMap[r.siteUrl].clicks += r.clicks
    siteMap[r.siteUrl].impressions += r.impressions
    siteMap[r.siteUrl].positionWeighted += r.position * r.impressions
  })

  const bySite = Object.entries(siteMap)
    .map(([site, v]) => ({
      site,
      outlet: SITE_OUTLET_MAP[site] || ("Unmapped" as const),
      clicks: v.clicks,
      impressions: v.impressions,
      ctr: v.impressions > 0 ? Math.round((v.clicks / v.impressions) * 1000) / 10 : 0,
      position: v.impressions > 0 ? Math.round((v.positionWeighted / v.impressions) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)

  return { configured: true, summary, monthly, quarterly, yearly, bySite }
}
