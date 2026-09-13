import { getInvoice } from "@/lib/actions/invoices"
import { getOutlets } from "@/lib/actions/settings"
import { notFound } from "next/navigation"
import { InvoicePrintView } from "./invoice-print-view"

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let invoice
  try {
    invoice = await getInvoice(id)
  } catch {
    notFound()
  }

  const outlets = await getOutlets()
  const outlet = outlets.find((o) => o.city === invoice.outlet) || outlets[0] || null

  return <InvoicePrintView invoice={invoice} outlet={outlet} />
}
