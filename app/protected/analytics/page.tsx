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
} from "lucide-react"
import { getAnalyticsData } from "@/lib/actions/analytics"
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

export default function AnalyticsPage() {
  const { activeCity, isReady } = useBrand()
  const [days, setDays] = useState("30")
  const [outlet, setOutlet] = useState("all")
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  // Sync with global activeCity
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

  useEffect(() => { load() }, [load])

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
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
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

      {/* Detailed Tabs */}
      <Tabs defaultValue="packages">
        <TabsList>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="sources">Lead Sources</TabsTrigger>
          <TabsTrigger value="outlets">Outlets</TabsTrigger>
          <TabsTrigger value="slots">Time Slots</TabsTrigger>
        </TabsList>

        {/* ── Package Performance ───────────────────────────────────── */}
        <TabsContent value="packages" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Package Performance</CardTitle>
              <CardDescription>Bookings and revenue by experience package</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading || !data ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : data.packagePerformance.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                  No bookings in this period
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Package</TableHead>
                      <TableHead className="text-center w-24">Bookings</TableHead>
                      <TableHead className="text-right w-32">Revenue</TableHead>
                      <TableHead className="w-40">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.packagePerformance.map((pkg, i) => (
                      <TableRow key={pkg.name}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {i === 0 && <span className="text-amber-500 text-base">🏆</span>}
                            <span className="font-medium text-sm">{pkg.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{pkg.bookings}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-sm">
                          ₹{pkg.revenue.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={pkg.pct} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-8 text-right">{pkg.pct}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Lead Sources ──────────────────────────────────────────── */}
        <TabsContent value="sources" className="mt-4 space-y-4">
          {/* Leads by Website Domain */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Leads by Website
              </CardTitle>
              <CardDescription>Which of your 12 websites is sending the most enquiries</CardDescription>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : !data.leadsByDomain || data.leadsByDomain.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No domain data yet — leads will appear once websites start submitting with <code>source_domain</code></p>
              ) : (
                <div className="space-y-2">
                  {data.leadsByDomain.map((item, idx) => {
                    const maxCount = data.leadsByDomain[0]?.count || 1
                    const pct = Math.round((item.count / maxCount) * 100)
                    const colors = ["bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500","bg-orange-500","bg-pink-500"]
                    return (
                      <div key={item.domain} className="flex items-center gap-3 text-sm">
                        <span className="w-4 text-xs text-muted-foreground text-right">{idx + 1}</span>
                        <span className="flex-1 truncate font-medium text-xs">{item.domain}</span>
                        <div className="w-32 bg-muted rounded-full h-2 overflow-hidden">
                          <div className={`h-2 rounded-full ${colors[idx % colors.length]}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right font-bold">{item.count}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Source Analysis</CardTitle>
              <CardDescription>Conversion rates by acquisition channel</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading || !data ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : data.leadSources.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                  No leads in this period
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Source</TableHead>
                      <TableHead className="text-center">Leads</TableHead>
                      <TableHead className="text-center">Converted</TableHead>
                      <TableHead className="text-center">Rate</TableHead>
                      <TableHead className="w-40">Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.leadSources.map((src) => (
                      <TableRow key={src.source}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${SOURCE_COLORS[src.source] || "bg-gray-400"}`} />
                            <span className="font-medium capitalize text-sm">{src.source}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm">{src.total}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{src.converted}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={src.rate >= 40
                              ? "text-emerald-700 border-emerald-300 bg-emerald-50"
                              : src.rate >= 25
                              ? "text-amber-700 border-amber-300 bg-amber-50"
                              : ""}
                          >
                            {src.rate}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Progress value={src.rate} className="h-2" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Outlet Performance ────────────────────────────────────── */}

        <TabsContent value="outlets" className="mt-4">
          {loading || !data ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1].map((i) => (
                <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : data.outletPerformance.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                No bookings in this period
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.outletPerformance.map((o) => (
                <Card key={o.outlet}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {o.outlet}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="space-y-0.5">
                        <p className="text-2xl font-bold">{o.bookings}</p>
                        <p className="text-xs text-muted-foreground">Bookings</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-2xl font-bold">
                          {o.revenue >= 100000
                            ? `₹${(o.revenue / 100000).toFixed(1)}L`
                            : `₹${(o.revenue / 1000).toFixed(0)}k`}
                        </p>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-2xl font-bold">₹{o.avgValue.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Avg. Value</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                        <span>Share of total bookings</span>
                        <span>{data.summary.totalBookings > 0
                          ? Math.round((o.bookings / data.summary.totalBookings) * 100)
                          : 0}%</span>
                      </div>
                      <Progress
                        value={data.summary.totalBookings > 0
                          ? (o.bookings / data.summary.totalBookings) * 100
                          : 0}
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Time Slots ────────────────────────────────────────────── */}
        <TabsContent value="slots" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" /> Time Slot Performance
              </CardTitle>
              <CardDescription>Which slots get booked most</CardDescription>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                </div>
              ) : data.timeSlots.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                  No bookings with time slot data
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data.timeSlots.map((slot, i) => (
                    <div key={slot.slot} className="flex items-center gap-4 p-3 bg-muted/40 rounded-xl hover:bg-muted/60 transition-colors">
                      <div className="flex items-center gap-2 w-48 shrink-0">
                        {i === 0 && <span className="text-amber-500 text-sm">🔥</span>}
                        <span className="text-sm font-medium">{slot.slot}</span>
                      </div>
                      <div className="flex-1">
                        <div className="h-7 bg-background rounded-lg overflow-hidden border">
                          <div
                            className="h-full rounded-lg bg-primary/70 transition-all duration-500"
                            style={{ width: `${Math.max(slot.pct, slot.pct > 0 ? 3 : 0)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-center w-20 shrink-0">
                        <p className="text-base font-bold">{slot.count}</p>
                        <p className="text-xs text-muted-foreground">bookings</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Smart Insights — generated from real data */}
      {!loading && data && s && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Best performer */}
          {data.packagePerformance[0] && (
            <Card className="bg-emerald-50 border-emerald-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-emerald-700 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Top Package
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  <strong>{data.packagePerformance[0].name}</strong> is your
                  most booked package with{" "}
                  <strong>{data.packagePerformance[0].bookings} bookings</strong>{" "}
                  generating ₹{data.packagePerformance[0].revenue.toLocaleString()}.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Best lead source */}
          {data.leadSources[0] && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-700 flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4" /> Best Lead Source
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  <strong className="capitalize">{data.leadSources[0].source}</strong> brings
                  the most leads ({data.leadSources[0].total}).{" "}
                  {data.leadSources.sort((a, b) => b.rate - a.rate)[0]?.source !== data.leadSources[0].source && (
                    <>
                      But <strong className="capitalize">
                        {data.leadSources.sort((a, b) => b.rate - a.rate)[0].source}
                      </strong> converts best at{" "}
                      <strong>{data.leadSources.sort((a, b) => b.rate - a.rate)[0].rate}%</strong>.
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Conversion insight */}
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
                <Target className="h-4 w-4" /> Conversion Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {s.conversionRate >= 40 ? (
                  <>Your <strong>{s.conversionRate}%</strong> conversion rate is excellent. Keep following up quickly on new leads.</>
                ) : s.conversionRate >= 20 ? (
                  <>Your conversion rate is <strong>{s.conversionRate}%</strong>. {s.totalLeads - s.convertedLeads} leads are unconverted — follow up today.</>
                ) : (
                  <>Only <strong>{s.conversionRate}%</strong> of leads convert. Try calling within 1 hour of enquiry to improve this.</>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
