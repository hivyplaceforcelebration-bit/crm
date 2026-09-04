"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
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

// ── User Roles ────────────────────────────────────────────────────────────────

export type UserRole = {
  id: string
  email: string
  name: string | null
  role: string
  outlet_access: string
  is_active: boolean
  created_at: string
}

// Defaults to "admin" when the logged-in user has no user_roles row yet -
// same rationale as current_user_outlet_access() in migration 010: login
// only requires a Supabase auth account, not a user_roles row, so treating
// "no role assigned" as unrestricted avoids locking out real accounts that
// predate the roles feature.
export async function getCurrentUserRole(): Promise<{ role: string; outlet_access: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { role: "admin", outlet_access: "all" }

  const { data } = await supabase
    .from("user_roles")
    .select("role, outlet_access")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  return data ?? { role: "admin", outlet_access: "all" }
}

export async function getUserRoles(): Promise<UserRole[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("user_roles")
    .select("*")
    .order("created_at", { ascending: true })
  if (error) throw error
  return data as UserRole[]
}

export async function createStaffUser(input: {
  email: string
  password: string
  name: string
  role: string
  outlet_access: string
}) {
  const admin = createAdminClient()
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name },
  })
  if (createError) throw createError

  const supabase = await createClient()
  const { error: roleError } = await supabase.from("user_roles").insert({
    id: created.user.id,
    email: input.email,
    name: input.name,
    role: input.role,
    outlet_access: input.outlet_access,
  })
  if (roleError) throw roleError

  revalidatePath("/protected/settings")
}

export async function updateUserRole(
  id: string,
  updates: Partial<Pick<UserRole, "role" | "outlet_access" | "is_active" | "name">>
) {
  const supabase = await createClient()
  const { error } = await supabase.from("user_roles").update(updates).eq("id", id)
  if (error) throw error
  revalidatePath("/protected/settings")
}

// ── Business Settings (General + Policies) ──────────────────────────────────────

export type BusinessSettings = {
  business_name: string
  gstin: string | null
  support_email: string | null
  support_phone: string | null
  full_payment_required: boolean
  min_advance_percent: number
  min_advance_booking_hours: number
  max_advance_booking_days: number
  gst_rate: number
  prices_inclusive_tax: boolean
  cancellation_policy: string
}

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("business_settings")
    .select("*")
    .eq("id", 1)
    .single()
  if (error) throw error
  return data as BusinessSettings
}

export async function updateBusinessSettings(updates: Partial<BusinessSettings>) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("business_settings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", 1)
  if (error) throw error
  revalidatePath("/protected/settings")
}
