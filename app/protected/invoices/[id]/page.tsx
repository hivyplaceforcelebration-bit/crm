import { getInvoice } from "@/lib/actions/invoices"
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

  return <InvoicePrintView invoice={invoice} />
}
