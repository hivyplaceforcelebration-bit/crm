"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Building2, Clock, Users, Bell, FileText, Plus, Edit, Trash2,
  MapPin, Phone, Mail, Settings2, MessageSquare, Loader2, ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"
import {
  getOutlets, createOutlet, updateOutlet, toggleOutletActive,
  getTimeSlots, createTimeSlot, toggleTimeSlotActive, deleteTimeSlot,
  getUserRoles, createStaffUser, updateUserRole,
  getBusinessSettings, updateBusinessSettings,
  type Outlet, type TimeSlot, type UserRole, type BusinessSettings,
} from "@/lib/actions/settings"
import { getTemplates, saveTemplate, deleteTemplate, type MessageTemplate } from "@/lib/actions/marketing"
import { getWhatsAppHubStatus } from "@/lib/actions/whatsapp"

const defaultOutletForm = { name: "", city: "", address: "", phone: "", email: "", capacity: 8 }
const defaultSlotForm = { slot_name: "", start_time: "16:00", end_time: "17:30", capacity: 1 }
const defaultTemplateForm = { name: "", body: "", category: "transactional" }
const defaultUserForm = { email: "", password: "", name: "", role: "staff", outlet_access: "all" }
const roleLabels: Record<string, string> = { admin: "Admin", manager: "Manager", agent: "Agent", staff: "Staff" }

