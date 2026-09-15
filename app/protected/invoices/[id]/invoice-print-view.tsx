"use client"

import { type Invoice } from "@/lib/actions/invoices"
import { type Outlet } from "@/lib/actions/settings"
import { type Booking } from "@/lib/actions/bookings"
import { OCCASION_LABELS } from "@/lib/occasion-labels"
import { getLetterheadForCity } from "@/hooks/use-brand"
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
}

export function InvoicePrintView({
  invoice,
  outlet,
  booking,
}: {
  invoice: Invoice
  outlet: Outlet | null
  booking: Booking | null
}) {
  const balance = (invoice.total_amount || 0) - (invoice.amount_paid || 0)
  const cfg = statusConfig[invoice.payment_status] || statusConfig.pending
  const StatusIcon = cfg.icon
  const outletName = outlet?.name || invoice.outlet || "—"
  const outletAddress = outlet?.address || ""
  const outletPhone = outlet?.phone || ""
  const outletEmail = outlet?.email || ""
  const letterhead = getLetterheadForCity(outlet?.city || invoice.outlet)

  const description = booking?.package_name || invoice.notes || "Celebration Package"
  const bookingDate = booking?.booking_date || invoice.created_at
  const occasion = booking ? OCCASION_LABELS[booking.experience_type] || "Celebration" : "Celebration"

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

          {/* Letterhead */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-border/60">
            {outlet?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={outlet.logo_url}
                alt={`${letterhead.businessName} logo`}
                className="w-14 h-14 rounded object-contain mx-auto mb-2"
              />
            ) : (
              <Coffee className="w-8 h-8 text-primary mx-auto mb-2" />
            )}
            <p className="text-xl font-bold tracking-tight uppercase">{letterhead.businessName}</p>
            <p className="text-xs text-muted-foreground mt-1">{letterhead.tagline}</p>
            {outletAddress && (
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed whitespace-pre-line max-w-sm mx-auto">
                {outletAddress}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2 space-x-3">
              {outletPhone && <span>📞 {outletPhone}</span>}
              {outletEmail && <span>✉️ {outletEmail}</span>}
              <span>🌐 {letterhead.website}</span>
            </p>
          </div>

          {/* Body */}
          <div className="px-8 py-7 space-y-7">

            {/* Invoice meta */}
            <div>
              <p className="text-center text-sm font-bold tracking-[0.2em] text-muted-foreground mb-4">INVOICE</p>
              <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                <span className="text-muted-foreground">Invoice No.</span>
                <span className="text-right font-mono font-medium">{invoice.invoice_number || "—"}</span>
                <span className="text-muted-foreground">Invoice Date</span>
                <span className="text-right">{formatDate(invoice.created_at)}</span>
                <span className="text-muted-foreground">Booking Date</span>
                <span className="text-right">{formatDate(bookingDate)}</span>
                <span className="text-muted-foreground">Payment Status</span>
                <span className={`text-right font-semibold ${cfg.color}`}>{cfg.label}</span>
              </div>
            </div>

            <Separator />

            {/* Billed To */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Bill To</p>
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
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 pb-3 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Description</span>
                <span>Qty</span>
                <span>Rate</span>
                <span className="text-right">Amount</span>
              </div>

              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 py-4 items-start">
                <p className="font-medium">{description}</p>
                <p className="tabular-nums">1</p>
                <p className="tabular-nums">₹{(invoice.subtotal || 0).toLocaleString()}</p>
                <p className="font-medium tabular-nums text-right">₹{(invoice.subtotal || 0).toLocaleString()}</p>
              </div>

              <Separator />

              {/* Totals */}
              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">₹{(invoice.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="tabular-nums">
                    {(invoice.discount || 0) > 0 ? `−₹${invoice.discount.toLocaleString()}` : "₹0"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="tabular-nums">₹{(invoice.tax || 0).toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg pt-1">
                  <span>Total</span>
                  <span className="tabular-nums">₹{(invoice.total_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Amount Paid</span>
                  <span className="tabular-nums">₹{(invoice.amount_paid || 0).toLocaleString()}</span>
                </div>
                <div className={`flex justify-between font-semibold ${balance > 0 ? "text-red-600" : ""}`}>
                  <span>Balance Due</span>
                  <span className="tabular-nums">₹{balance.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Payment</p>
              <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="text-right">{methodLabel[invoice.payment_method || ""] || invoice.payment_method || "—"}</span>
                <span className="text-muted-foreground">Payment Status</span>
                <span className={`text-right font-semibold flex items-center justify-end gap-1 ${cfg.color}`}>
                  {invoice.payment_status === "paid" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {invoice.payment_status === "paid" ? "Payment Complete" : cfg.label}
                </span>
              </div>
            </div>

            <Separator />

            {/* Booking Details */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Booking Details</p>
              <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                <span className="text-muted-foreground">Experience</span>
                <span className="text-right">{description}</span>
                <span className="text-muted-foreground">Venue</span>
                <span className="text-right">{letterhead.businessName}, {outlet?.city || invoice.outlet}</span>
                <span className="text-muted-foreground">Occasion</span>
                <span className="text-right">{occasion}</span>
                <span className="text-muted-foreground">Booking Date</span>
                <span className="text-right">{formatDate(bookingDate)}</span>
              </div>
            </div>

            <Separator />

            {/* Terms & Notes */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Terms &amp; Notes</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Booking is confirmed upon receipt of payment.</li>
                <li>Package inclusions are as per the selected package at the time of booking.</li>
                <li>Any additional services or customisations will be charged separately.</li>
                <li>Please retain this invoice as proof of payment.</li>
              </ul>
            </div>

          </div>

          {/* Footer */}
          <div className="border-t bg-muted/30 px-8 py-5 text-center print:bg-gray-50">
            <p className="text-sm font-medium text-foreground">Thank you for celebrating with us! 🎉</p>
            <p className="text-xs text-muted-foreground mt-1">
              For any queries, contact us at {[outletPhone, outletEmail].filter(Boolean).join(" or ")}
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
