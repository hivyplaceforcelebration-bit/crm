"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type Customer = {
  id: string
  name: string
  phone: string
  email: string | null
  city: string
  total_spend: number
  total_bookings: number
  last_visit: string | null
  first_visit: string | null
  tags: string[]
  occasions: string[]
  consent_whatsapp: boolean
  notes: string | null
  source: string
  loyalty_points: number
  total_visits: number
  created_at: string
}

export async function getCustomers(filters?: {
  city?: string
  tag?: string
  spend?: string
  visits?: string
  search?: string
}) {
  const supabase = await createClient()
  let query = supabase
    .from("customers")
    .select("*")
    .order("total_spend", { ascending: false })

  if (filters?.city && filters.city !== "all") {
    query = query.eq("city", filters.city)
  }
  if (filters?.tag && filters.tag !== "all") {
    query = query.contains("tags", [filters.tag])
  }
  if (filters?.search) {
    const s = filters.search
    query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`)
  }

  const { data, error } = await query
  if (error) throw error
  let customers = data as Customer[]

  // Client-side spend/visits filter
  if (filters?.spend && filters.spend !== "all") {
    customers = customers.filter((c) => {
      if (filters.spend === "high") return c.total_spend >= 50000
      if (filters.spend === "medium") return c.total_spend >= 20000 && c.total_spend < 50000
      if (filters.spend === "low") return c.total_spend < 20000
      return true
    })
  }
  if (filters?.visits && filters.visits !== "all") {
    customers = customers.filter((c) => {
      if (filters.visits === "frequent") return c.total_bookings >= 5
      if (filters.visits === "regular") return c.total_bookings >= 2 && c.total_bookings < 5
      if (filters.visits === "new") return c.total_bookings === 1
      return true
    })
  }

  return customers
}

export async function getCustomerById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data as Customer
}

export async function createCustomer(customer: {
  name: string
  phone: string
  email?: string
  city?: string
  source?: string
  notes?: string
  consent_whatsapp?: boolean
  occasions?: string[]
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("customers")
    .insert({
      ...customer,
      city: customer.city || "Surat",
      source: customer.source || "walk-in",
      consent_whatsapp: customer.consent_whatsapp ?? true,
      tags: [],
      occasions: customer.occasions || [],
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath("/protected/customers")
  return data
}

export async function updateCustomer(id: string, updates: Partial<Customer>) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", id)

  if (error) throw error
  revalidatePath("/protected/customers")
  revalidatePath(`/protected/customers/${id}`)
}

export async function getCustomerStats(outlet?: string) {
  const supabase = await createClient()
  let query = supabase
    .from("customers")
    .select("total_spend, tags, consent_whatsapp, total_bookings, city")

  if (outlet && outlet !== "all") {
    query = query.eq("city", outlet)
  }

  const { data, error } = await query
  if (error) throw error
  const customers = data || []

  const totalRevenue = customers.reduce((sum, c) => sum + (c.total_spend || 0), 0)
  const vipCustomers = customers.filter((c) => (c.tags || []).includes("VIP")).length
  const whatsappOptIn = customers.filter((c) => c.consent_whatsapp).length
  const avgSpend = customers.length > 0 ? Math.round(totalRevenue / customers.length) : 0

  return {
    total: customers.length,
    vip: vipCustomers,
    totalRevenue,
    avgSpend,
    whatsappOptIn,
  }
}

export async function getUpcomingBirthdays() {
  const supabase = await createClient()
  // Customers with "Birthday" in occasions and upcoming within 30 days
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, notes")
    .contains("occasions", ["Birthday"])
    .limit(5)

  if (error) return []
  return data
}

export async function getUpcomingAnniversaries() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, notes")
    .contains("occasions", ["Anniversary"])
    .limit(5)

  if (error) return []
  return data
}
