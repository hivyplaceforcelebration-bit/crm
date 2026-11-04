import { google } from "googleapis"

export interface GA4Overview {
  activeUsers: number
  newUsers: number
  sessions: number
  pageViews: number
  avgSessionDuration: number // in seconds
  bounceRate: number // percentage 0-100
  realtimeUsers: number
}

export interface GA4DailyTrend {
  date: string // YYYY-MM-DD
  activeUsers: number
  sessions: number
  pageViews: number
}

export interface GA4TrafficSource {
  channel: string // "Direct", "Organic Search", "Organic Social", "Referral", etc.
  sessions: number
  users: number
  percentage: number
}

export interface GA4TopPage {
  path: string
  title: string
  pageViews: number
  activeUsers: number
}

export interface GA4City {
  city: string
  users: number
  sessions: number
}

export interface GA4Device {
  device: string
  users: number
  percentage: number
}

export interface GA4ReportData {
  configured: boolean
  hasPermission: boolean
  errorMessage?: string
  propertyId: string
  brand: "FFC" | "HIVY" | "ALL"
  brandLabel: string
  overview: GA4Overview
  dailyTrends: GA4DailyTrend[]
  trafficSources: GA4TrafficSource[]
  topPages: GA4TopPage[]
  topCities: GA4City[]
  devices: GA4Device[]
}

function getJwtAuth() {
  const email = process.env.GOOGLE_SC_CLIENT_EMAIL
  const key = process.env.GOOGLE_SC_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!email || !key) return null

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  })
}

export function getPropertyIdForOutlet(outlet?: string): {
  propertyId: string | null
  brand: "FFC" | "HIVY" | "ALL"
  brandLabel: string
} {
  const norm = (outlet || "").toLowerCase()
  if (norm.includes("surat") || norm.includes("hivy")) {
    const prop = process.env.GA4_PROPERTY_ID_HIVY || process.env.GA4_PROPERTY_ID_SURAT || null
    return {
      propertyId: prop,
      brand: "HIVY",
      brandLabel: "HIVY – Place for Celebrations (Surat)",
    }
  }

  // Default to FFC / Vadodara
  const prop =
    process.env.GA4_PROPERTY_ID_FFC ||
    process.env.GA4_PROPERTY_ID_VADODARA ||
    process.env.GA4_PROPERTY_ID ||
    "519483840"

  return {
    propertyId: prop,
    brand: norm === "all" ? "ALL" : "FFC",
    brandLabel: norm === "all" ? "Friends Factory Cafe (Vadodara)" : "Friends Factory Cafe (Vadodara)",
  }
}

