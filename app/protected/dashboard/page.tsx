"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import {
  IndianRupee, Calendar, Users, TrendingUp, Clock, Phone, MessageSquare,
  ArrowUpRight, ChevronRight, Heart, Cake, Bell, Plus, Building, Target,
  RefreshCw, Package, Zap,
} from "lucide-react"
import { getTodayBookings, getBookingStats, type Booking } from "@/lib/actions/bookings"
import { getLeads, getLeadStats, type Lead } from "@/lib/actions/leads"
import { getCustomerStats } from "@/lib/actions/customers"
import { useBrand } from "@/hooks/use-brand"
import { toast } from "sonner"

const statusColors: Record<string, string> = {
  confirmed: "bg-emerald-500",
  pending:   "bg-amber-500",
  cancelled: "bg-red-500",
  completed: "bg-blue-500",
}

const paymentColors: Record<string, string> = {
  paid:    "text-emerald-600",
  partial: "text-amber-600",
  pending: "text-red-600",
}

export default function DashboardPage() {
  const { activeCity, activeBrand, isReady } = useBrand()
  const [todayBookings, setTodayBookings] = useState<Booking[]>([])
  const [recentLeads, setRecentLeads] = useState<Lead[]>([])
  const [bookingStats, setBookingStats] = useState({ todayCount: 0, todayRevenue: 0, monthRevenue: 0, confirmedToday: 0 })
  const [leadStats, setLeadStats] = useState({ total: 0, new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 })
  const [customerStats, setCustomerStats] = useState({ total: 0, vip: 0, totalRevenue: 0, avgSpend: 0, whatsappOptIn: 0 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!isReady) return
    setLoading(true)
    try {
      const cityFilter = activeCity === "all" ? undefined : activeCity
      const [tBookings, bStats, leads, lStats, cStats] = await Promise.all([
        getTodayBookings(cityFilter),
        getBookingStats(cityFilter),
        getLeads({ status: "new", outlet: cityFilter }),
        getLeadStats(cityFilter),
        getCustomerStats(cityFilter),
      ])
      setTodayBookings(tBookings)
      setBookingStats(bStats)
      setRecentLeads(leads.slice(0, 4))
      setLeadStats(lStats)
      setCustomerStats(cStats)
    } catch (e) {
      toast.error("Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }, [activeCity, isReady])

  useEffect(() => {
    load()
  }, [load])

  const conversionRate = leadStats.total > 0
    ? Math.round((leadStats.converted / leadStats.total) * 100)
    : 0

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening at {activeBrand.logoText} today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button asChild>
            <Link href="/protected/bookings">
              <Plus className="h-4 w-4 mr-2" />New Booking
            </Link>
          </Button>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookingStats.todayCount}</div>
            <div className="flex items-center text-xs text-emerald-600 mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              {bookingStats.confirmedToday} confirmed
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{bookingStats.todayRevenue.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              ₹{bookingStats.monthRevenue.toLocaleString()} this month
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadStats.new}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {leadStats.total} total leads
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {leadStats.converted} converted
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Today's Bookings */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Today&apos;s Bookings</CardTitle>
                <CardDescription>
                  {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/protected/bookings">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : todayBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No bookings today</p>
                <Button variant="link" size="sm" asChild>
                  <Link href="/protected/bookings">Create a booking</Link>
                </Button>
              </div>
            ) : (
              todayBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="w-20 text-center">
                    <p className="font-bold text-sm">{booking.time_slot.split(" - ")[0]}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{booking.customer_name}</p>
                      <Badge variant="outline" className="text-xs">{booking.outlet}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {booking.package_name || booking.experience_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${statusColors[booking.status] || "bg-gray-400"}`}
                    />
                    <Badge variant="outline" className="text-xs capitalize">{booking.status}</Badge>
                    <span className={`text-xs font-medium ${paymentColors[booking.payment_status] || ""}`}>
                      {booking.payment_status === "paid"
                        ? "₹ Paid"
                        : booking.payment_status === "partial"
                        ? "₹ Partial"
                        : "₹ Due"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={`tel:${booking.customer_phone}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" asChild>
                      <a
                        href={`https://wa.me/${booking.customer_phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          {/* Customer Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Customer Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Total Customers", value: customerStats.total, color: "" },
                { label: "VIP Customers", value: customerStats.vip, color: "text-amber-600" },
                { label: "WhatsApp Opt-in", value: customerStats.whatsappOptIn, color: "text-green-600" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className={`font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg. Spend</span>
                  <span className="font-bold flex items-center">
                    <IndianRupee className="h-3 w-3" />
                    {customerStats.avgSpend.toLocaleString()}
                  </span>
                </div>
              </div>
              <Button variant="link" className="w-full p-0 h-auto text-sm" asChild>
                <Link href="/protected/customers">View All Customers →</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Lead Pipeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lead Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "New", value: leadStats.new, color: "bg-blue-500" },
                { label: "Contacted", value: leadStats.contacted, color: "bg-yellow-500" },
                { label: "Qualified", value: leadStats.qualified, color: "bg-purple-500" },
                { label: "Converted", value: leadStats.converted, color: "bg-green-500" },
              ].map((stage) => {
                const pct = leadStats.total > 0 ? Math.round((stage.value / leadStats.total) * 100) : 0
                return (
                  <div key={stage.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{stage.label}</span>
                      <span className="font-medium">{stage.value}</span>
                    </div>
                    <Progress value={pct} className={`h-1.5 [&>div]:${stage.color}`} />
                  </div>
                )
              })}
              <Button variant="link" className="w-full p-0 h-auto text-sm" asChild>
                <Link href="/protected/leads">Manage Leads →</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Leads */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>New Leads</CardTitle>
              <CardDescription>Latest enquiries requiring follow-up</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/protected/leads">
                View All Leads <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <Users className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No new leads</p>
              <Button variant="link" size="sm" asChild>
                <Link href="/protected/leads">Add a lead</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {recentLeads.map((lead) => (
                <Card key={lead.id} className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-blue-500 text-blue-500 text-xs">
                        new
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs">
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" /> {lead.phone}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground capitalize">{lead.lead_source}</span>
                        <Badge variant="secondary" className="text-xs capitalize">{lead.occasion_type}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" asChild>
                        <a href={`tel:${lead.phone}`}>
                          <Phone className="h-3 w-3 mr-1" />Call
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 h-7 text-xs text-green-600" asChild>
                        <a
                          href={`https://wa.me/${(lead.whatsapp_number || lead.phone).replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />WA
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { href: "/protected/bookings", icon: Plus, color: "bg-emerald-100 text-emerald-600", title: "New Booking", sub: "Create reservation" },
          { href: "/protected/leads", icon: Users, color: "bg-blue-100 text-blue-600", title: "Add Lead", sub: "Log new enquiry" },
          { href: "/protected/invoices", icon: IndianRupee, color: "bg-amber-100 text-amber-600", title: "Record Payment", sub: "Collect & receipt" },
          { href: "/protected/marketing", icon: MessageSquare, color: "bg-green-100 text-green-600", title: "Send Campaign", sub: "WhatsApp blast" },
        ].map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.href} href={action.href}>
              <Card className="cursor-pointer hover:border-primary transition-colors h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${action.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.sub}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
