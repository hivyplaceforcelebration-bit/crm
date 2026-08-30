"use client"

import { type Invoice } from "@/lib/actions/invoices"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Printer, CheckCircle2, Clock, AlertCircle, Coffee } from "lucide-react"
import Link from "next/link"

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2; bg: string }> = {
  paid:     { label: "PAID",     color: "text-emerald-700", icon: CheckCircle2, bg: "bg-emerald-50 border-emerald-200" },
  partial:  { label: "PARTIAL",  color: "text-amber-700",   icon: Clock,        bg: "bg-amber-50 border-amber-200" },
  pending:  { label: "DUE",      color: "text-red-700",     icon: AlertCircle,  bg: "bg-red-50 border-red-200" },
  refunded: { label: "REFUNDED", color: "text-gray-700",    icon: ArrowLeft,    bg: "bg-gray-50 border-gray-200" },
}

const methodLabel: Record<string, string> = {
  cash: "Cash", upi: "UPI", card: "Card", online: "Bank Transfer",
}

const outletDetails: Record<string, { name: string; address: string; phone: string; website: string }> = {
  Vadodara: {
    name: "Friends Factory Cafe",
    address: "424, OneWest, Sevasi – Canal Rd, Gotri, Vadodara – 391101",
    phone: "+91 74878 88730",
    website: "friendsfactorycafe.com",
  },
  Surat: {
    name: "HIVY – Place for Celebrations",
    address: "Surat, Gujarat",
    phone: "+91 99999 00001",
    website: "hivy.co.in",
  },
}

export function InvoicePrintView({ invoice }: { invoice: Invoice }) {
  const balance = (invoice.total_amount || 0) - (invoice.amount_paid || 0)
  const cfg = statusConfig[invoice.payment_status] || statusConfig.pending
  const StatusIcon = cfg.icon
  const outlet = outletDetails[invoice.outlet || ""] || outletDetails.Vadodara

  const handlePrint = () => window.print()

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Toolbar — hidden on print */}
      <div className="print:hidden sticky top-0 z-10 bg-background border-b px-6 py-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/protected/invoices">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Invoices
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`border ${cfg.bg} ${cfg.color} font-semibold`}>
            <StatusIcon className="w-3 h-3 mr-1" /> {cfg.label}
          </Badge>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="max-w-2xl mx-auto my-8 print:my-0 print:max-w-none">
        <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:rounded-none border border-border/60 overflow-hidden">

          {/* Header */}
          <div className="bg-primary px-8 py-7 text-primary-foreground print:bg-[#5c3d2e] print:text-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Coffee className="w-5 h-5 opacity-80" />
                  <span className="font-bold text-lg tracking-tight">{outlet.name}</span>
                </div>
                <p className="text-xs opacity-70 leading-relaxed max-w-xs">{outlet.address}</p>
                <p className="text-xs opacity-70 mt-0.5">{outlet.phone} · {outlet.website}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Invoice</p>
                <p className="text-2xl font-bold font-mono">{invoice.invoice_number || "—"}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(invoice.created_at).toLocaleDateString("en-IN", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-7 space-y-7">

            {/* Billed To */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Billed To</p>
              <p className="font-semibold text-base">{invoice.customer_name}</p>
              {invoice.customer_phone && (
                <p className="text-sm text-muted-foreground mt-0.5">{invoice.customer_phone}</p>
              )}
              {invoice.outlet && (
                <p className="text-sm text-muted-foreground">{invoice.outlet} Outlet</p>
              )}
            </div>

            <Separator />

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</span>
              </div>

              <div className="py-4 flex items-start justify-between">
                <div>
                  <p className="font-medium">
                    {invoice.notes || "Celebration Package"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {invoice.outlet} · {new Date(invoice.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <p className="font-medium tabular-nums">₹{(invoice.subtotal || 0).toLocaleString()}</p>
              </div>

              <Separator />

              {/* Totals */}
              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">₹{(invoice.subtotal || 0).toLocaleString()}</span>
                </div>
                {(invoice.discount || 0) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount</span>
                    <span className="tabular-nums">−₹{(invoice.discount || 0).toLocaleString()}</span>
                  </div>
                )}
                {(invoice.tax || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="tabular-nums">₹{(invoice.tax || 0).toLocaleString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg pt-1">
                  <span>Total</span>
                  <span className="tabular-nums">₹{(invoice.total_amount || 0).toLocaleString()}</span>
                </div>
                {(invoice.amount_paid || 0) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Amount Paid</span>
                    <span className="tabular-nums">−₹{(invoice.amount_paid || 0).toLocaleString()}</span>
                  </div>
                )}
                {balance > 0 && (
                  <div className="flex justify-between font-semibold text-red-600">
                    <span>Balance Due</span>
                    <span className="tabular-nums">₹{balance.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Status Banner */}
            <div className={`rounded-xl border px-5 py-3.5 flex items-center gap-3 ${cfg.bg}`}>
              <StatusIcon className={`w-5 h-5 ${cfg.color}`} />
              <div>
                <p className={`font-semibold text-sm ${cfg.color}`}>
                  {invoice.payment_status === "paid"
                    ? "Payment Complete"
                    : invoice.payment_status === "partial"
                    ? `Partial Payment — ₹${balance.toLocaleString()} remaining`
                    : `Payment Due — ₹${balance.toLocaleString()}`}
                </p>
                {invoice.payment_method && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    via {methodLabel[invoice.payment_method] || invoice.payment_method}
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="border-t bg-muted/30 px-8 py-5 text-center print:bg-gray-50">
            <p className="text-sm font-medium text-foreground">Thank you for celebrating with us! 🎉</p>
            <p className="text-xs text-muted-foreground mt-1">
              For any queries, contact us at {outlet.phone} or visit {outlet.website}
            </p>
          </div>

        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white; }
          @page { margin: 0.5in; size: A4; }
        }
      `}</style>
    </div>
  )
}
