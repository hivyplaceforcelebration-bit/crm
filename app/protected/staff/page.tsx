"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  UserCog, Plus, Users, CalendarDays, Wallet, CheckCircle2,
  MoreHorizontal, Pencil, ToggleLeft, ToggleRight, Save,
  RefreshCcw, Banknote, Clock, ChevronLeft, ChevronRight,
} from "lucide-react"
import {
  getStaff, createStaff, updateStaff,
  getAttendanceForDate, saveAttendance,
  getPayroll, generatePayroll, updatePayrollEntry, markEntryPaid,
  type StaffMember, type AttendanceRecord, type PayrollRun, type PayrollEntry,
} from "@/lib/actions/staff"

// ── Config ────────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  manager:   { label: "Manager",   color: "bg-purple-500" },
  host:      { label: "Host",      color: "bg-blue-500"   },
  chef:      { label: "Chef",      color: "bg-orange-500" },
  server:    { label: "Server",    color: "bg-green-500"  },
  cleaner:   { label: "Cleaner",   color: "bg-gray-500"   },
  bartender: { label: "Bartender", color: "bg-amber-500"  },
}

const ATT_STATUS = [
  { value: "present",  label: "P",    full: "Present",  ring: "ring-emerald-400", bg: "bg-emerald-500", text: "text-emerald-700" },
  { value: "half_day", label: "½",    full: "Half Day", ring: "ring-amber-400",   bg: "bg-amber-500",   text: "text-amber-700"   },
  { value: "absent",   label: "A",    full: "Absent",   ring: "ring-red-400",     bg: "bg-red-500",     text: "text-red-700"     },
  { value: "leave",    label: "L",    full: "Leave",    ring: "ring-blue-400",    bg: "bg-blue-500",    text: "text-blue-700"    },
]

const PAY_METHODS = ["Cash", "UPI", "Bank Transfer", "Cheque"]

function todayISO() {
  return new Date().toISOString().split("T")[0]
}
function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}
function monthLabel(m: string) {
  const [y, mo] = m.split("-")
  return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString("en-IN", {
    month: "long", year: "numeric",
  })
}
function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number)
  const d = new Date(y, mo - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}
