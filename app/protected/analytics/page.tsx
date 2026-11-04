"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TrendingUp, IndianRupee, Users, Calendar, Star,
  ArrowUpRight, BarChart3, PieChart, Activity, Target,
  Gift, Heart, Cake, Sparkles, Clock, MapPin, Building, RefreshCw,
  Search, MousePointerClick, Eye, Gauge, Globe, Smartphone, Monitor, Compass, ShieldAlert, CheckCircle2,
} from "lucide-react"
import { getAnalyticsData } from "@/lib/actions/analytics"
import { getSearchConsoleData } from "@/lib/actions/search-console"
import { getGoogleAnalyticsData } from "@/lib/actions/google-analytics"
import { useBrand } from "@/hooks/use-brand"
import { toast } from "sonner"

// ─── Config ─────────────────────────────────────────────────────────────────

const DATE_OPTIONS = [
  { label: "Last 7 days",  value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "Year to date", value: "0" },
]

const OCCASION_CONFIG: Record<string, { icon: typeof Heart; color: string; bg: string }> = {
  candlelight:         { icon: Star,     color: "text-amber-600",  bg: "bg-amber-50" },
  birthday:            { icon: Cake,     color: "text-purple-600", bg: "bg-purple-50" },
  anniversary:         { icon: Heart,    color: "text-pink-600",   bg: "bg-pink-50" },
  proposal:            { icon: Gift,     color: "text-red-600",    bg: "bg-red-50" },
  private_celebration: { icon: Sparkles, color: "text-blue-600",   bg: "bg-blue-50" },
  other:               { icon: Sparkles, color: "text-gray-500",   bg: "bg-gray-50" },
}

const SOURCE_COLORS: Record<string, string> = {
  instagram: "bg-pink-500",
  facebook:  "bg-blue-500",
  google:    "bg-orange-500",
  whatsapp:  "bg-green-500",
  referral:  "bg-emerald-500",
  walkin:    "bg-gray-500",
  website:   "bg-violet-500",
}

// ─── Skeleton Loaders ────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsData>>
type SearchConsoleData = Awaited<ReturnType<typeof getSearchConsoleData>>
type GA4Data = Awaited<ReturnType<typeof getGoogleAnalyticsData>>

const SEARCH_GRANULARITY_OPTIONS = [
  { label: "Monthly", value: "monthly" as const },
  { label: "Quarterly", value: "quarterly" as const },
  { label: "Yearly", value: "yearly" as const },
]

function formatCompact(n: number) {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return `${n}`
}