export async function fetchGA4Analytics(days: number = 30, outlet?: string): Promise<GA4ReportData> {
  const { propertyId, brand, brandLabel } = getPropertyIdForOutlet(outlet)
  const auth = getJwtAuth()

  const defaultEmpty: GA4ReportData = {
    configured: Boolean(propertyId && auth),
    hasPermission: false,
    propertyId: propertyId || "",
    brand,
    brandLabel,
    overview: {
      activeUsers: 0,
      newUsers: 0,
      sessions: 0,
      pageViews: 0,
      avgSessionDuration: 0,
      bounceRate: 0,
      realtimeUsers: 0,
    },
    dailyTrends: [],
    trafficSources: [],
    topPages: [],
    topCities: [],
    devices: [],
  }

  if (!auth) {
    defaultEmpty.errorMessage = "Service account credentials not configured in environment."
    return defaultEmpty
  }

  if (!propertyId) {
    defaultEmpty.configured = false
    defaultEmpty.errorMessage =
      brand === "HIVY"
        ? "HIVY GA4 Property ID is not configured yet. Add GA4_PROPERTY_ID_HIVY to .env.local"
        : "Google Analytics Property ID not configured."
    return defaultEmpty
  }

  const analyticsData = google.analyticsdata({ version: "v1beta", auth })
  const property = `properties/${propertyId}`

  try {
    // 1. Fetch Realtime Users (Last 30 mins)
    let realtimeUsers = 0
    try {
      const rtRes = await analyticsData.properties.runRealtimeReport({
        property,
        requestBody: {
          metrics: [{ name: "activeUsers" }],
        },
      })
      realtimeUsers = parseInt(rtRes.data.rows?.[0]?.metricValues?.[0]?.value || "0", 10)
    } catch {
      // Realtime may fail if property is fresh; fallback to 0
      realtimeUsers = 0
    }

    // 2. Fetch Overview Metrics
    const overviewRes = await analyticsData.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        metrics: [
          { name: "activeUsers" },
          { name: "newUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
          { name: "bounceRate" },
        ],
      },
    })

    const m = overviewRes.data.rows?.[0]?.metricValues || []
    const overview: GA4Overview = {
      activeUsers: parseInt(m[0]?.value || "0", 10),
      newUsers: parseInt(m[1]?.value || "0", 10),
      sessions: parseInt(m[2]?.value || "0", 10),
      pageViews: parseInt(m[3]?.value || "0", 10),
      avgSessionDuration: Math.round(parseFloat(m[4]?.value || "0")),
      bounceRate: Math.round(parseFloat(m[5]?.value || "0") * 100),
      realtimeUsers,
    }

    // 3. Fetch Daily Trends
    const trendsRes = await analyticsData.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
        ],
        orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
      },
    })

    const dailyTrends: GA4DailyTrend[] = (trendsRes.data.rows || []).map((row) => {
      const d = row.dimensionValues?.[0]?.value || ""
      const formattedDate = d.length === 8
        ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
        : d

      return {
        date: formattedDate,
        activeUsers: parseInt(row.metricValues?.[0]?.value || "0", 10),
        sessions: parseInt(row.metricValues?.[1]?.value || "0", 10),
        pageViews: parseInt(row.metricValues?.[2]?.value || "0", 10),
      }
    })

    // 4. Fetch Traffic Sources
    const channelsRes = await analyticsData.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: "8",
      },
    })

    const channelRows = channelsRes.data?.rows || []
    const totalChannelSessions = channelRows.reduce(
      (sum: number, r) => sum + parseInt(r.metricValues?.[0]?.value || "0", 10),
      0
    )

    const trafficSources: GA4TrafficSource[] = channelRows.map((row) => {
      const s = parseInt(row.metricValues?.[0]?.value || "0", 10)
      return {
        channel: row.dimensionValues?.[0]?.value || "Direct",
        sessions: s,
        users: parseInt(row.metricValues?.[1]?.value || "0", 10),
        percentage: totalChannelSessions > 0 ? Math.round((s / totalChannelSessions) * 100) : 0,
      }
    })

    // 5. Fetch Top Visited Pages
    const pagesRes = await analyticsData.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: "10",
      },
    })

    const topPages: GA4TopPage[] = (pagesRes.data?.rows || []).map((row) => ({
      path: row.dimensionValues?.[0]?.value || "/",
      title: row.dimensionValues?.[1]?.value || "Home",
      pageViews: parseInt(row.metricValues?.[0]?.value || "0", 10),
      activeUsers: parseInt(row.metricValues?.[1]?.value || "0", 10),
    }))

    // 6. Fetch Top Cities
    const citiesRes = await analyticsData.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "city" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: "8",
      },
    })

    const topCities: GA4City[] = (citiesRes.data?.rows || [])
      .filter((r) => r.dimensionValues?.[0]?.value && r.dimensionValues[0].value !== "(not set)")
      .map((row) => ({
        city: row.dimensionValues?.[0]?.value || "Unknown",
        users: parseInt(row.metricValues?.[0]?.value || "0", 10),
        sessions: parseInt(row.metricValues?.[1]?.value || "0", 10),
      }))

    // 7. Fetch Device Categories
    const devicesRes = await analyticsData.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      },
    })

    const totalDeviceUsers = (devicesRes.data?.rows || []).reduce(
      (sum, r) => sum + parseInt(r.metricValues?.[0]?.value || "0", 10),
      0
    )

    const devices: GA4Device[] = (devicesRes.data?.rows || []).map((row) => {
      const u = parseInt(row.metricValues?.[0]?.value || "0", 10)
      return {
        device: row.dimensionValues?.[0]?.value || "mobile",
        users: u,
        percentage: totalDeviceUsers > 0 ? Math.round((u / totalDeviceUsers) * 100) : 0,
      }
    })

    return {
      configured: true,
      hasPermission: true,
      propertyId,
      brand,
      brandLabel,
      overview,
      dailyTrends,
      trafficSources,
      topPages,
      topCities,
      devices,
    }
  } catch (err: any) {
    console.error("[GA4] fetchGA4Analytics failed:", err)
    defaultEmpty.errorMessage = err.message || "Failed to fetch GA4 report."
    defaultEmpty.hasPermission = !err.message?.includes("sufficient permissions")
    return defaultEmpty
  }
}
