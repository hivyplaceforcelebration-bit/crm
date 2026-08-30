"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Search, Plus, FileText, Eye, MoreVertical,
  IndianRupee, CreditCard, CheckCircle2, Clock, AlertCircle,
  Receipt, Filter, RefreshCw, Phone, Building,
} from "lucide-react"
import {
  getInvoices, createInvoice, recordPayment, getInvoiceStats, type Invoice,
} from "@/lib/actions/invoices"
import { useBrand } from "@/hooks/use-brand"
import { toast } from "sonner"
import Link from "next/link"

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  paid:     { label: "Paid",     color: "bg-green-100 text-green-800",  icon: CheckCircle2 },
  partial:  { label: "Partial",  color: "bg-orange-100 text-orange-800",icon: Clock },
  pending:  { label: "Pending",  color: "bg-red-100 text-red-800",      icon: AlertCircle },
  refunded: { label: "Refunded", color: "bg-gray-100 text-gray-800",    icon: RefreshCw },
}

const defaultInvForm = {
  customer_name: "", customer_phone: "", outlet: "Surat",
  subtotal: 0, discount: 0, tax: 0, total_amount: 0,
  payment_method: "", notes: "",
}

const defaultPayForm = {
  amount: 0, method: "cash", ref: "",
}

export default function InvoicesPage() {
  const { activeCity, isReady } = useBrand()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState({ total: 0, totalRevenue: 0, totalCollected: 0, pending: 0, partial: 0, paid: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [outletFilter, setOutletFilter] = useState("all")
  const [showNewInv, setShowNewInv] = useState(false)
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [saving, setSaving] = useState(false)
  const [invForm, setInvForm] = useState(defaultInvForm)
  const [payForm, setPayForm] = useState(defaultPayForm)

  // Sync with global activeCity
  useEffect(() => {
    if (isReady) {
      setOutletFilter(activeCity)
      setInvForm((f) => ({
        ...f,
        outlet: activeCity === "all" ? "Surat" : activeCity
      }))
    }
  }, [activeCity, isReady])

  const load = useCallback(async () => {
    if (!isReady) return
    setLoading(true)
    try {
      const cityFilter = outletFilter === "all" ? undefined : outletFilter
      const [iData, iStats] = await Promise.all([
        getInvoices({ status: statusFilter, outlet: outletFilter }),
        getInvoiceStats(cityFilter),
      ])
      setInvoices(iData)
      setStats(iStats)
    } catch {
      toast.error("Failed to load invoices")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, outletFilter, isReady])

  useEffect(() => { load() }, [load])

  const filteredInvoices = invoices.filter((inv) => {
    const s = searchQuery.toLowerCase()
    return (
      !s ||
      inv.invoice_number?.toLowerCase().includes(s) ||
      inv.customer_name?.toLowerCase().includes(s) ||
      inv.customer_phone?.includes(s)
    )
  })

  // Auto-calc total when subtotal/discount/tax changes
  const handleInvFormChange = (field: string, value: any) => {
    setInvForm((f) => {
      const updated = { ...f, [field]: value }
      if (["subtotal", "discount", "tax"].includes(field)) {
        updated.total_amount = Math.max(0, (updated.subtotal || 0) - (updated.discount || 0) + (updated.tax || 0))
      }
      return updated
    })
  }

  const handleCreateInvoice = async () => {
    if (!invForm.customer_name || !invForm.total_amount) {
      toast.error("Customer name and total are required")
      return
    }
    setSaving(true)
    try {
      await createInvoice({
        customer_name: invForm.customer_name,
        customer_phone: invForm.customer_phone || undefined,
        outlet: invForm.outlet,
        subtotal: invForm.subtotal,
        discount: invForm.discount || 0,
        tax: invForm.tax || 0,
        total_amount: invForm.total_amount,
        payment_method: invForm.payment_method || undefined,
        notes: invForm.notes || undefined,
      })
      toast.success("Invoice created!")
      setShowNewInv(false)
      setInvForm(defaultInvForm)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to create invoice")
    } finally {
      setSaving(false)
    }
  }

  const openPayDialog = (inv: Invoice) => {
    setSelectedInvoice(inv)
    setPayForm({ amount: inv.total_amount - inv.amount_paid, method: "cash", ref: "" })
    setShowPayDialog(true)
  }

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !payForm.amount) {
      toast.error("Amount is required")
      return
    }
    setSaving(true)
    try {
      await recordPayment(selectedInvoice.id, payForm.amount, payForm.method, payForm.ref)
      toast.success("Payment recorded!")
      setShowPayDialog(false)
      setSelectedInvoice(null)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to record payment")
    } finally {
      setSaving(false)
    }
  }

  const outstanding = stats.totalRevenue - stats.totalCollected

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Invoices & Payments</h1>
          <p className="text-muted-foreground">Track all payments and outstanding balances</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={showNewInv} onOpenChange={setShowNewInv}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New Invoice</DialogTitle>
                <DialogDescription>Create a new invoice for a customer</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Customer Name *</Label>
                    <Input value={invForm.customer_name} onChange={(e) => handleInvFormChange("customer_name", e.target.value)} placeholder="Full name" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Phone</Label>
                    <Input value={invForm.customer_phone} onChange={(e) => handleInvFormChange("customer_phone", e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Outlet</Label>
                  <Select value={invForm.outlet} onValueChange={(v) => handleInvFormChange("outlet", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Surat">Surat</SelectItem>
                      <SelectItem value="Vadodara">Vadodara</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Subtotal (₹)</Label>
                    <Input type="number" value={invForm.subtotal} onChange={(e) => handleInvFormChange("subtotal", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Discount (₹)</Label>
                    <Input type="number" value={invForm.discount} onChange={(e) => handleInvFormChange("discount", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Tax (₹)</Label>
                    <Input type="number" value={invForm.tax} onChange={(e) => handleInvFormChange("tax", parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">Total Amount</span>
                  <span className="text-xl font-bold flex items-center">
                    <IndianRupee className="h-4 w-4" />{invForm.total_amount.toLocaleString()}
                  </span>
                </div>
                <div className="grid gap-1.5">
                  <Label>Payment Method</Label>
                  <Select value={invForm.payment_method} onValueChange={(v) => handleInvFormChange("payment_method", v)}>
                    <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="online">Online Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewInv(false)}>Cancel</Button>
                <Button onClick={handleCreateInvoice} disabled={saving}>{saving ? "Creating..." : "Create Invoice"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Total Invoices",   value: stats.total,          icon: FileText,    color: "" },
          { label: "Total Billed",     value: `₹${(stats.totalRevenue / 1000).toFixed(0)}k`,   icon: IndianRupee, color: "" },
          { label: "Collected",        value: `₹${(stats.totalCollected / 1000).toFixed(0)}k`, icon: CheckCircle2,color: "text-green-600" },
          { label: "Outstanding",      value: `₹${(outstanding / 1000).toFixed(0)}k`,          icon: AlertCircle, color: "text-red-600" },
        ].map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                {s.label === "Outstanding" && stats.partial + stats.pending > 0 && (
                  <p className="text-xs text-muted-foreground">{stats.partial + stats.pending} invoices</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by invoice #, customer name or phone..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        {activeCity === "all" && (
          <Select value={outletFilter} onValueChange={setOutletFilter}>
            <SelectTrigger className="w-[150px]">
              <Building className="mr-2 h-4 w-4" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outlets</SelectItem>
              <SelectItem value="Surat">Surat</SelectItem>
              <SelectItem value="Vadodara">Vadodara</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="mr-2 h-4 w-4" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading invoices...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Receipt className="h-8 w-8 mb-2 opacity-30" />
              <p>No invoices found</p>
              <Button variant="link" onClick={() => setShowNewInv(true)}>Create your first invoice</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Outlet</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => {
                  const balance = (inv.total_amount || 0) - (inv.amount_paid || 0)
                  const cfg = statusConfig[inv.payment_status] || statusConfig.pending
                  const StatusIcon = cfg.icon
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <Link
                          href={`/protected/invoices/${inv.id}`}
                          className="font-medium font-mono text-sm hover:text-primary hover:underline"
                        >
                          {inv.invoice_number || "—"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{inv.customer_name}</p>
                          {inv.customer_phone && (
                            <a href={`tel:${inv.customer_phone}`}
                              className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary">
                              <Phone className="h-3 w-3" /> {inv.customer_phone}
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{inv.outlet || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(inv.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{(inv.total_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        ₹{(inv.amount_paid || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
                        ₹{balance.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={cfg.color}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {inv.payment_status !== "paid" && (
                              <DropdownMenuItem onClick={() => openPayDialog(inv)}>
                                <CreditCard className="mr-2 h-4 w-4" />Record Payment
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/protected/invoices/${inv.id}`}>
                                <Eye className="mr-2 h-4 w-4" />View & Print
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.invoice_number} — Balance: ₹{((selectedInvoice?.total_amount || 0) - (selectedInvoice?.amount_paid || 0)).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label>Amount Received (₹) *</Label>
              <Input type="number" value={payForm.amount}
                onChange={(e) => setPayForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Payment Method *</Label>
              <Select value={payForm.method} onValueChange={(v) => setPayForm((f) => ({ ...f, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">💵 Cash</SelectItem>
                  <SelectItem value="upi">📱 UPI</SelectItem>
                  <SelectItem value="card">💳 Card</SelectItem>
                  <SelectItem value="online">🏦 Online Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Reference / UTR (optional)</Label>
              <Input value={payForm.ref} onChange={(e) => setPayForm((f) => ({ ...f, ref: e.target.value }))}
                placeholder="Transaction reference..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={saving}>
              {saving ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