export default function AnalyticsPage() {
  const { activeCity, activeBrand, isReady } = useBrand()
  const [days, setDays] = useState("30")
  const [outlet, setOutlet] = useState("all")
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const [scData, setScData] = useState<SearchConsoleData | null>(null)
  const [scLoading, setScLoading] = useState(true)
  const [scGranularity, setScGranularity] = useState<"monthly" | "quarterly" | "yearly">("monthly")
  const [scPeriodKey, setScPeriodKey] = useState<string>("all")

  const [gaData, setGaData] = useState<GA4Data | null>(null)
  const [gaLoading, setGaLoading] = useState(true)

  // Sync with global activeCity from top bar
  useEffect(() => {
    if (isReady) {
      setOutlet(activeCity)
    }
  }, [activeCity, isReady])

  const load = useCallback(async () => {
    if (!isReady) return
    setLoading(true)
    try {
      const result = await getAnalyticsData(parseInt(days), outlet === "all" ? undefined : outlet)
      setData(result)
    } catch {
      toast.error("Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }, [days, outlet, isReady])

  const loadSearchConsole = useCallback(async () => {
    if (!isReady) return
    setScLoading(true)
    try {
      const result = await getSearchConsoleData(outlet === "all" ? undefined : outlet)
      setScData(result)
    } catch {
      toast.error("Failed to load Search Console data")
    } finally {
      setScLoading(false)
    }
  }, [outlet, isReady])

  const loadGoogleAnalytics = useCallback(async () => {
    if (!isReady) return
    setGaLoading(true)
    try {
      const result = await getGoogleAnalyticsData(parseInt(days) || 30, outlet === "all" ? undefined : outlet)
      setGaData(result)
    } catch {
      toast.error("Failed to load Google Analytics data")
    } finally {
      setGaLoading(false)
    }
  }, [days, outlet, isReady])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadSearchConsole() }, [loadSearchConsole])
  useEffect(() => { loadGoogleAnalytics() }, [loadGoogleAnalytics])

  const scBuckets = scData?.[scGranularity] ?? []
  const scMaxImpressions = scBuckets.length > 0 ? Math.max(...scBuckets.map((b) => b.impressions), 1) : 1

  // Dynamic period selection (All vs specific Month/Quarter/Year)
  const activeScBucket = scPeriodKey !== "all" ? scBuckets.find((b) => b.key === scPeriodKey) : null
  const scSummary = activeScBucket
    ? {
        impressions: activeScBucket.impressions,
        clicks: activeScBucket.clicks,
        ctr: activeScBucket.ctr,
        avgPosition: activeScBucket.position,
        label: activeScBucket.label,
      }
    : {
        impressions: scData?.summary?.totalImpressions ?? 0,
        clicks: scData?.summary?.totalClicks ?? 0,
        ctr: scData?.summary?.avgCtr ?? 0,
        avgPosition: scData?.summary?.avgPosition ?? 0,
        label: "Last ~13 months (All)",
      }
  const scSiteList = activeScBucket?.bySite ?? scData?.bySite ?? []

  const s = data?.summary
  const maxRevenue = data ? Math.max(...data.revenueByMonth.map((r) => r.revenue), 1) : 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Real-time performance across your outlets</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeCity === "all" && (
            <Select value={outlet} onValueChange={setOutlet}>
              <SelectTrigger className="w-[140px]">
                <Building className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                <SelectItem value="Surat">Surat</SelectItem>
                <SelectItem value="Vadodara">Vadodara</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => { load(); loadSearchConsole() }}
            disabled={loading || scLoading}
          >
            <RefreshCw className={`h-4 w-4 ${loading || scLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {loading || !s ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <IndianRupee className="h-3 w-3" /> Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <div className="text-2xl font-bold">
                  {s.totalRevenue >= 100000
                    ? `₹${(s.totalRevenue / 100000).toFixed(1)}L`
                    : `₹${(s.totalRevenue / 1000).toFixed(0)}k`}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Collected (paid invoices)</p>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-100">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Bookings
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <div className="text-2xl font-bold text-blue-700">{s.totalBookings}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Confirmed &amp; completed</p>
              </CardContent>
            </Card>

            <Card className="bg-amber-50 border-amber-100">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Target className="h-3 w-3" /> Avg. Value
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <div className="text-2xl font-bold text-amber-700">
                  ₹{s.avgBookingValue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Per booking</p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-100">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Activity className="h-3 w-3" /> Conversion
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <div className="text-2xl font-bold text-purple-700">{s.conversionRate}%</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.convertedLeads} of {s.totalLeads} leads
                </p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50 border-emerald-100">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3 w-3" /> Repeats
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-4">
                <div className="text-2xl font-bold text-emerald-700">{s.repeatRate}%</div>
                <p className="text-xs text-muted-foreground mt-0.5">Return customers</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Revenue Trend + Occasion Breakdown */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Revenue Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" /> Revenue Trend
            </CardTitle>
            <CardDescription>Monthly collected revenue — last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || !data ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-12 h-4" />
                    <Skeleton className="flex-1 h-8 rounded-full" />
                    <Skeleton className="w-16 h-4" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {data.revenueByMonth.map((item, i) => {
                  const pct = (item.revenue / maxRevenue) * 100
                  const isLatest = i === data.revenueByMonth.length - 1
                  return (
                    <div key={item.month} className="flex items-center gap-3">
                      <div className="w-14 text-xs font-medium text-muted-foreground text-right shrink-0">
                        {item.month}
                      </div>
                      <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                        <div
                          className={`h-full rounded-lg transition-all duration-500 ${isLatest ? "bg-primary" : "bg-primary/50"}`}
                          style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
                        />
                      </div>
                      <div className="w-20 text-right text-xs font-semibold tabular-nums shrink-0">
                        {item.revenue > 0
                          ? item.revenue >= 100000
                            ? `₹${(item.revenue / 100000).toFixed(1)}L`
                            : `₹${(item.revenue / 1000).toFixed(0)}k`
                          : "—"}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Occasion Breakdown */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4" /> By Occasion
            </CardTitle>
            <CardDescription>Bookings split by occasion type</CardDescription>
          </CardHeader>
          <CardContent>
            {loading || !data ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                    <Skeleton className="w-8 h-4" />
                  </div>
                ))}
              </div>
            ) : data.occasionBreakdown.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                No bookings in this period
              </div>
            ) : (
              <div className="space-y-3">
                {data.occasionBreakdown.slice(0, 6).map((item) => {
                  const cfg = OCCASION_CONFIG[item.occasion] || OCCASION_CONFIG.other
                  const Icon = cfg.icon
                  return (
                    <div key={item.occasion} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`h-4 w-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium capitalize">
                            {item.occasion.replace("_", " ")}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">{item.count}</span>
                        </div>
                        <Progress value={item.percentage} className="h-1.5" />
                      </div>
                      <div className="w-10 text-right text-xs font-semibold shrink-0">
                        {item.percentage}%
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Google Analytics 4 (Website Visitors & Traffic) ─── */}
      <Card className="border-amber-200/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-50/70 via-orange-50/50 to-transparent pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-stone-900">
                  <Activity className="h-5 w-5 text-amber-600" /> Google Analytics 4 — Visitors &amp; Traffic
                </CardTitle>
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold">
                  {activeCity === "Surat" ? "✨ HIVY Cafe" : "☕ Friends Factory Cafe"}
                </Badge>
                {gaData?.propertyId && (
                  <Badge variant="secondary" className="text-[11px] font-mono text-stone-600">
                    ID: {gaData.propertyId}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs mt-1">
                Real-time website traffic, user sessions, channels and popular packages for {activeCity === "Surat" ? "HIVY (Surat)" : "Friends Factory Cafe (Vadodara)"}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {/* Realtime live users pill */}
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full shadow-xs">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-semibold text-emerald-800">
                  {gaData?.overview?.realtimeUsers ?? 0} Live Right Now
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1 border-stone-300"
                onClick={() => loadGoogleAnalytics()}
                disabled={gaLoading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${gaLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-6">
          {gaLoading ? (
            <div className="space-y-4">
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
              </div>
              <Skeleton className="h-44 w-full" />
            </div>
          ) : !gaData?.configured ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2 bg-stone-50 rounded-xl p-6 border border-dashed">
              <ShieldAlert className="h-9 w-9 text-amber-600" />
              <p className="text-sm font-semibold">
                {outlet === "Surat"
                  ? "HIVY (Surat) GA4 Property ID Missing"
                  : "Google Analytics Credentials Missing"}
              </p>
              <p className="text-xs text-muted-foreground max-w-md">
                {outlet === "Surat" ? (
                  <>
                    To view analytics for HIVY Surat, add your HIVY GA4 Property ID in{" "}
                    <code className="bg-stone-200 px-1 py-0.5 rounded text-stone-800">.env.local</code>:
                    <br />
                    <code className="font-mono text-amber-800 text-[11px] block mt-1">
                      GA4_PROPERTY_ID_HIVY="your_property_id"
                    </code>
                  </>
                ) : (
                  <>
                    Configure your service account in{" "}
                    <code className="bg-stone-200 px-1 py-0.5 rounded text-stone-800">.env.local</code> to see live visitors and sessions.
                  </>
                )}
              </p>
            </div>
          ) : !gaData?.hasPermission ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3 bg-amber-50/70 rounded-xl p-6 border border-amber-200">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-bold text-amber-950">1-Step Setup Required in Google Analytics</p>
                <p className="text-xs text-amber-800/90 max-w-lg mt-1">
                  Google Analytics Data API is connected! To display your live traffic, add this Service Account as a <strong>Viewer</strong> in GA4:
                </p>
              </div>

              <div className="bg-white px-4 py-2 rounded-lg border border-amber-300 text-xs font-mono select-all text-stone-800 shadow-xs">
                friendsfactory-indexing@third-fold-463513-n9.iam.gserviceaccount.com
              </div>

              <div className="text-[11px] text-amber-900 bg-amber-100/60 p-3 rounded-lg max-w-md text-left space-y-1">
                <p className="font-semibold">How to grant access in 30 seconds:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-amber-850">
                  <li>In Google Analytics, click <strong>⚙️ Admin</strong> (bottom-left)</li>
                  <li>Click <strong>Property Access Management</strong></li>
                  <li>Click <strong>+</strong> ➔ <strong>Add users</strong> and paste the email above with <strong>Viewer</strong> role</li>
                </ol>
              </div>

              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white mt-1 gap-1 text-xs"
                onClick={() => loadGoogleAnalytics()}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Check Connection Now
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Metrics Row */}
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                <Card className="bg-gradient-to-br from-amber-50 to-orange-50/60 border-amber-200/70">
                  <CardHeader className="pb-1 pt-3.5 px-3.5">
                    <CardTitle className="text-[11px] font-semibold text-amber-900 flex items-center gap-1">
                      <Users className="h-3 w-3 text-amber-600" /> Active Visitors
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3.5 px-3.5">
                    <div className="text-2xl font-bold text-amber-950">
                      {gaData.overview.activeUsers.toLocaleString()}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Last {days} days</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50/60 border-blue-200/70">
                  <CardHeader className="pb-1 pt-3.5 px-3.5">
                    <CardTitle className="text-[11px] font-semibold text-blue-900 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-blue-600" /> New Visitors
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3.5 px-3.5">
                    <div className="text-2xl font-bold text-blue-950">
                      {gaData.overview.newUsers.toLocaleString()}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">First-time visitors</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-violet-50 to-purple-50/60 border-violet-200/70">
                  <CardHeader className="pb-1 pt-3.5 px-3.5">
                    <CardTitle className="text-[11px] font-semibold text-violet-900 flex items-center gap-1">
                      <Activity className="h-3 w-3 text-violet-600" /> Total Sessions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3.5 px-3.5">
                    <div className="text-2xl font-bold text-violet-950">
                      {gaData.overview.sessions.toLocaleString()}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Browsing sessions</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-teal-50/60 border-emerald-200/70">
                  <CardHeader className="pb-1 pt-3.5 px-3.5">
                    <CardTitle className="text-[11px] font-semibold text-emerald-900 flex items-center gap-1">
                      <Eye className="h-3 w-3 text-emerald-600" /> Page Views
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3.5 px-3.5">
                    <div className="text-2xl font-bold text-emerald-950">
                      {gaData.overview.pageViews.toLocaleString()}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Total views</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-rose-50 to-pink-50/60 border-rose-200/70">
                  <CardHeader className="pb-1 pt-3.5 px-3.5">
                    <CardTitle className="text-[11px] font-semibold text-rose-900 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-rose-600" /> Avg. Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3.5 px-3.5">
                    <div className="text-2xl font-bold text-rose-950">
                      {Math.floor(gaData.overview.avgSessionDuration / 60)}m {gaData.overview.avgSessionDuration % 60}s
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Per session</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-stone-50 to-gray-100/70 border-stone-200/70">
                  <CardHeader className="pb-1 pt-3.5 px-3.5">
                    <CardTitle className="text-[11px] font-semibold text-stone-900 flex items-center gap-1">
                      <Gauge className="h-3 w-3 text-stone-600" /> Bounce Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3.5 px-3.5">
                    <div className="text-2xl font-bold text-stone-950">
                      {gaData.overview.bounceRate}%
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Single page exits</p>
                  </CardContent>
                </Card>
              </div>

              {/* 2-Column Section: Trends & Traffic Channels */}
              <div className="grid gap-5 md:grid-cols-2">
                {/* Traffic Channels */}
                <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs">
                  <h4 className="text-sm font-semibold text-stone-800 flex items-center gap-2 mb-3">
                    <Compass className="h-4 w-4 text-amber-600" /> Traffic Channels (Acquisition)
                  </h4>
                  {gaData.trafficSources.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-6 text-center">No traffic channels detected yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {gaData.trafficSources.map((ch) => (
                        <div key={ch.channel} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-stone-700">{ch.channel}</span>
                            <span className="text-muted-foreground font-mono">
                              {ch.sessions.toLocaleString()} sessions ({ch.percentage}%)
                            </span>
                          </div>
                          <Progress value={ch.percentage} className="h-2 bg-stone-100" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Visitor Cities & Devices */}
                <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-stone-800 flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-amber-600" /> Top Visitor Cities
                    </h4>
                    {gaData.topCities.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No city data available yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {gaData.topCities.map((c) => (
                          <Badge key={c.city} variant="secondary" className="px-2.5 py-1 text-xs gap-1.5 bg-stone-100 text-stone-800">
                            <span>📍 {c.city}</span>
                            <span className="font-bold text-amber-700">{c.users}</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-stone-100">
                    <h4 className="text-xs font-semibold text-stone-700 flex items-center gap-2 mb-2">
                      <Smartphone className="h-3.5 w-3.5 text-stone-500" /> Device Breakdown
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {gaData.devices.map((d) => (
                        <div key={d.device} className="bg-stone-50 p-2 rounded-lg border border-stone-200/60">
                          <p className="text-xs capitalize font-medium text-stone-700 flex items-center justify-center gap-1">
                            {d.device === "mobile" ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                            {d.device}
                          </p>
                          <p className="text-sm font-bold text-stone-900 mt-0.5">{d.percentage}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Visited Pages / Setups Table */}
              {gaData.topPages.length > 0 && (
                <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-2xs">
                  <h4 className="text-sm font-semibold text-stone-800 flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-amber-600" /> Top Visited Packages &amp; Pages
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Page Path</TableHead>
                        <TableHead className="text-xs">Page Title</TableHead>
                        <TableHead className="text-right text-xs">Page Views</TableHead>
                        <TableHead className="text-right text-xs">Active Visitors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gaData.topPages.map((p) => (
                        <TableRow key={p.path} className="text-xs">
                          <TableCell className="font-mono text-stone-700 font-medium">
                            {p.path}
                          </TableCell>
                          <TableCell className="text-stone-600 max-w-xs truncate">
                            {p.title}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums text-amber-700">
                            {p.pageViews.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-stone-800">
                            {p.activeUsers.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Performance — Google Search Console */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4" /> Search Performance
            </CardTitle>
            <CardDescription>Google Search Console — impressions &amp; clicks across your websites</CardDescription>
          </div>
          {scData?.configured && (
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={scGranularity}
                onValueChange={(v) => {
                  setScGranularity(v as typeof scGranularity)
                  setScPeriodKey("all")
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEARCH_GRANULARITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={scPeriodKey} onValueChange={setScPeriodKey}>
                <SelectTrigger className="w-[160px]">
                  <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {scGranularity === "monthly"
                      ? "All Months (~13m)"
                      : scGranularity === "quarterly"
                      ? "All Quarters"
                      : "All Years"}
                  </SelectItem>
                  {scBuckets.slice().reverse().map((b) => (
                    <SelectItem key={b.key} value={b.key}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {scLoading ? (
            <div className="space-y-3">
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
              </div>
              <Skeleton className="h-40 w-full" />
            </div>
          ) : !scData?.configured ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <Globe className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Search Console not connected</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Add a Google service account (with read access to your Search Console properties)
                to see impressions, clicks, CTR and average position from your websites here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <Card className="bg-violet-50 border-violet-100">
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Eye className="h-3 w-3" /> Impressions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 px-4">
                    <div className="text-2xl font-bold text-violet-700">
                      {formatCompact(scSummary.impressions)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{scSummary.label}</p>
                  </CardContent>
                </Card>

                <Card className="bg-cyan-50 border-cyan-100">
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <MousePointerClick className="h-3 w-3" /> Clicks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 px-4">
                    <div className="text-2xl font-bold text-cyan-700">
                      {formatCompact(scSummary.clicks)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {scPeriodKey === "all" ? "Landed on your sites" : `Clicks in ${scSummary.label}`}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-100">
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Activity className="h-3 w-3" /> CTR
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 px-4">
                    <div className="text-2xl font-bold text-orange-700">{scSummary.ctr}%</div>
                    <p className="text-xs text-muted-foreground mt-0.5">Click-through rate</p>
                  </CardContent>
                </Card>

                <Card className="bg-teal-50 border-teal-100">
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Gauge className="h-3 w-3" /> Avg. Position
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 px-4">
                    <div className="text-2xl font-bold text-teal-700">{scSummary.avgPosition}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">Lower is better</p>
                  </CardContent>
                </Card>
              </div>

              {/* Impressions trend */}
              {scBuckets.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                  No search data for this period
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pb-1">
                    <span>Click any row below to filter stats for that period:</span>
                    {scPeriodKey !== "all" && (
                      <button
                        onClick={() => setScPeriodKey("all")}
                        className="text-violet-600 font-semibold hover:underline cursor-pointer"
                      >
                        Reset to All (~13m)
                      </button>
                    )}
                  </div>
                  {scBuckets.map((b) => {
                    const isSelected = scPeriodKey === b.key
                    const pct = (b.impressions / scMaxImpressions) * 100
                    return (
                      <div
                        key={b.key}
                        onClick={() => setScPeriodKey(isSelected ? "all" : b.key)}
                        className={`flex items-center gap-3 p-1.5 rounded-lg transition-all cursor-pointer ${
                          isSelected
                            ? "bg-violet-100/90 ring-2 ring-violet-500 shadow-xs"
                            : "hover:bg-stone-100/80"
                        }`}
                        title={`Click to filter by ${b.label}`}
                      >
                        <div
                          className={`w-14 text-xs font-semibold text-right shrink-0 ${
                            isSelected ? "text-violet-900" : "text-muted-foreground"
                          }`}
                        >
                          {b.label}
                        </div>
                        <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                          <div
                            className={`h-full rounded-lg transition-all duration-500 ${
                              isSelected ? "bg-violet-600" : "bg-violet-400"
                            }`}
                            style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
                          />
                        </div>
                        <div className="w-16 text-right text-xs font-semibold tabular-nums shrink-0">
                          {formatCompact(b.impressions)}
                        </div>
                        <div className="w-14 text-right text-xs text-muted-foreground tabular-nums shrink-0">
                          {formatCompact(b.clicks)} clk
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* By site */}
              {scSiteList.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-stone-900">
                      By Website {scPeriodKey !== "all" ? `(${scSummary.label})` : ""}
                    </p>
                    {scPeriodKey !== "all" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-violet-700 hover:text-violet-900"
                        onClick={() => setScPeriodKey("all")}
                      >
                        Show All Time
                      </Button>
                    )}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Site</TableHead>
                        <TableHead className="text-center">Outlet</TableHead>
                        <TableHead className="text-right">Impressions</TableHead>
                        <TableHead className="text-right">Clicks</TableHead>
                        <TableHead className="text-right">CTR</TableHead>
                        <TableHead className="text-right">Avg. Pos.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scSiteList.map((s) => (
                        <TableRow key={s.site}>
                          <TableCell className="font-medium text-sm">
                            {s.site.replace(/^https?:\/\//, "").replace("sc-domain:", "").replace(/\/$/, "")}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={s.outlet === "Unmapped" ? "outline" : "secondary"}>{s.outlet}</Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">{s.impressions.toLocaleString()}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm">{s.clicks.toLocaleString()}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm">{s.ctr}%</TableCell>
                          <TableCell className="text-right tabular-nums text-sm">{s.position}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
