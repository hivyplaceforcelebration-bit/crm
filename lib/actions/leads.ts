"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type Lead = {
  id: string
  name: string
  phone: string
  whatsapp_number: string | null
  email: string | null
  occasion_type: string
  preferred_date: string | null
  preferred_time: string | null
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

  // Create booking
  const { data: newBooking, error } = await supabase
    .from("bookings")
    .insert({
      ...booking,
      booking_number: "",
      customer_id: customer?.id || null,
      status: "confirmed",
      payment_status: "pending",
      add_ons_amount: 0,
      amount_paid: 0,
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

  revalidatePath("/protected/leads")
  revalidatePath("/protected/bookings")
  revalidatePath("/protected/dashboard")
  return newBooking
}

export async function getLeadStats(outlet?: string) {
  const supabase = await createClient()
  let query = supabase
    .from("leads")
    .select("status, lead_source, outlet")

  if (outlet && outlet !== "all") {
    query = query.eq("outlet", outlet)
  }

  const { data, error } = await query
  if (error) throw error
  const leads = data || []

  return {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    qualified: leads.filter((l) => l.status === "qualified").length,
    converted: leads.filter((l) => l.status === "converted").length,
    lost: leads.filter((l) => l.status === "lost").length,
  }
}