function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number)
  const d = new Date(y, mo, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

// ── Blank staff form ──────────────────────────────────────────────────────────

function blankForm() {
  return {
    name: "", phone: "", email: "", role: "host", outlet: "Vadodara",
    salary_type: "monthly", base_salary: "", joining_date: todayISO(), notes: "",
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// STAFF TAB
// ═════════════════════════════════════════════════════════════════════════════

function StaffTab({ staff, onRefresh }: { staff: StaffMember[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd]   = useState(false)
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null)
  const [form, setForm]         = useState(blankForm())
  const [saving, setSaving]     = useState(false)
  const [outlet, setOutlet]     = useState("all")

  const filtered = outlet === "all"
    ? staff
    : staff.filter((s) => s.outlet === outlet || s.outlet === "Both")

  const active   = filtered.filter((s) => s.is_active)
  const inactive = filtered.filter((s) => !s.is_active)

  function openAdd() {
    setForm(blankForm())
    setEditStaff(null)
    setShowAdd(true)
  }
  function openEdit(s: StaffMember) {
    setForm({
      name: s.name, phone: s.phone || "", email: s.email || "",
      role: s.role, outlet: s.outlet, salary_type: s.salary_type,
      base_salary: String(s.base_salary), joining_date: s.joining_date,
      notes: s.notes || "",
    })
    setEditStaff(s)
    setShowAdd(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = { ...form, base_salary: parseFloat(form.base_salary) || 0 }
      if (editStaff) {
        await updateStaff(editStaff.id, payload)
      } else {
        await createStaff(payload)
      }
      onRefresh()
      setShowAdd(false)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(s: StaffMember) {
    await updateStaff(s.id, { is_active: !s.is_active })
    onRefresh()
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={outlet} onValueChange={setOutlet}>
            <SelectTrigger className="w-44 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outlets</SelectItem>
              <SelectItem value="Vadodara">Vadodara</SelectItem>
              <SelectItem value="Surat">Surat</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {active.length} active · {inactive.length} inactive
          </span>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Staff
        </Button>
      </div>

      {/* Active staff grid */}
      {active.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/25 mx-auto mb-3" />
            <p className="font-semibold text-muted-foreground">No staff added yet</p>
            <Button size="sm" className="mt-3" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-2" /> Add First Staff Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((s) => {
            const role = ROLE_CONFIG[s.role] || { label: s.role, color: "bg-gray-500" }
            return (
              <Card key={s.id} className="hover:border-primary/40 transition-colors group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                        {s.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{s.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <Badge className={`${role.color} text-white text-xs px-1.5 py-0`}>
                              {role.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {s.outlet}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(s)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleActive(s)}>
                              <ToggleLeft className="h-4 w-4 mr-2" /> Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-2.5 space-y-1">
                        {s.phone && (
                          <p className="text-xs text-muted-foreground">{s.phone}</p>
                        )}
                        <p className="text-sm font-semibold text-primary">
                          ₹{s.base_salary.toLocaleString()}
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            / {s.salary_type === "daily" ? "day" : "month"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Since {new Date(s.joining_date).toLocaleDateString("en-IN", {
                            month: "short", year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Inactive staff */}
      {inactive.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Inactive Staff</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inactive.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-dashed opacity-60"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">{s.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.role}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => toggleActive(s)}
                  title="Reactivate"
                >
                  <ToggleRight className="h-4 w-4 text-emerald-600" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editStaff ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid gap-1.5">
              <Label className="text-xs">Full Name *</Label>
              <Input
                placeholder="e.g., Priya Patel"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Outlet</Label>
                <Select value={form.outlet} onValueChange={(v) => setForm({ ...form, outlet: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vadodara">Vadodara</SelectItem>
                    <SelectItem value="Surat">Surat</SelectItem>
                    <SelectItem value="Both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Salary Type</Label>
                <Select value={form.salary_type} onValueChange={(v) => setForm({ ...form, salary_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">
                  Base Salary (₹/{form.salary_type === "daily" ? "day" : "month"})
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.base_salary}
                  onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Phone</Label>
                <Input
                  placeholder="+91 98765 00000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Joining Date</Label>
                <Input
                  type="date"
                  value={form.joining_date}
                  onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Saving…" : editStaff ? "Save Changes" : "Add Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// ATTENDANCE TAB
// ═════════════════════════════════════════════════════════════════════════════

function AttendanceTab({ allStaff }: { allStaff: StaffMember[] }) {
  const [date, setDate]     = useState(todayISO())
  const [outlet, setOutlet] = useState("all")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  // staffId -> status
  const [statuses, setStatuses] = useState<Record<string, string>>({})

  const filteredStaff = outlet === "all"
    ? allStaff.filter((s) => s.is_active)
    : allStaff.filter((s) => s.is_active && (s.outlet === outlet || s.outlet === "Both"))

  useEffect(() => {
    async function load() {
      setLoading(true)
      const records = await getAttendanceForDate(date, outlet === "all" ? undefined : outlet)
      const map: Record<string, string> = {}
      // Default all to "present"
      filteredStaff.forEach((s) => { map[s.id] = "present" })
      // Override with saved records
      records.forEach((r: AttendanceRecord) => { map[r.staff_id] = r.status })
      setStatuses(map)
      setLoading(false)
      setSaved(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, outlet])

  async function handleSave() {
    setSaving(true)
    const entries = Object.entries(statuses).map(([staffId, status]) => ({
      staffId, date, status,
    }))
    await saveAttendance(entries)
    setSaving(false)
    setSaved(true)
  }

  const presentCount  = Object.values(statuses).filter((s) => s === "present").length
  const absentCount   = Object.values(statuses).filter((s) => s === "absent").length
  const halfCount     = Object.values(statuses).filter((s) => s === "half_day").length
  const leaveCount    = Object.values(statuses).filter((s) => s === "leave").length

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-44 h-8"
        />
        <Select value={outlet} onValueChange={setOutlet}>
          <SelectTrigger className="w-44 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outlets</SelectItem>
            <SelectItem value="Vadodara">Vadodara</SelectItem>
            <SelectItem value="Surat">Surat</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || filteredStaff.length === 0}
          variant={saved ? "outline" : "default"}
        >
          {saved ? (
            <><CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600" /> Saved</>
          ) : saving ? "Saving…" : (
            <><Save className="h-4 w-4 mr-1.5" /> Save Attendance</>
          )}
        </Button>
      </div>

      {/* Summary pills */}
      {filteredStaff.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "Present", count: presentCount,  color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
            { label: "Half Day", count: halfCount,    color: "bg-amber-100 text-amber-700 border-amber-200" },
            { label: "Absent",  count: absentCount,   color: "bg-red-100 text-red-700 border-red-200" },
            { label: "Leave",   count: leaveCount,    color: "bg-blue-100 text-blue-700 border-blue-200" },
          ].map((item) => (
            <span
              key={item.label}
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${item.color}`}
            >
              {item.label}: {item.count}
            </span>
          ))}
        </div>
      )}

      {/* Attendance table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No staff for this outlet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead className="hidden md:table-cell">Outlet</TableHead>
                  <TableHead>Attendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((s) => {
                  const current = statuses[s.id] || "present"
                  const role = ROLE_CONFIG[s.role] || { label: s.role, color: "bg-gray-500" }
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                              {s.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{s.name}</p>
                            {s.phone && (
                              <p className="text-xs text-muted-foreground">{s.phone}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge className={`${role.color} text-white text-xs`}>
                          {role.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">{s.outlet}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {ATT_STATUS.map((st) => (
                            <button
                              key={st.value}
                              onClick={() =>
                                setStatuses((prev) => ({ ...prev, [s.id]: st.value }))
                              }
                              className={`
                                w-8 h-8 rounded-lg text-xs font-bold transition-all
                                ${current === st.value
                                  ? `${st.bg} text-white ring-2 ${st.ring} ring-offset-1 scale-110`
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }
                              `}
                              title={st.full}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        P = Present &nbsp;·&nbsp; ½ = Half Day &nbsp;·&nbsp; A = Absent &nbsp;·&nbsp; L = Leave
      </p>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAYROLL TAB
// ═════════════════════════════════════════════════════════════════════════════

function PayrollTab({ allStaff }: { allStaff: StaffMember[] }) {
  const [month, setMonth]   = useState(currentMonth())
  const [outlet, setOutlet] = useState("all")
  const [loading, setLoading]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [run, setRun]       = useState<PayrollRun | null>(null)
  const [entries, setEntries] = useState<PayrollEntry[]>([])
  const [payDialog, setPayDialog] = useState<string | null>(null) // entryId being paid
  const [payMethod, setPayMethod] = useState("Cash")
  const [adjusting, setAdjusting] = useState<string | null>(null) // entryId being adjusted
  const [adjForm, setAdjForm] = useState({ bonus: "0", deductions: "0" })

  useEffect(() => {
    async function load() {
      setLoading(true)
      const result = await getPayroll(month, outlet)
      if (result) {
        setRun(result.run)
        setEntries(result.entries)
      } else {
        setRun(null)
        setEntries([])
      }
      setLoading(false)
    }
    load()
  }, [month, outlet])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const result = await generatePayroll(month, outlet)
      setRun(result.run)
      setEntries(result.entries)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to generate payroll")
    } finally {
      setGenerating(false)
    }
  }

  async function handleMarkPaid(entryId: string) {
    await markEntryPaid(entryId, payMethod)
    const result = await getPayroll(month, outlet)
    if (result) { setRun(result.run); setEntries(result.entries) }
    setPayDialog(null)
  }

  async function handleSaveAdjustment(entryId: string) {
    await updatePayrollEntry(entryId, {
      bonus: parseFloat(adjForm.bonus) || 0,
      deductions: parseFloat(adjForm.deductions) || 0,
    })
    const result = await getPayroll(month, outlet)
    if (result) { setRun(result.run); setEntries(result.entries) }
    setAdjusting(null)
  }

  const balance = run ? run.total_payable - run.total_paid : 0
  const staffInOutlet =
    outlet === "all"
      ? allStaff.filter((s) => s.is_active).length
      : allStaff.filter((s) => s.is_active && (s.outlet === outlet || s.outlet === "Both")).length

  return (
    <div className="space-y-4">
      {/* Month navigation + outlet */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setMonth(prevMonth(month))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold px-2 min-w-32 text-center">
            {monthLabel(month)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setMonth(nextMonth(month))}
            disabled={month >= currentMonth()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Select value={outlet} onValueChange={setOutlet}>
          <SelectTrigger className="w-44 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outlets</SelectItem>
            <SelectItem value="Vadodara">Vadodara</SelectItem>
            <SelectItem value="Surat">Surat</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={generating || staffInOutlet === 0}
          variant={run ? "outline" : "default"}
        >
          <RefreshCcw className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Generating…" : run ? "Regenerate" : "Generate Payroll"}
        </Button>
      </div>

      {loading ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : !run ? (
        /* Empty state */
        <Card>
          <CardContent className="p-14 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground/25 mx-auto mb-3" />
            <p className="font-semibold text-muted-foreground">No payroll generated yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Mark attendance first, then click Generate Payroll
            </p>
            <Button size="sm" className="mt-4" onClick={handleGenerate} disabled={generating}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              {generating ? "Generating…" : "Generate Now"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">Total Payable</p>
                <p className="text-2xl font-bold mt-0.5">
                  ₹{run.total_payable.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">Total Paid</p>
                <p className="text-2xl font-bold text-emerald-600 mt-0.5">
                  ₹{run.total_paid.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">Balance Due</p>
                <p className={`text-2xl font-bold mt-0.5 ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  ₹{balance.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">Status</p>
                <div className="mt-1.5">
                  <Badge
                    className={
                      run.status === "paid"
                        ? "bg-emerald-500"
                        : run.status === "processed"
                        ? "bg-blue-500"
                        : "bg-gray-400"
                    }
                  >
                    {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Entries table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead className="text-center">Days</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Bonus</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Deduct</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <>
                      <TableRow key={entry.id} className={entry.is_paid ? "opacity-60" : ""}>
                        <TableCell>
                          <p className="font-medium text-sm">{entry.staff_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.days_present}P · {entry.days_half}H · {entry.days_absent}A
                            &nbsp;/ {entry.working_days} days
                          </p>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm tabular-nums font-medium">
                            {entry.days_present + entry.days_half * 0.5}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          ₹{entry.base_salary.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm hidden md:table-cell text-emerald-600">
                          {entry.bonus > 0 ? `+₹${entry.bonus.toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm hidden md:table-cell text-red-600">
                          {entry.deductions > 0 ? `-₹${entry.deductions.toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-sm tabular-nums">
                            ₹{entry.net_payable.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {entry.is_paid ? (
                            <Badge className="bg-emerald-500 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Paid
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!entry.is_paid && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Adjust bonus / deduction"
                                onClick={() => {
                                  setAdjForm({
                                    bonus: String(entry.bonus),
                                    deductions: String(entry.deductions),
                                  })
                                  setAdjusting(entry.id)
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2"
                                onClick={() => {
                                  setPayMethod("Cash")
                                  setPayDialog(entry.id)
                                }}
                              >
                                <Banknote className="h-3.5 w-3.5 mr-1" /> Pay
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Inline adjustment row */}
                      {adjusting === entry.id && (
                        <TableRow className="bg-muted/40">
                          <TableCell colSpan={8} className="py-2 px-4">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-xs font-medium text-muted-foreground">
                                Adjust for {entry.staff_name}:
                              </span>
                              <div className="flex items-center gap-1.5">
                                <Label className="text-xs">Bonus ₹</Label>
                                <Input
                                  type="number"
                                  value={adjForm.bonus}
                                  onChange={(e) => setAdjForm({ ...adjForm, bonus: e.target.value })}
                                  className="h-7 w-24 text-xs"
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Label className="text-xs">Deduction ₹</Label>
                                <Input
                                  type="number"
                                  value={adjForm.deductions}
                                  onChange={(e) => setAdjForm({ ...adjForm, deductions: e.target.value })}
                                  className="h-7 w-24 text-xs"
                                />
                              </div>
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleSaveAdjustment(entry.id)}
                              >
                                Update
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => setAdjusting(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Mark Paid Dialog */}
      <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Select payment method:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PAY_METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setPayMethod(m)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                    payMethod === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(null)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => payDialog && handleMarkPaid(payDialog)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("staff")

  async function loadStaff() {
    setLoading(true)
    const data = await getStaff()
    setStaff(data)
    setLoading(false)
  }

  useEffect(() => { loadStaff() }, [])

  const active = staff.filter((s) => s.is_active)
  const totalMonthly = active.reduce(
    (s, m) => s + (m.salary_type === "monthly" ? m.base_salary : 0), 0
  )

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="h-8 w-8 text-primary" />
            Staff &amp; Payroll
          </h1>
          <p className="text-muted-foreground">
            Manage your team, track attendance, and run payroll
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "—" : active.length}</div>
            <p className="text-xs text-muted-foreground">
              {staff.filter((s) => !s.is_active).length} inactive
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Payroll</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "—" : `₹${totalMonthly.toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground">base salaries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vadodara</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "—" : active.filter((s) => s.outlet === "Vadodara" || s.outlet === "Both").length}
            </div>
            <p className="text-xs text-muted-foreground">staff members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Surat</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "—" : active.filter((s) => s.outlet === "Surat" || s.outlet === "Both").length}
            </div>
            <p className="text-xs text-muted-foreground">staff members</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="staff">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Staff Directory
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="payroll">
            <Wallet className="h-3.5 w-3.5 mr-1.5" />
            Payroll
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-4">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="h-28 bg-muted/50 rounded-xl" />
                </Card>
              ))}
            </div>
          ) : (
            <StaffTab staff={staff} onRefresh={loadStaff} />
          )}
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <AttendanceTab allStaff={staff} />
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <PayrollTab allStaff={staff} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
