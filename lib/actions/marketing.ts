"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageTemplate = {
  id: string
  name: string
  body: string
  category: string
  created_at: string
}

export type Campaign = {
  id: string
  name: string
  message: string
  audience_type: string
  audience_filter: Record<string, unknown>
  status: string
  channel: string
  scheduled_at: string | null
  sent_at: string | null
  sent_count: number
  created_at: string
}

export type AudienceFilters = {
  city?: string
  spend?: string
  visitFrequency?: string
  lastVisit?: string
  occasions?: string[]
}

export type MarketingCustomer = {
  id: string
  name: string
  phone: string
  city: string
  total_spend: number
  total_bookings: number
  last_visit: string | null
  occasions: string[]
  tags: string[]
}

// ── Templates ─────────────────────────────────────────────────────────────────

export async function getTemplates(): Promise<MessageTemplate[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("message_templates")
    .select("*")
    .order("created_at", { ascending: false })
  return data || []
}

export async function saveTemplate(template: {
  name: string
  body: string
  category: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from("message_templates").insert(template)
  if (error) throw error
  revalidatePath("/protected/marketing")
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("message_templates").delete().eq("id", id)
  if (error) throw error
  revalidatePath("/protected/marketing")
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export async function getCampaigns(): Promise<Campaign[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
  return data || []
}

export async function saveCampaign(payload: {
  name: string
  message: string
  audience_filter: Record<string, unknown>
  sent_count: number
  status: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from("marketing_campaigns").insert({
    ...payload,
    channel: "whatsapp",
    sent_at: new Date().toISOString(),
    audience_type: "custom",
  })
  if (error) throw error
  revalidatePath("/protected/marketing")
}

// ── Audience ──────────────────────────────────────────────────────────────────

export async function getFilteredCustomers(
  filters: AudienceFilters
): Promise<MarketingCustomer[]> {
  const supabase = await createClient()

  let query = supabase
    .from("customers")
    .select("id,name,phone,city,total_spend,total_bookings,last_visit,occasions,tags")
    .eq("consent_whatsapp", true)

  if (filters.city && filters.city !== "all") {
    query = query.eq("city", filters.city)
  }
  if (filters.occasions && filters.occasions.length > 0) {
    query = query.overlaps("occasions", filters.occasions)
  }

  const { data } = await query
  let customers = (data || []) as MarketingCustomer[]

  if (filters.spend && filters.spend !== "all") {
    customers = customers.filter((c) => {
      if (filters.spend === "high") return c.total_spend >= 50000
      if (filters.spend === "medium")
        return c.total_spend >= 20000 && c.total_spend < 50000
      if (filters.spend === "low") return c.total_spend < 20000
      return true
    })
  }

  if (filters.visitFrequency && filters.visitFrequency !== "all") {
    customers = customers.filter((c) => {
      if (filters.visitFrequency === "frequent") return c.total_bookings >= 5
      if (filters.visitFrequency === "regular")
        return c.total_bookings >= 2 && c.total_bookings < 5
      if (filters.visitFrequency === "new") return c.total_bookings === 1
      return true
    })
  }

  if (filters.lastVisit && filters.lastVisit !== "all") {
    const now = Date.now()
    customers = customers.filter((c) => {
      if (!c.last_visit) return false
      const days = Math.floor(
        (now - new Date(c.last_visit).getTime()) / 86_400_000
      )
      if (filters.lastVisit === "recent") return days <= 30
      if (filters.lastVisit === "inactive30") return days > 30 && days <= 90
      if (filters.lastVisit === "inactive90") return days > 90
      return true
    })
  }

  return customers
}
