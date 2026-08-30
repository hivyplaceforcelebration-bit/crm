"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ── Types ─────────────────────────────────────────────────────────────────────

export type Outlet = {
  id: string
  name: string
  city: string
  address: string | null
  phone: string | null
  email: string | null
  capacity: number
  is_active: boolean
  created_at: string
}

export type TimeSlot = {
  id: string
  outlet_id: string | null
  slot_name: string
  start_time: string
  end_time: string
  capacity: number
  is_active: boolean
  created_at: string
}

// ── Outlets ───────────────────────────────────────────────────────────────────

export async function getOutlets(): Promise<Outlet[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("outlets")
    .select("*")
    .order("created_at", { ascending: true })
  if (error) throw error
  return data as Outlet[]
}

export async function createOutlet(outlet: {
  name: string
  city: string
  address?: string
  phone?: string
  email?: string
  capacity?: number
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("outlets")
    .insert({ ...outlet, capacity: outlet.capacity || 8, is_active: true })
    .select()
    .single()
  if (error) throw error
  revalidatePath("/protected/settings")
  return data
}

export async function updateOutlet(id: string, updates: Partial<Outlet>) {
  const supabase = await createClient()
  const { error } = await supabase.from("outlets").update(updates).eq("id", id)
  if (error) throw error
  revalidatePath("/protected/settings")
}

export async function toggleOutletActive(id: string, is_active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from("outlets").update({ is_active }).eq("id", id)
  if (error) throw error
  revalidatePath("/protected/settings")
}

// ── Time Slots ────────────────────────────────────────────────────────────────

export async function getTimeSlots(): Promise<TimeSlot[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("time_slots")
    .select("*")
    .order("start_time", { ascending: true })
  if (error) throw error
  return data as TimeSlot[]
}

export async function createTimeSlot(slot: {
  outlet_id?: string | null
  slot_name: string
  start_time: string
  end_time: string
  capacity?: number
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("time_slots")
    .insert({ ...slot, capacity: slot.capacity || 1, is_active: true })
    .select()
    .single()
  if (error) throw error
  revalidatePath("/protected/settings")
  return data
}

export async function toggleTimeSlotActive(id: string, is_active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from("time_slots").update({ is_active }).eq("id", id)
  if (error) throw error
  revalidatePath("/protected/settings")
}

export async function deleteTimeSlot(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("time_slots").delete().eq("id", id)
  if (error) throw error
  revalidatePath("/protected/settings")
}
