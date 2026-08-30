"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  RefreshCw,
  Users,
  IndianRupee,
  Phone,
  CalendarDays,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getBookingsByWeek, type Booking } from "@/lib/actions/bookings"
import { useBrand } from "@/hooks/use-brand"
import { toast } from "sonner"
import Link from "next/link"

const TIME_SLOTS = [
  "4:00 PM - 6:00 PM",
  "5:30 PM - 7:30 PM",
  "7:00 PM - 9:00 PM",
  "8:30 PM - 10:30 PM",
  "10:00 PM - 12:00 AM",
]

const statusColors: Record<string, string> = {
  confirmed:  "bg-emerald-50 border-emerald-300 hover:bg-emerald-100",
  pending:    "bg-amber-50 border-amber-300 hover:bg-amber-100",
  on_hold:    "bg-orange-50 border-orange-300 hover:bg-orange-100",
  completed:  "bg-slate-100 border-slate-300 hover:bg-slate-200",
  cancelled:  "bg-red-50 border-red-200 hover:bg-red-100",
  no_show:    "bg-red-50 border-red-200 hover:bg-red-100",
}

const statusDot: Record<string, string> = {
  confirmed: "bg-emerald-500",
  pending:   "bg-amber-500",
  on_hold:   "bg-orange-500",
  completed: "bg-slate-400",
  cancelled: "bg-red-400",
  no_show:   "bg-red-400",
}

const occasionEmoji: Record<string, string> = {
  candlelight:         "🕯️",
  birthday:            "🎂",
  anniversary:         "💑",
  proposal:            "💍",
  private_celebration: "🎉",
  other:               "✨",
}

function formatDateKey(date: Date) {
  return date.toISOString().split("T")[0]
}

