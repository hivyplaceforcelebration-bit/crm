"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FullWidthCalendar } from "@/components/booking-calendar"
import {
  Plus, Search, Filter, Calendar, CalendarDays, Clock, Users, MapPin,
  MoreHorizontal, CheckCircle2, XCircle, AlertCircle, IndianRupee,
  RefreshCw, Phone, MessageSquare, Receipt,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  getBookings,
  getBookingStats,
  createBooking,
  updateBookingStatus,
  updatePaymentStatus,
  deleteBooking,
  type Booking,
} from "@/lib/actions/bookings"
import { getPackages, type Package } from "@/lib/actions/packages"
import { createInvoiceFromBooking } from "@/lib/actions/invoices"
import { useBrand } from "@/hooks/use-brand"
import { toast } from "sonner"
import { useRouter, useSearchParams } from "next/navigation"

const bookingStatusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: "Pending",   color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
  confirmed: { label: "Confirmed", color: "bg-green-100 text-green-800",  icon: CheckCircle2 },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-800",    icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-800",    icon: XCircle },
  no_show:   { label: "No Show",   color: "bg-red-100 text-red-800",      icon: XCircle },
}

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Unpaid",  color: "bg-red-100 text-red-800" },
  partial: { label: "Partial", color: "bg-orange-100 text-orange-800" },
  paid:    { label: "Paid",    color: "bg-green-100 text-green-800" },
}

const occasionEmoji: Record<string, string> = {
  candlelight:        "🕯️",
  birthday:           "🎂",
  anniversary:        "💑",
  proposal:           "💍",
  private_celebration:"🎉",
  other:              "✨",
}

const defaultForm = {
  customer_name: "",
  customer_phone: "",
  outlet: "Surat",
  booking_date: "",
  time_slot: "",
  table_zone: "",
  experience_type: "candlelight",
  package_id: "",
  package_name: "",
  num_people: 2,
  base_amount: 0,
  total_amount: 0,
  special_request: "",
  notes: "",
}

function BookingsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeCity, isReady } = useBrand()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [stats, setStats] = useState({ todayCount: 0, todayRevenue: 0, monthRevenue: 0, confirmedToday: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [outletFilter, setOutletFilter] = useState("all")
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(defaultForm)
  // Payment recording
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMode, setPaymentMode] = useState("upi")
  const [paymentSaving, setPaymentSaving] = useState(false)

  // Sync with global activeCity
  useEffect(() => {
    if (isReady) {
      setOutletFilter(activeCity)
      setForm((f) => ({
        ...f,
        outlet: activeCity === "all" ? "Surat" : activeCity
      }))
    }
  }, [activeCity, isReady])

  // Quick-add from Calendar: /protected/bookings?new=1&date=...&slot=...&outlet=...
  useEffect(() => {
    if (searchParams.get("new") !== "1") return
    const date = searchParams.get("date")
    const slot = searchParams.get("slot")
    const outletParam = searchParams.get("outlet")
    setForm((f) => ({
      ...f,
      booking_date: date || f.booking_date,
      time_slot: slot || f.time_slot,
      outlet: outletParam && outletParam !== "all" ? outletParam : f.outlet,
    }))
    setShowNewDialog(true)
    router.replace("/protected/bookings")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = useCallback(async () => {
    if (!isReady) return
    setLoading(true)
    try {
      const cityFilter = outletFilter === "all" ? undefined : outletFilter
      const [bData, bStats, pkgs] = await Promise.all([
        getBookings({ outlet: outletFilter, status: statusFilter }),
        getBookingStats(cityFilter),
        getPackages(),
      ])
      setBookings(bData)
      setStats(bStats)
      setPackages(pkgs)
    } catch (e) {
      toast.error("Failed to load bookings")
    } finally {
      setLoading(false)
    }
  }, [outletFilter, statusFilter, isReady])

  useEffect(() => { load() }, [load])

  const filteredBookings = bookings.filter((b) => {
    const s = searchQuery.toLowerCase()
    return (
      !s ||
      b.customer_name.toLowerCase().includes(s) ||
      b.booking_number.toLowerCase().includes(s) ||
      b.customer_phone.includes(s)
    )
  })

  const handlePackageChange = (pkgId: string) => {
    const pkg = packages.find((p) => p.id === pkgId)
    setForm((f) => ({
      ...f,
      package_id: pkgId,
      package_name: pkg?.name || "",
      experience_type: pkg?.experience_type || f.experience_type,
      base_amount: pkg?.base_price || 0,
      total_amount: pkg?.base_price || 0,
    }))
  }

  const handleCreate = async () => {
    if (!form.customer_name || !form.customer_phone || !form.booking_date || !form.time_slot) {
      toast.error("Please fill in all required fields")
      return
    }
    setSaving(true)
    try {
      await createBooking({
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        outlet: form.outlet,
        booking_date: form.booking_date,
        time_slot: form.time_slot,
        table_zone: form.table_zone || undefined,
        experience_type: form.experience_type,
        package_id: form.package_id || undefined,
        package_name: form.package_name || undefined,
        num_people: form.num_people,
        base_amount: form.base_amount,
        total_amount: form.total_amount,
        special_request: form.special_request || undefined,
        notes: form.notes || undefined,
      })
      toast.success("Booking created!")
      setShowNewDialog(false)
      setForm(defaultForm)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to create booking")
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateBookingStatus(id, status)
      toast.success(`Status updated to ${status}`)
      load()
    } catch {
      toast.error("Failed to update status")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this booking?")) return
    try {
      await deleteBooking(id)
      toast.success("Booking deleted")
      load()
    } catch {
      toast.error("Failed to delete booking")
    }
  }

  const openPaymentDialog = (booking: Booking) => {
    setPaymentBooking(booking)
    setPaymentAmount(String(booking.total_amount - (booking.amount_paid || 0)))
    setPaymentMode("upi")
  }

  const handleRecordPayment = async () => {
    if (!paymentBooking) return
    const amt = parseFloat(paymentAmount)
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    setPaymentSaving(true)
    try {
      const totalPaid = (paymentBooking.amount_paid || 0) + amt
      const newPaymentStatus =
        totalPaid >= paymentBooking.total_amount ? "paid" : "partial"
      await updatePaymentStatus(paymentBooking.id, newPaymentStatus, totalPaid)
      toast.success(`₹${amt.toLocaleString()} recorded via ${paymentMode.toUpperCase()}`)
      setPaymentBooking(null)
      load()
    } catch {
      toast.error("Failed to record payment")
    } finally {
      setPaymentSaving(false)
    }
  }

  const handleGenerateInvoice = async (bookingId: string) => {
    try {
      const invoiceId = await createInvoiceFromBooking(bookingId)
      toast.success("Invoice ready")
      router.push(`/protected/invoices/${invoiceId}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to generate invoice")
    }
  }

  const pendingPaymentCount = bookings.filter((b) => b.payment_status !== "paid").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground">Manage all reservations and bookings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Booking
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Booking</DialogTitle>
                <DialogDescription>Create a new reservation for Friends Factory</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Customer Name *</Label>
                    <Input placeholder="Full name" value={form.customer_name}
                      onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Phone *</Label>
                    <Input placeholder="+91 98765 43210" value={form.customer_phone}
                      onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Outlet *</Label>
                    <Select value={form.outlet} onValueChange={(v) => setForm((f) => ({ ...f, outlet: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Surat">Surat</SelectItem>
                        <SelectItem value="Vadodara">Vadodara</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Date *</Label>
                    <Input type="date" value={form.booking_date}
                      onChange={(e) => setForm((f) => ({ ...f, booking_date: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Time Slot *</Label>
                    <Select value={form.time_slot} onValueChange={(v) => setForm((f) => ({ ...f, time_slot: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select slot" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4:00 PM - 6:00 PM">4:00 PM - 6:00 PM</SelectItem>
                        <SelectItem value="5:30 PM - 7:30 PM">5:30 PM - 7:30 PM</SelectItem>
                        <SelectItem value="7:00 PM - 9:00 PM">7:00 PM - 9:00 PM</SelectItem>
                        <SelectItem value="8:30 PM - 10:30 PM">8:30 PM - 10:30 PM</SelectItem>
                        <SelectItem value="10:00 PM - 12:00 AM">10:00 PM - 12:00 AM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Table / Zone</Label>
                    <Input placeholder="e.g. Rooftop R1" value={form.table_zone}
                      onChange={(e) => setForm((f) => ({ ...f, table_zone: e.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Package</Label>
                  <Select value={form.package_id} onValueChange={handlePackageChange}>
                    <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                    <SelectContent>
                      {packages.filter((p) => p.is_active).map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} — ₹{pkg.base_price.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>No. of People</Label>
                    <Input type="number" min={1} max={20} value={form.num_people}
                      onChange={(e) => setForm((f) => ({ ...f, num_people: parseInt(e.target.value) || 2 }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Total Amount (₹)</Label>
                    <Input type="number" value={form.total_amount}
                      onChange={(e) => setForm((f) => ({ ...f, total_amount: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Special Request</Label>
                  <Textarea placeholder="Any special requests..." value={form.special_request}
                    onChange={(e) => setForm((f) => ({ ...f, special_request: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? "Creating..." : "Create Booking"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayCount}</div>
            <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Confirmed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.confirmedToday}</div>
            <p className="text-xs text-muted-foreground">Ready to serve</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingPaymentCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <IndianRupee className="h-5 w-5" />
              {stats.todayRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">From paid bookings</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, phone or booking ID..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        {activeCity === "all" && (
          <Select value={outletFilter} onValueChange={setOutletFilter}>
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
        )}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="cards">Card View</TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarDays className="mr-2 h-4 w-4" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <FullWidthCalendar />
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading bookings...
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Calendar className="h-8 w-8 mb-2 opacity-50" />
                  <p>No bookings found</p>
                  <Button variant="link" onClick={() => setShowNewDialog(true)}>Create your first booking</Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium font-mono text-sm">{booking.booking_number}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {booking.outlet}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{booking.customer_name}</p>
                            <div className="flex gap-1 mt-0.5">
                              <a href={`tel:${booking.customer_phone}`}
                                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {booking.customer_phone}
                              </a>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {new Date(booking.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                            <p className="text-xs text-muted-foreground">{booking.time_slot}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{occasionEmoji[booking.experience_type] || "✨"}</span>
                            <div>
                              <p className="text-sm">{booking.package_name || "—"}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" /> {booking.num_people} people
                                {booking.table_zone && ` • ${booking.table_zone}`}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium flex items-center">
                            <IndianRupee className="h-3 w-3" />
                            {(booking.total_amount || 0).toLocaleString()}
                          </p>
                          {booking.amount_paid > 0 && booking.amount_paid < booking.total_amount && (
                            <p className="text-xs text-muted-foreground">
                              Paid: ₹{booking.amount_paid.toLocaleString()}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={paymentStatusConfig[booking.payment_status]?.color || ""}>
                            {paymentStatusConfig[booking.payment_status]?.label || booking.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={bookingStatusConfig[booking.status]?.color || ""}>
                            {bookingStatusConfig[booking.status]?.label || booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                className="text-emerald-600 font-medium"
                                onClick={() => openPaymentDialog(booking)}
                              >
                                <IndianRupee className="mr-2 h-4 w-4" /> Record Payment
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-primary font-medium"
                                onClick={() => handleGenerateInvoice(booking.id)}
                              >
                                <Receipt className="mr-2 h-4 w-4" /> Generate Invoice
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleStatusChange(booking.id, "confirmed")}>
                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Confirm
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(booking.id, "completed")}>
                                <CheckCircle2 className="mr-2 h-4 w-4 text-blue-600" /> Mark Completed
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleStatusChange(booking.id, "cancelled")}>
                                <XCircle className="mr-2 h-4 w-4 text-red-600" /> Cancel
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(booking.id, "no_show")}>
                                <AlertCircle className="mr-2 h-4 w-4 text-orange-600" /> No Show
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(booking.id)}
                                className="text-red-600"
                              >
                                Delete Booking
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <span className="text-xl">{occasionEmoji[booking.experience_type] || "✨"}</span>
                          <span className="font-mono">{booking.booking_number}</span>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{booking.package_name || "No package"}</p>
                      </div>
                      <Badge className={bookingStatusConfig[booking.status]?.color || ""}>
                        {bookingStatusConfig[booking.status]?.label || booking.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-medium">{booking.customer_name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{new Date(booking.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium">{booking.time_slot}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Outlet</span><span className="font-medium">{booking.outlet}</span></div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Badge className={paymentStatusConfig[booking.payment_status]?.color || ""}>{paymentStatusConfig[booking.payment_status]?.label || booking.payment_status}</Badge>
                      <span className="font-bold flex items-center"><IndianRupee className="h-4 w-4" />{(booking.total_amount || 0).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Payment Recording Dialog */}
      <Dialog open={!!paymentBooking} onOpenChange={(o) => !o && setPaymentBooking(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-emerald-600" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              {paymentBooking?.booking_number} — {paymentBooking?.customer_name}
            </DialogDescription>
          </DialogHeader>
          {paymentBooking && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-semibold">₹{(paymentBooking.total_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span>₹{(paymentBooking.amount_paid || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="text-muted-foreground">Balance Due</span>
                  <span className="font-bold text-emerald-700">
                    ₹{Math.max(0, (paymentBooking.total_amount || 0) - (paymentBooking.amount_paid || 0)).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Amount Received (₹)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentBooking(null)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={paymentSaving} className="bg-emerald-600 hover:bg-emerald-700">
              {paymentSaving ? "Saving…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <BookingsPageInner />
    </Suspense>
  )
}
