"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type Package = {
  id: string
  name: string
  short_description: string | null
  base_price: number
  max_people: number
  duration_minutes: number
  experience_type: string
  is_active: boolean
  is_highlighted: boolean
  bookings_count: number
  inclusions: string[]
  image_url: string | null
  created_at: string
}

export type AddOn = {
  id: string
  name: string
  price: number
  type: string
  is_active: boolean
  bookings_count: number
  created_at: string
}

export async function getPackages() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .order("bookings_count", { ascending: false })

  if (error) throw error
  return data as Package[]
}

export async function getAddOns() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("add_ons")
    .select("*")
    .order("bookings_count", { ascending: false })

  if (error) throw error
  return data as AddOn[]
}

export async function createPackage(pkg: {
  name: string
  short_description?: string
  base_price: number
  max_people?: number
  duration_minutes?: number
  experience_type?: string
  inclusions?: string[]
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("packages")
    .insert({
      ...pkg,
      max_people: pkg.max_people || 2,
      duration_minutes: pkg.duration_minutes || 120,
      experience_type: pkg.experience_type || "candlelight",
      inclusions: pkg.inclusions || [],
      is_active: true,
      is_highlighted: false,
      bookings_count: 0,
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath("/protected/packages")
  return data
}

export async function updatePackage(id: string, updates: Partial<Package>) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("packages")
    .update(updates)
    .eq("id", id)

  if (error) throw error
  revalidatePath("/protected/packages")
}

export async function togglePackageActive(id: string, is_active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("packages")
    .update({ is_active })
    .eq("id", id)

  if (error) throw error
  revalidatePath("/protected/packages")
}

export async function togglePackageHighlight(id: string, is_highlighted: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("packages")
    .update({ is_highlighted })
    .eq("id", id)

  if (error) throw error
  revalidatePath("/protected/packages")
}

export async function deletePackage(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("packages").delete().eq("id", id)
  if (error) throw error
  revalidatePath("/protected/packages")
}

export async function createAddOn(addon: {
  name: string
  price: number
  type: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("add_ons")
    .insert({ ...addon, is_active: true, bookings_count: 0 })
    .select()
    .single()

  if (error) throw error
  revalidatePath("/protected/packages")
  return data
}

export async function toggleAddOnActive(id: string, is_active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("add_ons")
    .update({ is_active })
    .eq("id", id)

  if (error) throw error
  revalidatePath("/protected/packages")
}

export async function deleteAddOn(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("add_ons").delete().eq("id", id)
  if (error) throw error
  revalidatePath("/protected/packages")
}
