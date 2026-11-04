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

  if (norm === "all") {
    const allProps = [
      process.env.GA4_PROPERTY_ID_FFC,
      process.env.GA4_PROPERTY_ID_HIVY,
      process.env.GA4_PROPERTY_ID_BMM,
    ]
      .filter(Boolean)
      .join(",")
    return {
      propertyId: allProps || process.env.GA4_PROPERTY_ID || "519483840",
      brand: "ALL",
      brandLabel: "All Outlets (Vadodara & Surat & BookMyMoment)",
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
    brand: "FFC",
    brandLabel: "Friends Factory Cafe (Vadodara)",
  }
}

async function fetchSinglePropertyData(
  analyticsData: any,
  propertyId: string,
  days: number
): Promise<{
  overview: GA4Overview
  dailyTrends: GA4DailyTrend[]
  trafficSources: GA4TrafficSource[]
  topPages: GA4TopPage[]
  topCities: GA4City[]
  devices: GA4Device[]
}> {
  const property = `properties/${propertyId}`

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
    realtimeUsers = 0
  }

  // 2. Fetch Overview Metrics
  let overview: GA4Overview = {
    activeUsers: 0,
    newUsers: 0,
    sessions: 0,
    pageViews: 0,
    avgSessionDuration: 0,
    bounceRate: 0,
    realtimeUsers,
  }
  try {
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
    overview = {
      activeUsers: parseInt(m[0]?.value || "0", 10),
      newUsers: parseInt(m[1]?.value || "0", 10),
      sessions: parseInt(m[2]?.value || "0", 10),
      pageViews: parseInt(m[3]?.value || "0", 10),
      avgSessionDuration: Math.round(parseFloat(m[4]?.value || "0")),
      bounceRate: Math.round(parseFloat(m[5]?.value || "0") * 100),
      realtimeUsers,
    }
  } catch {}

  // 3. Fetch Daily Trends
  let dailyTrends: GA4DailyTrend[] = []
  try {
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

    dailyTrends = (trendsRes.data.rows || []).map((row: any) => {
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
  } catch {}

  // 4. Fetch Traffic Sources
  let trafficSources: GA4TrafficSource[] = []
  try {
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
      (sum: number, r: any) => sum + parseInt(r.metricValues?.[0]?.value || "0", 10),
      0
    )

    trafficSources = channelRows.map((row: any) => {
      const s = parseInt(row.metricValues?.[0]?.value || "0", 10)
      return {
        channel: row.dimensionValues?.[0]?.value || "Direct",
        sessions: s,
        users: parseInt(row.metricValues?.[1]?.value || "0", 10),
        percentage: totalChannelSessions > 0 ? Math.round((s / totalChannelSessions) * 100) : 0,
      }
    })
  } catch {}

  // 5. Fetch Top Visited Pages
  let topPages: GA4TopPage[] = []
  try {
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

    topPages = (pagesRes.data?.rows || []).map((row: any) => ({
      path: row.dimensionValues?.[0]?.value || "/",
      title: row.dimensionValues?.[1]?.value || "Home",
      pageViews: parseInt(row.metricValues?.[0]?.value || "0", 10),
      activeUsers: parseInt(row.metricValues?.[1]?.value || "0", 10),
    }))
  } catch {}

  // 6. Fetch Top Cities
  let topCities: GA4City[] = []
  try {
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

    topCities = (citiesRes.data?.rows || [])
      .filter((r: any) => r.dimensionValues?.[0]?.value && r.dimensionValues[0].value !== "(not set)")
      .map((row: any) => ({
        city: row.dimensionValues?.[0]?.value || "Unknown",
        users: parseInt(row.metricValues?.[0]?.value || "0", 10),
        sessions: parseInt(row.metricValues?.[1]?.value || "0", 10),
      }))
  } catch {}

  // 7. Fetch Device Categories
  let devices: GA4Device[] = []
  try {
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
      (sum: number, r: any) => sum + parseInt(r.metricValues?.[0]?.value || "0", 10),
      0
    )

    devices = (devicesRes.data?.rows || []).map((row: any) => {
      const u = parseInt(row.metricValues?.[0]?.value || "0", 10)
      return {
        device: row.dimensionValues?.[0]?.value || "mobile",
        users: u,
        percentage: totalDeviceUsers > 0 ? Math.round((u / totalDeviceUsers) * 100) : 0,
      }
    })
  } catch {}

  return {
    overview,
    dailyTrends,
    trafficSources,
    topPages,
    topCities,
    devices,
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
  const propertyIds = propertyId.split(",").map((id) => id.trim()).filter(Boolean)

  try {
    const results = await Promise.all(
      propertyIds.map((id) => fetchSinglePropertyData(analyticsData, id, days))
    )

    if (results.length === 0) return defaultEmpty

    // Combine Overview
    const totalActiveUsers = results.reduce((s, r) => s + r.overview.activeUsers, 0)
    const totalNewUsers = results.reduce((s, r) => s + r.overview.newUsers, 0)
    const totalSessions = results.reduce((s, r) => s + r.overview.sessions, 0)
    const totalPageViews = results.reduce((s, r) => s + r.overview.pageViews, 0)
    const totalRealtimeUsers = results.reduce((s, r) => s + r.overview.realtimeUsers, 0)

    const weightedAvgDuration = totalSessions > 0
      ? Math.round(results.reduce((s, r) => s + r.overview.avgSessionDuration * r.overview.sessions, 0) / totalSessions)
      : 0

    const weightedBounceRate = totalSessions > 0
      ? Math.round(results.reduce((s, r) => s + r.overview.bounceRate * r.overview.sessions, 0) / totalSessions)
      : 0

    const overview: GA4Overview = {
      activeUsers: totalActiveUsers,
      newUsers: totalNewUsers,
      sessions: totalSessions,
      pageViews: totalPageViews,
      avgSessionDuration: weightedAvgDuration,
      bounceRate: weightedBounceRate,
      realtimeUsers: totalRealtimeUsers,
    }

    // Combine Daily Trends
    const trendMap: Record<string, { activeUsers: number; sessions: number; pageViews: number }> = {}
    results.forEach((r) => {
      r.dailyTrends.forEach((t) => {
        if (!trendMap[t.date]) trendMap[t.date] = { activeUsers: 0, sessions: 0, pageViews: 0 }
        trendMap[t.date].activeUsers += t.activeUsers
        trendMap[t.date].sessions += t.sessions
        trendMap[t.date].pageViews += t.pageViews
      })
    })
    const dailyTrends: GA4DailyTrend[] = Object.entries(trendMap)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Combine Traffic Sources
    const channelMap: Record<string, { sessions: number; users: number }> = {}
    results.forEach((r) => {
      r.trafficSources.forEach((c) => {
        if (!channelMap[c.channel]) channelMap[c.channel] = { sessions: 0, users: 0 }
        channelMap[c.channel].sessions += c.sessions
        channelMap[c.channel].users += c.users
      })
    })
    const totalCombinedChannelSessions = Object.values(channelMap).reduce((s, v) => s + v.sessions, 0)
    const trafficSources: GA4TrafficSource[] = Object.entries(channelMap)
      .map(([channel, v]) => ({
        channel,
        sessions: v.sessions,
        users: v.users,
        percentage: totalCombinedChannelSessions > 0 ? Math.round((v.sessions / totalCombinedChannelSessions) * 100) : 0,
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 8)

    // Combine Top Pages
    const pageMap: Record<string, { title: string; pageViews: number; activeUsers: number }> = {}
    results.forEach((r) => {
      r.topPages.forEach((p) => {
        if (!pageMap[p.path]) pageMap[p.path] = { title: p.title, pageViews: 0, activeUsers: 0 }
        pageMap[p.path].pageViews += p.pageViews
        pageMap[p.path].activeUsers += p.activeUsers
      })
    })
    const topPages: GA4TopPage[] = Object.entries(pageMap)
      .map(([path, v]) => ({ path, title: v.title, pageViews: v.pageViews, activeUsers: v.activeUsers }))
      .sort((a, b) => b.pageViews - a.pageViews)
      .slice(0, 10)

    // Combine Top Cities
    const cityMap: Record<string, { users: number; sessions: number }> = {}
    results.forEach((r) => {
      r.topCities.forEach((c) => {
        if (!cityMap[c.city]) cityMap[c.city] = { users: 0, sessions: 0 }
        cityMap[c.city].users += c.users
        cityMap[c.city].sessions += c.sessions
      })
    })
    const topCities: GA4City[] = Object.entries(cityMap)
      .map(([city, v]) => ({ city, users: v.users, sessions: v.sessions }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 8)

    // Combine Devices
    const deviceMap: Record<string, number> = {}
    results.forEach((r) => {
      r.devices.forEach((d) => {
        deviceMap[d.device] = (deviceMap[d.device] || 0) + d.users
      })
    })
    const totalCombinedDeviceUsers = Object.values(deviceMap).reduce((s, v) => s + v, 0)
    const devices: GA4Device[] = Object.entries(deviceMap)
      .map(([device, users]) => ({
        device,
        users,
        percentage: totalCombinedDeviceUsers > 0 ? Math.round((users / totalCombinedDeviceUsers) * 100) : 0,
      }))
      .sort((a, b) => b.users - a.users)

    return {
      configured: true,
      hasPermission: true,
      propertyId: propertyIds[0],
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