function SettingsPageInner() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") || "outlets"
  const [activeTab, setActiveTab] = useState(initialTab)

  // Outlets
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [showAddOutlet, setShowAddOutlet] = useState(false)
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null)
  const [outletForm, setOutletForm] = useState(defaultOutletForm)
  const [savingOutlet, setSavingOutlet] = useState(false)

  // Time slots
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [showAddSlot, setShowAddSlot] = useState(false)
  const [slotForm, setSlotForm] = useState(defaultSlotForm)
  const [savingSlot, setSavingSlot] = useState(false)

  // Templates (notifications tab)
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [showAddTemplate, setShowAddTemplate] = useState(false)
  const [templateForm, setTemplateForm] = useState(defaultTemplateForm)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [waStatus, setWaStatus] = useState<{ configured: boolean; connected?: boolean; phoneNumber?: string | null } | null>(null)

  // Users & roles
  const [users, setUsers] = useState<UserRole[]>([])
  const [showAddUser, setShowAddUser] = useState(false)
  const [userForm, setUserForm] = useState(defaultUserForm)
  const [savingUser, setSavingUser] = useState(false)

  // Business settings (general + policies)
  const [business, setBusiness] = useState<BusinessSettings | null>(null)
  const [businessForm, setBusinessForm] = useState<BusinessSettings | null>(null)
  const [savingBusiness, setSavingBusiness] = useState(false)

  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [o, s, t, u, b, wa] = await Promise.all([
        getOutlets(), getTimeSlots(), getTemplates(), getUserRoles(), getBusinessSettings(), getWhatsAppHubStatus(),
      ])
      setOutlets(o)
      setSlots(s)
      setTemplates(t)
      setUsers(u)
      setBusiness(b)
      setBusinessForm(b)
      setWaStatus(wa)
    } catch {
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // ── Outlets ─────────────────────────────────────────────────────────────────
  const openEditOutlet = (outlet: Outlet) => {
    setEditingOutlet(outlet)
    setOutletForm({
      name: outlet.name,
      city: outlet.city,
      address: outlet.address || "",
      phone: outlet.phone || "",
      email: outlet.email || "",
      capacity: outlet.capacity,
    })
    setShowAddOutlet(true)
  }

  const handleSaveOutlet = async () => {
    if (!outletForm.name.trim() || !outletForm.city.trim()) {
      toast.error("Name and city are required")
      return
    }
    setSavingOutlet(true)
    try {
      if (editingOutlet) {
        await updateOutlet(editingOutlet.id, outletForm)
        toast.success("Outlet updated")
      } else {
        await createOutlet(outletForm)
        toast.success("Outlet added")
      }
      setShowAddOutlet(false)
      setEditingOutlet(null)
      setOutletForm(defaultOutletForm)
      load()
    } catch {
      toast.error("Failed to save outlet")
    } finally {
      setSavingOutlet(false)
    }
  }

  // ── Time Slots ──────────────────────────────────────────────────────────────
  const handleSaveSlot = async () => {
    if (!slotForm.slot_name.trim()) {
      toast.error("Slot name is required")
      return
    }
    setSavingSlot(true)
    try {
      await createTimeSlot(slotForm)
      toast.success("Time slot added")
      setShowAddSlot(false)
      setSlotForm(defaultSlotForm)
      load()
    } catch {
      toast.error("Failed to save time slot")
    } finally {
      setSavingSlot(false)
    }
  }

  const handleDeleteSlot = async (id: string) => {
    try {
      await deleteTimeSlot(id)
      toast.success("Time slot removed")
      load()
    } catch {
      toast.error("Failed to remove time slot")
    }
  }

  // ── Templates ───────────────────────────────────────────────────────────────
  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.body.trim()) {
      toast.error("Name and message body are required")
      return
    }
    setSavingTemplate(true)
    try {
      await saveTemplate(templateForm)
      toast.success("Template saved")
      setShowAddTemplate(false)
      setTemplateForm(defaultTemplateForm)
      load()
    } catch {
      toast.error("Failed to save template")
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplate(id)
      toast.success("Template deleted")
      load()
    } catch {
      toast.error("Failed to delete template")
    }
  }

  // ── Users & Roles ───────────────────────────────────────────────────────────
  const handleCreateUser = async () => {
    if (!userForm.email.trim() || !userForm.password || !userForm.name.trim()) {
      toast.error("Name, email, and password are required")
      return
    }
    if (userForm.password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    setSavingUser(true)
    try {
      await createStaffUser(userForm)
      toast.success("User created")
      setShowAddUser(false)
      setUserForm(defaultUserForm)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to create user")
    } finally {
      setSavingUser(false)
    }
  }

  const handleToggleUserActive = async (u: UserRole) => {
    try {
      await updateUserRole(u.id, { is_active: !u.is_active })
      load()
    } catch {
      toast.error("Failed to update user")
    }
  }

  const handleRoleChange = async (id: string, role: string) => {
    try {
      await updateUserRole(id, { role })
      toast.success("Role updated")
      load()
    } catch {
      toast.error("Failed to update role")
    }
  }

  // ── Business Settings ───────────────────────────────────────────────────────
  const handleSaveBusiness = async () => {
    if (!businessForm) return
    setSavingBusiness(true)
    try {
      await updateBusinessSettings(businessForm)
      toast.success("Settings saved")
      setBusiness(businessForm)
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSavingBusiness(false)
    }
  }

  const businessDirty = business && businessForm && JSON.stringify(business) !== JSON.stringify(businessForm)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 pt-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure outlets, time slots, users, and system preferences
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="outlets" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Outlets
          </TabsTrigger>
          <TabsTrigger value="slots" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Slots
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users & Roles
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Policies
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            General
          </TabsTrigger>
        </TabsList>

        {/* Outlets Tab — real data */}
        <TabsContent value="outlets" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Manage Outlets</h2>
            <Dialog open={showAddOutlet} onOpenChange={(open) => { setShowAddOutlet(open); if (!open) { setEditingOutlet(null); setOutletForm(defaultOutletForm) } }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Outlet
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingOutlet ? "Edit Outlet" : "Add New Outlet"}</DialogTitle>
                  <DialogDescription>{editingOutlet ? "Update outlet details" : "Add a new cafe outlet location"}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Outlet Name</Label>
                    <Input placeholder="Friends Factory - City" value={outletForm.name} onChange={(e) => setOutletForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>City</Label>
                    <Input placeholder="City name" value={outletForm.city} onChange={(e) => setOutletForm((f) => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Address</Label>
                    <Textarea placeholder="Full address" value={outletForm.address} onChange={(e) => setOutletForm((f) => ({ ...f, address: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Phone</Label>
                      <Input placeholder="+91 98765 43210" value={outletForm.phone} onChange={(e) => setOutletForm((f) => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Email</Label>
                      <Input placeholder="outlet@friendsfactory.cafe" value={outletForm.email} onChange={(e) => setOutletForm((f) => ({ ...f, email: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Capacity (tables)</Label>
                    <Input type="number" placeholder="8" value={outletForm.capacity} onChange={(e) => setOutletForm((f) => ({ ...f, capacity: Number(e.target.value) }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddOutlet(false)}>Cancel</Button>
                  <Button onClick={handleSaveOutlet} disabled={savingOutlet}>
                    {savingOutlet && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingOutlet ? "Save Changes" : "Add Outlet"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : outlets.length === 0 ? (
            <Card><CardContent className="text-center py-12 text-muted-foreground">No outlets yet</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {outlets.map((outlet) => (
                <Card key={outlet.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{outlet.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {outlet.city}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={outlet.is_active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleOutletActive(outlet.id, !outlet.is_active).then(load)}
                      >
                        {outlet.is_active ? "active" : "inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {outlet.address && <div className="text-sm text-muted-foreground">{outlet.address}</div>}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {outlet.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {outlet.phone}
                        </div>
                      )}
                      {outlet.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {outlet.email}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Capacity:</span> {outlet.capacity} tables
                      </p>
                      <Button variant="outline" size="sm" onClick={() => openEditOutlet(outlet)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Time Slots Tab — real data */}
        <TabsContent value="slots" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Time Slot Configuration</h2>
            <Dialog open={showAddSlot} onOpenChange={setShowAddSlot}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Slot
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Time Slot</DialogTitle>
                  <DialogDescription>Create a new booking time slot</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Slot Name</Label>
                    <Input placeholder="e.g., Evening Special" value={slotForm.slot_name} onChange={(e) => setSlotForm((f) => ({ ...f, slot_name: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Start Time</Label>
                      <Input type="time" value={slotForm.start_time} onChange={(e) => setSlotForm((f) => ({ ...f, start_time: e.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <Label>End Time</Label>
                      <Input type="time" value={slotForm.end_time} onChange={(e) => setSlotForm((f) => ({ ...f, end_time: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddSlot(false)}>Cancel</Button>
                  <Button onClick={handleSaveSlot} disabled={savingSlot}>
                    {savingSlot && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Slot
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Slot Name</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                  ) : slots.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No time slots yet</TableCell></TableRow>
                  ) : (
                    slots.map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell className="font-medium">{slot.slot_name}</TableCell>
                        <TableCell>{slot.start_time}</TableCell>
                        <TableCell>{slot.end_time}</TableCell>
                        <TableCell className="text-center">
                          <Switch checked={slot.is_active} onCheckedChange={(v) => toggleTimeSlotActive(slot.id, v).then(load)} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteSlot(slot.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab — real, backed by user_roles + Supabase Auth Admin API */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">User Management</h2>
            <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>Creates a real login account for this person</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Full Name</Label>
                    <Input value={userForm.name} onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))} placeholder="Enter name" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} placeholder="user@friendsfactory.cafe" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Temporary Password</Label>
                    <Input type="password" value={userForm.password} onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))} placeholder="At least 6 characters" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Role</Label>
                      <Select value={userForm.role} onValueChange={(v) => setUserForm((f) => ({ ...f, role: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Outlet Access</Label>
                      <Select value={userForm.outlet_access} onValueChange={(v) => setUserForm((f) => ({ ...f, outlet_access: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Outlets</SelectItem>
                          <SelectItem value="Surat">Surat</SelectItem>
                          <SelectItem value="Vadodara">Vadodara</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddUser(false)}>Cancel</Button>
                  <Button onClick={handleCreateUser} disabled={savingUser}>
                    {savingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Outlet Access</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                  ) : users.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users yet</TableCell></TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v)}>
                            <SelectTrigger className="w-[120px] h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(roleLabels).map(([v, label]) => (
                                <SelectItem key={v} value={v}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{u.outlet_access === "all" ? "All Outlets" : u.outlet_access}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={u.is_active ? "default" : "secondary"}
                            className={`cursor-pointer ${u.is_active ? "bg-emerald-500" : ""}`}
                            onClick={() => handleToggleUserActive(u)}
                          >
                            {u.is_active ? "active" : "inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Role Permissions Reference</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { role: "Admin", permissions: ["Full Access", "Settings", "Users", "Reports"] },
                  { role: "Manager", permissions: ["Bookings", "Customers", "Reports", "Staff"] },
                  { role: "Agent", permissions: ["Leads", "Bookings", "Customers", "Payments"] },
                  { role: "Staff", permissions: ["View Bookings", "Check-in", "Operations"] },
                ].map((item) => (
                  <div key={item.role} className="p-3 border rounded-lg">
                    <p className="font-medium mb-2">{item.role}</p>
                    <div className="space-y-1">
                      {item.permissions.map((perm) => (
                        <div key={perm} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ShieldCheck className="h-3 w-3 text-emerald-500" />
                          {perm}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Both enforced: page access follows the chart above (a Manager or Agent trying to open Settings, for example, is blocked), and Outlet Access on the Users tab restricts which outlet&apos;s bookings, leads, customers, invoices and packages a user can see.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab — templates are real (shared with Marketing), integrations are not wired */}
        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">WhatsApp Automation</CardTitle>
              <CardDescription>
                Sends booking confirmations, 2-day-before reminders and review requests automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!waStatus?.configured ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">Not configured</Badge>
                  WHATSAPP_HUB_URL / WHATSAPP_HUB_API_KEY aren&apos;t set — messages are silently skipped.
                </div>
              ) : waStatus.connected ? (
                <div className="flex items-center gap-2 text-sm">
                  <Badge className="bg-emerald-500">Connected</Badge>
                  <span className="text-muted-foreground">{waStatus.phoneNumber || "Automation number"} is paired and sending</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">Not paired</Badge>
                  <span className="text-muted-foreground">Hub is reachable, but no WhatsApp number is scanned in yet.</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Message Templates</h2>
            <Dialog open={showAddTemplate} onOpenChange={setShowAddTemplate}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Template</DialogTitle>
                  <DialogDescription>Shared with the Marketing page</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Template Name</Label>
                    <Input value={templateForm.name} onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select value={templateForm.category} onValueChange={(v) => setTemplateForm((f) => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transactional">Transactional</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="promotional">Promotional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Message Body</Label>
                    <Textarea rows={5} value={templateForm.body} onChange={(e) => setTemplateForm((f) => ({ ...f, body: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddTemplate(false)}>Cancel</Button>
                  <Button onClick={handleSaveTemplate} disabled={savingTemplate}>
                    {savingTemplate && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                  ) : templates.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No templates yet</TableCell></TableRow>
                  ) : (
                    templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-green-600 capitalize">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {template.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(template.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policies Tab — real, backed by business_settings */}
        <TabsContent value="policies" className="mt-4 space-y-4">
          <h2 className="text-lg font-semibold">Business Policies</h2>
          {!businessForm ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment Policy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Full Payment Required</p>
                      <p className="text-sm text-muted-foreground">100% advance to confirm booking</p>
                    </div>
                    <Switch
                      checked={businessForm.full_payment_required}
                      onCheckedChange={(v) => setBusinessForm((f) => f && { ...f, full_payment_required: v })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Minimum Advance (%)</Label>
                    <Select
                      value={String(businessForm.min_advance_percent)}
                      onValueChange={(v) => setBusinessForm((f) => f && { ...f, min_advance_percent: Number(v) })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50%</SelectItem>
                        <SelectItem value="75">75%</SelectItem>
                        <SelectItem value="100">100%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cancellation Policy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    rows={4}
                    value={businessForm.cancellation_policy}
                    onChange={(e) => setBusinessForm((f) => f && { ...f, cancellation_policy: e.target.value })}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Booking Rules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Minimum advance booking</Label>
                    <Select
                      value={String(businessForm.min_advance_booking_hours)}
                      onValueChange={(v) => setBusinessForm((f) => f && { ...f, min_advance_booking_hours: Number(v) })}
                    >
                      <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="4">4 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Maximum advance booking</Label>
                    <Select
                      value={String(businessForm.max_advance_booking_days)}
                      onValueChange={(v) => setBusinessForm((f) => f && { ...f, max_advance_booking_days: Number(v) })}
                    >
                      <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tax Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>GST Rate</Label>
                    <Select
                      value={String(businessForm.gst_rate)}
                      onValueChange={(v) => setBusinessForm((f) => f && { ...f, gst_rate: Number(v) })}
                    >
                      <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="18">18%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Prices inclusive of tax</span>
                    <Switch
                      checked={businessForm.prices_inclusive_tax}
                      onCheckedChange={(v) => setBusinessForm((f) => f && { ...f, prices_inclusive_tax: v })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <Button onClick={handleSaveBusiness} disabled={!businessDirty || savingBusiness}>
            {savingBusiness && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Policies
          </Button>
        </TabsContent>

        {/* General Tab — real, backed by business_settings */}
        <TabsContent value="general" className="mt-4 space-y-4">
          <h2 className="text-lg font-semibold">General Settings</h2>
          {!businessForm ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Business Name</Label>
                  <Input
                    value={businessForm.business_name}
                    onChange={(e) => setBusinessForm((f) => f && { ...f, business_name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>GSTIN</Label>
                  <Input
                    value={businessForm.gstin || ""}
                    onChange={(e) => setBusinessForm((f) => f && { ...f, gstin: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Support Email</Label>
                  <Input
                    value={businessForm.support_email || ""}
                    onChange={(e) => setBusinessForm((f) => f && { ...f, support_email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Support Phone</Label>
                  <Input
                    value={businessForm.support_phone || ""}
                    onChange={(e) => setBusinessForm((f) => f && { ...f, support_phone: e.target.value })}
                  />
                </div>
                <Button onClick={handleSaveBusiness} disabled={!businessDirty || savingBusiness}>
                  {savingBusiness ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <SettingsPageInner />
    </Suspense>
  )
}
