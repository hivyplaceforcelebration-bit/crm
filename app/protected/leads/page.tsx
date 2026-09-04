"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Plus, Search, Filter, Phone, MessageCircle, Calendar,
  MoreHorizontal, ArrowRight, Clock, RefreshCw, Users, Target,
  Zap, CheckCircle2, IndianRupee, ChevronRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import {
  getLeads, createLead, updateLeadStatus, deleteLead, getLeadStats,
  convertLeadToBooking, type Lead,
} from "@/lib/actions/leads"
import { getPackages, type Package } from "@/lib/actions/packages"
import { getTimeSlots, type TimeSlot } from "@/lib/actions/settings"
import { formatTimeRange } from "@/lib/utils"
import { useBrand } from "@/hooks/use-brand"
import { toast } from "sonner"
import Link from "next/link"

// ─── Config ────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  new:       { label: "New",       color: "bg-blue-50 text-blue-700 border-blue-200",     dot: "bg-blue-500" },
  contacted: { label: "Contacted", color: "bg-amber-50 text-amber-700 border-amber-200",  dot: "bg-amber-500" },
  qualified: { label: "Qualified", color: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  converted: { label: "Converted", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  lost:      { label: "Lost",      color: "bg-red-50 text-red-700 border-red-200",         dot: "bg-red-500" },
}

const occasionEmoji: Record<string, string> = {
  candlelight: "🕯️", birthday: "🎂", anniversary: "💑",
  proposal: "💍", private_celebration: "🎉", other: "✨",
}

const sourceColors: Record<string, string> = {
  instagram: "bg-pink-50 text-pink-700 border-pink-200",
  facebook:  "bg-blue-50 text-blue-700 border-blue-200",
  google:    "bg-orange-50 text-orange-700 border-orange-200",
  whatsapp:  "bg-green-50 text-green-700 border-green-200",
  referral:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  walkin:    "bg-gray-50 text-gray-700 border-gray-200",
  website:   "bg-violet-50 text-violet-700 border-violet-200",
}

const PIPELINE_STAGES = ["new", "contacted", "qualified", "converted", "lost"]

const defaultAddForm = {
  name: "", phone: "", email: "",
  occasion_type: "candlelight", preferred_date: "", preferred_time: "", package_name: "", outlet: "",
  lead_source: "instagram", enquiry_channel: "dm",
  notes: "",
}

// ─── Convert Dialog ─────────────────────────────────────────────────────────

function ConvertDialog({
  lead,
  packages,
  timeSlots,
  onSuccess,
  onClose,
}: {
  lead: Lead
  packages: Package[]
  timeSlots: TimeSlot[]
  onSuccess: () => void
  onClose: () => void
}) {
  const { activeCity } = useBrand()
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<{ booking_number: string; id: string } | null>(null)
  const [form, setForm] = useState({
    booking_date: lead.preferred_date || "",
    time_slot: "",
    outlet: lead.outlet || (activeCity === "all" ? "Vadodara" : activeCity),
    package_id: "",
    num_people: "2",
    base_amount: "",
    notes: lead.notes || "",
  })

  const selectedPkg = packages.find((p) => p.id === form.package_id)

  // Auto-fill amount when package changes
  useEffect(() => {
    if (selectedPkg) {
      setForm((f) => ({ ...f, base_amount: String(selectedPkg.base_price) }))
    }
  }, [selectedPkg])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleConvert = async () => {
    if (!form.booking_date || !form.time_slot || !form.outlet || !form.base_amount) {
      toast.error("Date, time slot, outlet and amount are required")
      return
    }
    setSaving(true)
    try {
      const booking = await convertLeadToBooking(lead.id, {
        customer_name: lead.name,
        customer_phone: lead.phone,
        outlet: form.outlet,
        booking_date: form.booking_date,
        time_slot: form.time_slot,
        experience_type: lead.occasion_type,
        package_id: form.package_id || undefined,
        package_name: selectedPkg?.name || undefined,
        num_people: parseInt(form.num_people) || 2,
        base_amount: parseFloat(form.base_amount) || 0,
        total_amount: parseFloat(form.base_amount) || 0,
        notes: form.notes || undefined,
      })
      setDone({ booking_number: booking.booking_number, id: booking.id })
      onSuccess()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to convert lead")
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Booking Created!</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {lead.name}'s lead has been converted successfully.
          </p>
          {done.booking_number && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">#{done.booking_number}</p>
          )}
        </div>
        <div className="flex gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button asChild>
            <Link href="/protected/bookings">
              View Booking <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <Zap className="w-4 h-4 text-emerald-600" />
          </div>
          Convert to Booking
        </DialogTitle>
        <DialogDescription>
          Create a confirmed booking from this lead. Details are pre-filled from the enquiry.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-2">
        {/* Customer (read-only) */}
        <div className="rounded-xl bg-muted/50 px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{lead.name}</p>
              <p className="text-sm text-muted-foreground">{lead.phone}</p>
            </div>
            <Badge className={`border ${statusConfig[lead.status]?.color || ""}`}>
              {occasionEmoji[lead.occasion_type] || "✨"} {lead.occasion_type}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Booking Details */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Booking Details</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.booking_date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => set("booking_date", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Outlet *</Label>
              <Select value={form.outlet} onValueChange={(v) => set("outlet", v)}>
                <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vadodara">Friends Factory — Vadodara</SelectItem>
                  <SelectItem value="Surat">HIVY — Surat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Time Slot *</Label>
            <Select value={form.time_slot} onValueChange={(v) => set("time_slot", v)}>
              <SelectTrigger><SelectValue placeholder="Select time slot" /></SelectTrigger>
              <SelectContent>
                {timeSlots.filter((s) => s.is_active).map((s) => {
                  const label = formatTimeRange(s.start_time, s.end_time)
                  return (
                    <SelectItem key={s.id} value={label}>
                      <span className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-muted-foreground" /> {s.slot_name} · {label}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Package</Label>
              <Select value={form.package_id} onValueChange={(v) => set("package_id", v)}>
                <SelectTrigger><SelectValue placeholder="No package" /></SelectTrigger>
                <SelectContent>
                  {packages.filter((p) => p.is_active).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — ₹{p.base_price.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>No. of Guests</Label>
              <Select value={form.num_people} onValueChange={(v) => set("num_people", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} {n === 1 ? "person" : "people"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Payment */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</p>
          <div className="space-y-1.5">
            <Label>Total Amount (₹) *</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                className="pl-9"
                placeholder="e.g. 3500"
                value={form.base_amount}
                onChange={(e) => set("base_amount", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea
            rows={2}
            placeholder="Special requests, décor preferences..."
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
      </div>

      <DialogFooter className="gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleConvert}
          disabled={saving}
        >
          {saving ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Creating…</>
          ) : (
            <><Zap className="w-4 h-4 mr-2" /> Create Booking</>
          )}
        </Button>
      </DialogFooter>
    </>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const { activeCity, isReady } = useBrand()
  const [leads, setLeads] = useState<Lead[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addForm, setAddForm] = useState(defaultAddForm)
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null)

  // Sync with global activeCity
  useEffect(() => {
    if (isReady) {
      setAddForm((f) => ({
        ...f,
        outlet: activeCity === "all" ? "Vadodara" : activeCity
      }))
    }
  }, [activeCity, isReady])

  const load = useCallback(async () => {
    if (!isReady) return
    setLoading(true)
    try {
      const cityFilter = activeCity === "all" ? undefined : activeCity
      const [lData, lStats, pkgs, slots] = await Promise.all([
        getLeads({ status: statusFilter, outlet: cityFilter }),
        getLeadStats(cityFilter),
        getPackages(),
        getTimeSlots(),
      ])
      setLeads(lData)
      setStats(lStats)
      setPackages(pkgs)
      setTimeSlots(slots)
    } catch {
      toast.error("Failed to load leads")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, activeCity, isReady])

  useEffect(() => { load() }, [load])

  const filteredLeads = leads.filter((l) => {
    const s = searchQuery.toLowerCase()
    return !s || l.name.toLowerCase().includes(s) || l.phone.includes(s)
  })

  const getByStatus = (status: string) => filteredLeads.filter((l) => l.status === status)

  const handleCreate = async () => {
    if (!addForm.name || !addForm.phone) {
      toast.error("Name and phone are required")
      return
    }
    setSaving(true)
    try {
      await createLead({
        name: addForm.name,
        phone: addForm.phone,
        email: addForm.email || undefined,
        occasion_type: addForm.occasion_type,
        preferred_date: addForm.preferred_date || undefined,
        preferred_time: addForm.preferred_time || undefined,
        package_name: addForm.package_name || undefined,
        outlet: addForm.outlet || undefined,
        lead_source: addForm.lead_source,
        enquiry_channel: addForm.enquiry_channel,
        notes: addForm.notes || undefined,
      })
      toast.success("Lead added")
      setShowAddDialog(false)
      setAddForm(defaultAddForm)
      load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add lead")
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateLeadStatus(id, status)
      toast.success(`Moved to ${statusConfig[status]?.label}`)
      load()
    } catch {
      toast.error("Failed to update status")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead?")) return
    try {
      await deleteLead(id)
      toast.success("Lead deleted")
      load()
    } catch {
      toast.error("Failed to delete")
    }
  }

  const conversionRate = stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Convert Dialog */}
      <Dialog open={!!convertingLead} onOpenChange={(o) => { if (!o) setConvertingLead(null) }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          {convertingLead && (
            <ConvertDialog
              lead={convertingLead}
              packages={packages}
              timeSlots={timeSlots}
              onSuccess={() => { load() }}
              onClose={() => setConvertingLead(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads & Enquiries</h1>
          <p className="text-muted-foreground text-sm">Track enquiries from lead to booking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Lead</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Lead</DialogTitle>
                <DialogDescription>Log a new enquiry from a potential customer</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Name *</Label>
                    <Input value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="Customer name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone *</Label>
                    <Input value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Preferred Date</Label>
                    <Input type="date" value={addForm.preferred_date} onChange={(e) => setAddForm((f) => ({ ...f, preferred_date: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Preferred Time</Label>
                    <Select value={addForm.preferred_time} onValueChange={(v) => setAddForm((f) => ({ ...f, preferred_time: v }))}>
                      <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot.id} value={slot.slot_name}>{slot.slot_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Occasion</Label>
                    <Select value={addForm.occasion_type} onValueChange={(v) => setAddForm((f) => ({ ...f, occasion_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="candlelight">🕯️ Candlelight</SelectItem>
                        <SelectItem value="birthday">🎂 Birthday</SelectItem>
                        <SelectItem value="anniversary">💑 Anniversary</SelectItem>
                        <SelectItem value="proposal">💍 Proposal</SelectItem>
                        <SelectItem value="private_celebration">🎉 Private</SelectItem>
                        <SelectItem value="other">✨ Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Outlet</Label>
                    <Select value={addForm.outlet} onValueChange={(v) => setAddForm((f) => ({ ...f, outlet: v }))}>
                      <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Vadodara">Vadodara</SelectItem>
                        <SelectItem value="Surat">Surat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Package</Label>
                    <Select value={addForm.package_name} onValueChange={(v) => setAddForm((f) => ({ ...f, package_name: v }))}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        {packages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.name}>{pkg.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Source</Label>
                    <Select value={addForm.lead_source} onValueChange={(v) => setAddForm((f) => ({ ...f, lead_source: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="walkin">Walk-in</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea value={addForm.notes} onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Special requirements, preferences..." rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={saving}>{saving ? "Adding…" : "Add Lead"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {[
          { label: "Total",     value: stats.total,     color: "text-foreground",   bg: "" },
          { label: "New",       value: stats.new,       color: "text-blue-600",     bg: "bg-blue-50" },
          { label: "Contacted", value: stats.contacted, color: "text-amber-600",    bg: "bg-amber-50" },
          { label: "Qualified", value: stats.qualified, color: "text-purple-600",   bg: "bg-purple-50" },
          { label: "Converted", value: stats.converted, color: "text-emerald-600",  bg: "bg-emerald-50" },
        ].map((s) => (
          <Card key={s.label} className={`border-0 shadow-none ${s.bg || "bg-muted/40"}`}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              {s.label === "Converted" && stats.total > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">{conversionRate}% rate</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or phone…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

        {/* ── PIPELINE VIEW ─────────────────────────────────────── */}
        <TabsContent value="pipeline" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              {PIPELINE_STAGES.map((stage) => {
                const stageLeads = getByStatus(stage)
                const cfg = statusConfig[stage]
                const isQualified = stage === "qualified"
                return (
                  <div key={stage} className="space-y-2">
                    {/* Column header */}
                    <div className="flex items-center gap-2 px-1">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {cfg.label}
                      </span>
                      <span className="ml-auto text-xs font-bold text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                        {stageLeads.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2 min-h-[80px]">
                      {stageLeads.map((lead) => (
                        <Card
                          key={lead.id}
                          className={`hover:shadow-md transition-all duration-150 ${isQualified ? "border-purple-200 bg-purple-50/30" : ""}`}
                        >
                          <CardContent className="p-3 space-y-2.5">
                            {/* Name + menu */}
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0">
                                <p className="font-semibold text-sm leading-tight truncate">{lead.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {occasionEmoji[lead.occasion_type] || "✨"}{" "}
                                  <span className="capitalize">{lead.occasion_type.replace("_", " ")}</span>
                                </p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  {stage !== "converted" && stage !== "lost" && (
                                    <>
                                      <DropdownMenuItem
                                        className="text-emerald-600 font-medium"
                                        onClick={() => setConvertingLead(lead)}
                                      >
                                        <Zap className="mr-2 h-3 w-3" /> Convert to Booking
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
                                  {PIPELINE_STAGES.filter((s) => s !== stage).map((s) => (
                                    <DropdownMenuItem key={s} onClick={() => handleStatusChange(lead.id, s)}>
                                      <ArrowRight className="mr-2 h-3 w-3" />
                                      Move to {statusConfig[s].label}
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(lead.id)}>
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Phone */}
                            <a
                              href={`tel:${lead.phone}`}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Phone className="h-3 w-3" /> {lead.phone}
                            </a>

                            {/* Date */}
                            {lead.preferred_date && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(lead.preferred_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              </div>
                            )}

                            {/* Source */}
                            {lead.lead_source && (
                              <Badge
                                variant="outline"
                                className={`text-xs capitalize border ${sourceColors[lead.lead_source] || "bg-gray-50 text-gray-700"}`}
                              >
                                {lead.lead_source}
                              </Badge>
                            )}

                            {/* Actions */}
                            <div className="grid grid-cols-3 gap-1 pt-0.5">
                              <Button variant="outline" size="sm" className="h-7 text-xs px-0 justify-center" asChild>
                                <a href={`tel:${lead.phone}`}>
                                  <Phone className="h-3 w-3" />
                                </a>
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs px-0 justify-center text-green-600 hover:text-green-700" asChild>
                                <a
                                  href={`https://wa.me/${(lead.whatsapp_number || lead.phone).replace(/\D/g, "")}`}
                                  target="_blank" rel="noreferrer"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                </a>
                              </Button>
                              {stage !== "converted" && stage !== "lost" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs px-0 justify-center text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => setConvertingLead(lead)}
                                  title="Convert to Booking"
                                >
                                  <Zap className="h-3 w-3" />
                                </Button>
                              ) : (
                                <div />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {stageLeads.length === 0 && (
                        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground border border-dashed rounded-xl">
                          Empty
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TABLE VIEW ────────────────────────────────────────── */}
        <TabsContent value="table" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                  <Users className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No leads found</p>
                  <Button variant="link" size="sm" onClick={() => setShowAddDialog(true)}>
                    Add your first lead
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Lead</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Occasion</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{lead.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <a href={`tel:${lead.phone}`} className="text-sm flex items-center gap-1 hover:text-primary">
                            <Phone className="h-3 w-3" /> {lead.phone}
                          </a>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">
                            {occasionEmoji[lead.occasion_type] || "✨"} {lead.occasion_type.replace("_", " ")}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {lead.preferred_date
                            ? new Date(lead.preferred_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs capitalize border ${sourceColors[lead.lead_source] || ""}`}>
                            {lead.lead_source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{lead.budget_range || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs border ${statusConfig[lead.status]?.color || ""}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[lead.status]?.dot || ""} mr-1.5 inline-block`} />
                            {statusConfig[lead.status]?.label || lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {lead.status !== "converted" && lead.status !== "lost" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                                onClick={() => setConvertingLead(lead)}
                              >
                                <Zap className="h-3 w-3 mr-1" /> Convert
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                {PIPELINE_STAGES.filter((s) => s !== lead.status).map((s) => (
                                  <DropdownMenuItem key={s} onClick={() => handleStatusChange(lead.id, s)}>
                                    Move to {statusConfig[s].label}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(lead.id)}>
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
      </Tabs>
    </div>
  )
}
