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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Search, Plus, Phone, Mail, Calendar, Users, Star, TrendingUp,
  MoreVertical, MessageSquare, Gift, Heart, Download, Filter, Send,
  Edit, Eye, Tag, IndianRupee, MapPin, Clock, Cake, PartyPopper,
  ChevronRight, RefreshCw,
} from "lucide-react"
import Link from "next/link"
import {
  getCustomers, createCustomer, updateCustomer, getCustomerStats, type Customer,
} from "@/lib/actions/customers"
import { useBrand } from "@/hooks/use-brand"
import { toast } from "sonner"

function toCsv(customers: Customer[]) {
  const headers = ["Name", "Phone", "Email", "City", "Total Spend", "Total Bookings", "Last Visit", "Tags"]
  const rows = customers.map((c) => [
    c.name, c.phone, c.email || "", c.city, c.total_spend, c.total_bookings,
    c.last_visit || "", (c.tags || []).join("; "),
  ])
  return [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n")
}

const tagColors: Record<string, string> = {
  "VIP":                 "bg-amber-500 text-white",
  "High Spender":        "bg-emerald-500 text-white",
  "Anniversary Regular": "bg-pink-500 text-white",
  "Birthday Celebration":"bg-purple-500 text-white",
  "Proposal Success":    "bg-red-500 text-white",
  "Referral Program":    "bg-blue-500 text-white",
  "New Customer":        "bg-gray-500 text-white",
}

const defaultForm = {
  name: "", phone: "", email: "", city: "Surat",
  source: "instagram", notes: "", consent_whatsapp: true,
}

function CustomersPageInner() {
  const searchParams = useSearchParams()
  const { activeCity, isReady } = useBrand()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState({ total: 0, vip: 0, totalRevenue: 0, avgSpend: 0, whatsappOptIn: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || "")
  const [selectedCity, setSelectedCity] = useState("all")
  const [selectedTag, setSelectedTag] = useState("all")
  const [spendFilter, setSpendFilter] = useState("all")
  const [visitFilter, setVisitFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showTagDialog, setShowTagDialog] = useState(false)
  const [bulkTag, setBulkTag] = useState("")
  const [tagging, setTagging] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(defaultForm)

  // Sync with global activeCity
  useEffect(() => {
    if (isReady) {
      setSelectedCity(activeCity)
      setForm((f) => ({
        ...f,
        city: activeCity === "all" ? "Surat" : activeCity
      }))
    }
  }, [activeCity, isReady])

  const load = useCallback(async () => {
    if (!isReady) return
    setLoading(true)
    try {
      const cityFilter = selectedCity === "all" ? undefined : selectedCity
      const [cData, cStats] = await Promise.all([
        getCustomers({
          city: selectedCity,
          tag: selectedTag,
          spend: spendFilter,
          visits: visitFilter,
          search: searchQuery,
        }),
        getCustomerStats(cityFilter),
      ])
      setCustomers(cData)
      setStats(cStats)
    } catch {
      toast.error("Failed to load customers")
    } finally {
      setLoading(false)
    }
  }, [selectedCity, selectedTag, spendFilter, visitFilter, searchQuery, isReady])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(), 300)
    return () => clearTimeout(t)
  }, [load])

  const handleCreate = async () => {
    if (!form.name || !form.phone) {
      toast.error("Name and phone are required")
      return
    }
    setSaving(true)
    try {
      await createCustomer({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        city: form.city,
        source: form.source,
        notes: form.notes || undefined,
        consent_whatsapp: form.consent_whatsapp,
      })
      toast.success("Customer added!")
      setShowAddDialog(false)
      setForm(defaultForm)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to add customer")
    } finally {
      setSaving(false)
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedCustomers((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    setSelectedCustomers(
      selectedCustomers.length === customers.length ? [] : customers.map((c) => c.id)
    )
  }

  const handleExport = () => {
    if (customers.length === 0) {
      toast.error("No customers to export")
      return
    }
    const blob = new Blob([toCsv(customers)], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleBulkTag = async () => {
    if (!bulkTag.trim()) {
      toast.error("Enter a tag name")
      return
    }
    setTagging(true)
    try {
      await Promise.all(
        selectedCustomers.map((id) => {
          const c = customers.find((x) => x.id === id)
          const tags = Array.from(new Set([...(c?.tags || []), bulkTag.trim()]))
          return updateCustomer(id, { tags })
        })
      )
      toast.success(`Tagged ${selectedCustomers.length} customer${selectedCustomers.length > 1 ? "s" : ""}`)
      setShowTagDialog(false)
      setBulkTag("")
      setSelectedCustomers([])
      load()
    } catch {
      toast.error("Failed to tag customers")
    } finally {
      setTagging(false)
    }
  }

  const isPhoneSearch = searchQuery.replace(/\s/g, "").match(/^\+?\d{8,}$/)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Customer Database</h1>
          <p className="text-muted-foreground">Manage your customer relationships and send targeted campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />Export
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Customer</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>Create a new customer profile in the database</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Full Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Enter customer name" />
                </div>
                <div className="grid gap-2">
                  <Label>Phone Number *</Label>
                  <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
                </div>
                <div className="grid gap-2">
                  <Label>City</Label>
                  <Select value={form.city} onValueChange={(v) => setForm((f) => ({ ...f, city: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Surat">Surat</SelectItem>
                      <SelectItem value="Vadodara">Vadodara</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="walkin">Walk-in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Special preferences, occasions, etc." />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="whatsapp" checked={form.consent_whatsapp}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, consent_whatsapp: !!v }))} />
                  <label htmlFor="whatsapp" className="text-sm">WhatsApp marketing consent</label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={saving}>{saving ? "Adding..." : "Add Customer"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        {[
          { label: "Total Customers", value: stats.total, icon: Users, sub: "" },
          { label: "VIP Customers", value: stats.vip, icon: Star, sub: "₹50k+ lifetime" },
          { label: "Total Revenue", value: `₹${(stats.totalRevenue / 1000).toFixed(0)}k`, icon: IndianRupee, sub: "From all customers" },
          { label: "Avg. Spend", value: `₹${stats.avgSpend.toLocaleString()}`, icon: TrendingUp, sub: "Per customer" },
          { label: "WhatsApp Opt-in", value: stats.whatsappOptIn, icon: MessageSquare, sub: `${stats.total > 0 ? Math.round((stats.whatsappOptIn / stats.total) * 100) : 0}% consent rate` },
        ].map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
                {s.sub && <p className="text-xs text-muted-foreground">{s.sub}</p>}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Quick search by phone, name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {isPhoneSearch && customers.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-background border rounded-md shadow-lg z-10 p-2">
                  <p className="text-xs text-muted-foreground px-2 pb-2">Quick Results:</p>
                  {customers.slice(0, 3).map((customer) => (
                    <Link key={customer.id} href={`/protected/customers/${customer.id}`}
                      className="flex items-center gap-3 p-2 hover:bg-muted rounded-md">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {customer.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.phone}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {activeCity === "all" && (
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="w-[130px]">
                    <MapPin className="h-4 w-4 mr-2" /><SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    <SelectItem value="Surat">Surat</SelectItem>
                    <SelectItem value="Vadodara">Vadodara</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-[150px]">
                  <Tag className="h-4 w-4 mr-2" /><SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="High Spender">High Spender</SelectItem>
                  <SelectItem value="Anniversary Regular">Anniversary</SelectItem>
                  <SelectItem value="Birthday Celebration">Birthday</SelectItem>
                  <SelectItem value="Proposal Success">Proposal</SelectItem>
                  <SelectItem value="Referral Program">Referral</SelectItem>
                  <SelectItem value="New Customer">New</SelectItem>
                </SelectContent>
              </Select>
              <Button variant={showFilters ? "secondary" : "outline"} size="icon"
                onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {showFilters && (
            <div className="flex gap-4 mt-4 pt-4 border-t flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Spend Level:</Label>
                <Select value={spendFilter} onValueChange={setSpendFilter}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="high">High (₹50k+)</SelectItem>
                    <SelectItem value="medium">Medium (₹20-50k)</SelectItem>
                    <SelectItem value="low">Low (&lt;₹20k)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Visit Frequency:</Label>
                <Select value={visitFilter} onValueChange={setVisitFilter}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="frequent">Frequent (5+)</SelectItem>
                    <SelectItem value="regular">Regular (2-4)</SelectItem>
                    <SelectItem value="new">New (1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedCustomers.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedCustomers.length} customer{selectedCustomers.length > 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-2">
                <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm"><Tag className="h-4 w-4 mr-2" />Add Tag</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Add Tag</DialogTitle>
                      <DialogDescription>
                        Apply a tag to {selectedCustomers.length} selected customer{selectedCustomers.length > 1 ? "s" : ""}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2 py-2">
                      <Label>Tag Name</Label>
                      <Input value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} placeholder="e.g., VIP" />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowTagDialog(false)}>Cancel</Button>
                      <Button onClick={handleBulkTag} disabled={tagging}>{tagging ? "Tagging..." : "Apply Tag"}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/protected/marketing"><Send className="h-4 w-4 mr-2" />Build Campaign</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCustomers([])}>Clear</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading customers...
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="h-8 w-8 mb-2 opacity-30" />
              <p>No customers found</p>
              <Button variant="link" onClick={() => setShowAddDialog(true)}>Add your first customer</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedCustomers.length === customers.length && customers.length > 0}
                      onCheckedChange={selectAll}
                    />
                  </TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="hidden lg:table-cell">Tags</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Visits</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Visit</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} className="group">
                    <TableCell>
                      <Checkbox
                        checked={selectedCustomers.includes(customer.id)}
                        onCheckedChange={() => toggleSelection(customer.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Link href={`/protected/customers/${customer.id}`}
                        className="flex items-center gap-3 hover:opacity-80">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {customer.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{customer.city}
                            {customer.consent_whatsapp && (
                              <MessageSquare className="h-3 w-3 ml-2 text-green-500" />
                            )}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1">
                        <a href={`tel:${customer.phone}`} className="text-sm flex items-center gap-1 hover:text-primary">
                          <Phone className="h-3 w-3" />{customer.phone}
                        </a>
                        {customer.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />{customer.email}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(customer.tags || []).slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className={tagColors[tag] || ""}>{tag}</Badge>
                        ))}
                        {(customer.tags || []).length > 2 && (
                          <Badge variant="outline">+{customer.tags.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-medium">₹{(customer.total_spend || 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">lifetime</p>
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      <Badge variant="outline">{customer.total_bookings || 0}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {customer.last_visit ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(customer.last_visit).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/protected/customers/${customer.id}`}>
                              <Eye className="h-4 w-4 mr-2" />View Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <a href={`tel:${customer.phone}`}>
                              <Phone className="h-4 w-4 mr-2" />Call Customer
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-green-600">
                              <MessageSquare className="h-4 w-4 mr-2" />WhatsApp
                            </a>
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
    </div>
  )
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <CustomersPageInner />
    </Suspense>
  )
}
