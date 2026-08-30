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
  MapPin, Phone, Mail, Settings2, MessageSquare, Loader2, Construction,
} from "lucide-react"
import { toast } from "sonner"
import {
  getOutlets, createOutlet, updateOutlet, toggleOutletActive,
  getTimeSlots, createTimeSlot, toggleTimeSlotActive, deleteTimeSlot,
  type Outlet, type TimeSlot,
} from "@/lib/actions/settings"
import { getTemplates, saveTemplate, deleteTemplate, type MessageTemplate } from "@/lib/actions/marketing"

const defaultOutletForm = { name: "", city: "", address: "", phone: "", email: "", capacity: 8 }
const defaultSlotForm = { slot_name: "", start_time: "16:00", end_time: "17:30", capacity: 1 }
const defaultTemplateForm = { name: "", body: "", category: "transactional" }

function NotWiredBanner() {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed text-sm text-muted-foreground">
      <Construction className="h-4 w-4 shrink-0" />
      Not yet connected to the database — changes here won&apos;t be saved.
    </div>
  )
}

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

  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [o, s, t] = await Promise.all([getOutlets(), getTimeSlots(), getTemplates()])
      setOutlets(o)
      setSlots(s)
      setTemplates(t)
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

        {/* Users Tab — not wired: no auth/roles table in schema yet */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <NotWiredBanner />
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">User Management</h2>
            <Button size="sm" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>User &amp; role management needs a backing table and an invite flow via the Supabase Admin API.</p>
              <p className="text-sm">Not built yet — ask to scope this as its own feature.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab — templates are real (shared with Marketing), integrations are not wired */}
        <TabsContent value="notifications" className="mt-4 space-y-4">
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

          <NotWiredBanner />
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">WhatsApp Business API</CardTitle>
                <CardDescription>Not connected — templates above are stored, but nothing sends automatically yet</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">Not connected</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Email Settings</CardTitle>
                <CardDescription>No SMTP integration configured</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">Not connected</Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Policies Tab — not wired: no settings table in schema yet */}
        <TabsContent value="policies" className="mt-4 space-y-4">
          <NotWiredBanner />
          <h2 className="text-lg font-semibold">Business Policies</h2>
          <p className="text-sm text-muted-foreground">
            Payment, cancellation, booking, and tax policies would need a dedicated settings table — not built yet.
          </p>
        </TabsContent>

        {/* General Tab — not wired: no settings table in schema yet */}
        <TabsContent value="general" className="mt-4 space-y-4">
          <NotWiredBanner />
          <h2 className="text-lg font-semibold">General Settings</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Information</CardTitle>
              <CardDescription>Would need a dedicated settings table to persist</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Business Name</Label>
                <Input defaultValue="Friends Factory Cafe" disabled />
              </div>
              <div className="grid gap-2">
                <Label>Support Email</Label>
                <Input defaultValue="support@friendsfactory.cafe" disabled />
              </div>
            </CardContent>
          </Card>
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