function getWeekDates(anchor: Date) {
  const start = new Date(anchor)
  start.setDate(start.getDate() - start.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

export default function CalendarPage() {
  const { activeCity, isReady } = useBrand()
  const [anchor, setAnchor]     = useState(() => new Date())
  const [outlet, setOutlet]     = useState("all")
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<Booking | null>(null)

  const weekDates = getWeekDates(anchor)
  const today     = formatDateKey(new Date())

  // Sync outlet with global brand switcher
  useEffect(() => {
    if (isReady) setOutlet(activeCity)
  }, [activeCity, isReady])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const start = formatDateKey(weekDates[0])
      const end   = formatDateKey(weekDates[6])
      const data  = await getBookingsByWeek(start, end, outlet === "all" ? undefined : outlet)
      setBookings(data)
    } catch {
      toast.error("Failed to load calendar")
    } finally {
      setLoading(false)
    }
  }, [anchor, outlet]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (isReady) load() }, [load, isReady])

  // Build lookup: dateKey → timeSlot → Booking[]
  const grid: Record<string, Record<string, Booking[]>> = {}
  for (const b of bookings) {
    if (!grid[b.booking_date]) grid[b.booking_date] = {}
    const slot = b.time_slot || "Unknown"
    if (!grid[b.booking_date][slot]) grid[b.booking_date][slot] = []
    grid[b.booking_date][slot].push(b)
  }

  // All unique slots that appear (merge with defaults)
  const allSlots = Array.from(
    new Set([...TIME_SLOTS, ...bookings.map(b => b.time_slot).filter(Boolean)])
  )

  const navigate = (dir: number) => {
    const d = new Date(anchor)
    d.setDate(d.getDate() + dir * 7)
    setAnchor(d)
  }

  // Stats
  const thisWeekTotal     = bookings.length
  const thisWeekConfirmed = bookings.filter(b => b.status === "confirmed").length
  const thisWeekPending   = bookings.filter(b => b.status === "pending").length
  const thisWeekRevenue   = bookings
    .filter(b => b.payment_status === "paid")
    .reduce((s, b) => s + (b.total_amount || 0), 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Booking Calendar</h1>
          <p className="text-muted-foreground text-sm">Live slot occupancy for this week</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Select value={outlet} onValueChange={setOutlet}>
            <SelectTrigger className="w-[150px]">
              <MapPin className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outlets</SelectItem>
              <SelectItem value="Surat">Surat</SelectItem>
              <SelectItem value="Vadodara">Vadodara</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/protected/bookings">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold">{thisWeekTotal}</p>
            <p className="text-xs text-muted-foreground mt-0.5">This Week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold text-emerald-600">{thisWeekConfirmed}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold text-amber-600">{thisWeekPending}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold flex items-center">
              <IndianRupee className="h-4 w-4" />
              {thisWeekRevenue.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Week Revenue (paid)</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigate(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <CardTitle className="text-base">
                {weekDates[0].toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                {" – "}
                {weekDates[6].toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </CardTitle>
            </div>
            <div className="flex items-center gap-3">
              {/* Legend */}
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                {[
                  { label: "Confirmed", cls: "bg-emerald-400" },
                  { label: "Pending",   cls: "bg-amber-400" },
                  { label: "On Hold",   cls: "bg-orange-400" },
                  { label: "Done",      cls: "bg-slate-400" },
                ].map(({ label, cls }) => (
                  <span key={label} className="flex items-center gap-1">
                    <span className={cn("w-2 h-2 rounded-full", cls)} />
                    {label}
                  </span>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAnchor(new Date())}
              >
                Today
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading calendar…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[750px]">
                {/* Day header row */}
                <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: "140px repeat(7, 1fr)" }}>
                  <div className="p-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {weekDates.map((date, i) => {
                    const isToday = formatDateKey(date) === today
                    return (
                      <div
                        key={i}
                        className={cn(
                          "p-2 text-center rounded-lg",
                          isToday ? "bg-primary text-primary-foreground" : "bg-muted/40"
                        )}
                      >
                        <p className="text-xs font-medium">
                          {date.toLocaleDateString("en-IN", { weekday: "short" })}
                        </p>
                        <p className="text-base font-bold">{date.getDate()}</p>
                      </div>
                    )
                  })}
                </div>

                {/* Slot rows */}
                {allSlots.map((slot) => (
                  <div
                    key={slot}
                    className="grid gap-1 mb-1"
                    style={{ gridTemplateColumns: "140px repeat(7, 1fr)" }}
                  >
                    {/* Slot label */}
                    <div className="p-2 bg-muted rounded-lg flex flex-col justify-center">
                      <p className="text-xs font-semibold">{slot}</p>
                    </div>

                    {/* Day cells */}
                    {weekDates.map((date, di) => {
                      const dateKey   = formatDateKey(date)
                      const cellBooks = grid[dateKey]?.[slot] || []
                      const main      = cellBooks[0]
                      const extra     = cellBooks.length - 1

                      return (
                        <div
                          key={di}
                          className={cn(
                            "p-1.5 rounded-lg border-2 min-h-[64px] transition-colors",
                            main
                              ? cn(statusColors[main.status] || "bg-blue-50 border-blue-200", "cursor-pointer")
                              : "bg-green-50 border-green-200 hover:bg-green-100 cursor-default"
                          )}
                          onClick={() => main && setSelected(main)}
                        >
                          {main ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <span className="text-sm">{occasionEmoji[main.experience_type] || "✨"}</span>
                                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", statusDot[main.status] || "bg-blue-500")} />
                                {extra > 0 && (
                                  <Badge variant="secondary" className="text-[9px] px-1 h-4 ml-auto">
                                    +{extra}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] font-semibold leading-tight truncate">{main.customer_name}</p>
                              {main.outlet && outlet === "all" && (
                                <p className="text-[9px] text-muted-foreground">{main.outlet}</p>
                              )}
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center opacity-30">
                              <Plus className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}

                {allSlots.length === 0 && !loading && (
                  <div className="col-span-8 text-center py-12 text-muted-foreground">
                    <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No bookings this week</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{occasionEmoji[selected?.experience_type || ""] || "✨"}</span>
              {selected?.booking_number || "Booking"}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-semibold">{selected.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <a href={`tel:${selected.customer_phone}`} className="flex items-center gap-1 text-primary">
                  <Phone className="h-3 w-3" /> {selected.customer_phone}
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{new Date(selected.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slot</span>
                <span>{selected.time_slot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outlet</span>
                <span>{selected.outlet}</span>
              </div>
              {selected.package_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Package</span>
                  <span>{selected.package_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">People</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {selected.num_people}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold flex items-center"><IndianRupee className="h-3 w-3" />{(selected.total_amount || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge>{selected.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment</span>
                <Badge variant={selected.payment_status === "paid" ? "default" : "secondary"}>
                  {selected.payment_status}
                </Badge>
              </div>
              <div className="pt-2 border-t">
                <Link href="/protected/bookings">
                  <Button variant="outline" className="w-full" size="sm" onClick={() => setSelected(null)}>
                    Open in Bookings
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
