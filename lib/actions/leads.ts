"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { sendBookingConfirmation, sendTeamBookingAlert, sendInvoiceMessage } from "@/lib/actions/whatsapp"
import { createInvoiceFromBooking, getInvoice } from "@/lib/actions/invoices"

const OCCASION_LABELS: Record<string, string> = {
  candlelight: "Candlelight Dinner",
  birthday: "Birthday Celebration",
  anniversary: "Anniversary",
  proposal: "Proposal / Ring Ceremony",
  private_celebration: "Private Celebration",
  other: "Special Occasion",
}

export type Lead = {
  id: string
  name: string
  phone: string
  whatsapp_number: string | null
  email: string | null
  occasion_type: string
  preferred_date: string | null
  preferred_time: string | null
  package_name: string | null
  num_people: number
  outlet: string | null
  status: string
  lead_source: string
  enquiry_channel: string
  budget_range: string | null
  notes: string | null
  assigned_to: string | null
  follow_up_date: string | null
  converted_booking_id: string | null
  created_at: string
}

export async function getLeads(filters?: {
  status?: string
  source?: string
  outlet?: string
  limit?: number
}) {
  const supabase = await createClient()
  let query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }
  if (filters?.source && filters.source !== "all") {
    query = query.eq("lead_source", filters.source)
  }
  if (filters?.outlet && filters.outlet !== "all") {
    query = query.eq("outlet", filters.outlet)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Lead[]
}

export async function createLead(lead: {
  name: string
  phone: string
  whatsapp_number?: string
  email?: string
  occasion_type: string
  preferred_date?: string
  preferred_time?: string
  package_name?: string
  outlet?: string
  status?: string
  lead_source: string
  enquiry_channel: string
  budget_range?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...lead, status: lead.status || "new" })
    .select()
    .single()

  if (error) throw error
  revalidatePath("/protected/leads")
  revalidatePath("/protected/dashboard")
  return data
}

export async function updateLeadStatus(id: string, status: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id)

  if (error) throw error
  revalidatePath("/protected/leads")
}

export async function updateLead(id: string, updates: Partial<Lead>) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", id)

  if (error) throw error
  revalidatePath("/protected/leads")
}

export async function deleteLead(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("leads").delete().eq("id", id)
  if (error) throw error
  revalidatePath("/protected/leads")
}

export async function convertLeadToBooking(
  leadId: string,
  booking: {
    customer_name: string
    customer_phone: string
    outlet: string
    booking_date: string
    time_slot: string
    experience_type: string
    package_id?: string
    package_name?: string
    num_people: number
    base_amount: number
    total_amount: number
    notes?: string
  }
) {
  const supabase = await createClient()

  // Upsert customer by phone
  const { data: customer } = await supabase
    .from("customers")
    .upsert(
      { name: booking.customer_name, phone: booking.customer_phone },
      { onConflict: "phone", ignoreDuplicates: false }
    )
    .select("id")
    .single()

  // Create booking - converting a lead means payment was collected (that's
  // what "converted" means in this workflow, unlike a fresh booking which
  // starts pending), so it's marked paid in full immediately.
  const { data: newBooking, error } = await supabase
    .from("bookings")
    .insert({
      ...booking,
      booking_number: "",
      customer_id: customer?.id || null,
      status: "confirmed",
      payment_status: "paid",
      add_ons_amount: 0,
      amount_paid: booking.total_amount,
    })
    .select()
    .single()

  if (error) throw error

  if (customer?.id) {
    await supabase.rpc("update_customer_stats", { p_customer_id: customer.id })
  }

  // Mark lead converted
  await supabase
    .from("leads")
    .update({ status: "converted", converted_booking_id: newBooking.id })
    .eq("id", leadId)

  // Best-effort - a failed WhatsApp send must never fail the conversion.
  const waPayload = {
    customer_name: booking.customer_name,
    customer_phone: booking.customer_phone,
    outlet: booking.outlet,
    booking_date: booking.booking_date,
    time_slot: booking.time_slot,
    package_name: booking.package_name,
    occasion: OCCASION_LABELS[booking.experience_type] || booking.experience_type,
    total_amount: booking.total_amount,
  }
  sendBookingConfirmation(waPayload).catch((err) => console.error("sendBookingConfirmation failed", err))
  sendTeamBookingAlert(waPayload).catch((err) => console.error("sendTeamBookingAlert failed", err))

  // Converting = paid in full, so an invoice exists immediately - generate
  // it and send it to the customer. Best-effort, same as the WhatsApp
  // sends above: never let this fail the conversion itself.
  createInvoiceFromBooking(newBooking.id)
    .then(async (invoiceId) => {
      const invoice = await getInvoice(invoiceId)
      if (invoice.customer_phone) {
        await sendInvoiceMessage({ ...invoice, customer_phone: invoice.customer_phone })
      }
    })
    .catch((err) => console.error("invoice generation/send failed", err))

  revalidatePath("/protected/leads")
  revalidatePath("/protected/bookings")
  revalidatePath("/protected/invoices")
  revalidatePath("/protected/dashboard")
  return newBooking
}

export async function getLeadStats(outlet?: string) {
  const supabase = await createClient()

  // COUNT queries with head:true ask Postgres for just the row count, not
  // the rows themselves - much lighter than fetching every lead and
  // filtering in JS once the table has any real volume.
  const countFor = (status?: string) => {
    let query = supabase.from("leads").select("*", { count: "exact", head: true })
    if (outlet && outlet !== "all") query = query.eq("outlet", outlet)
    if (status) query = query.eq("status", status)
    return query
  }

  const [total, newC, contacted, qualified, converted, lost] = await Promise.all([
    countFor(),
    countFor("new"),
    countFor("contacted"),
    countFor("qualified"),
    countFor("converted"),
    countFor("lost"),
  ])

  return {
    total: total.count || 0,
    new: newC.count || 0,
    contacted: contacted.count || 0,
    qualified: qualified.count || 0,
    converted: converted.count || 0,
    lost: lost.count || 0,
  }
}
