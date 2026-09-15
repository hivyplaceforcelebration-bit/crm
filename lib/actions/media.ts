"use server"

// Shared image upload for anything that needs a public URL back - outlet
// logos, package photos, etc. All go in the one public "media" bucket
// (see migration 014), namespaced by folder so different features don't
// collide.

import { createClient } from "@/lib/supabase/server"

const MAX_BYTES = 5 * 1024 * 1024 // 5MB - plenty for a logo or package photo, keeps uploads fast
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]

export async function uploadMedia(folder: string, formData: FormData): Promise<{ url: string } | { error: string }> {
  const file = formData.get("file")
  if (!(file instanceof File)) return { error: "No file provided" }
  if (file.size > MAX_BYTES) return { error: "Image must be under 5MB" }
  if (!ALLOWED_TYPES.includes(file.type)) return { error: "Use a JPG, PNG, WEBP or SVG image" }

  const supabase = await createClient()
  const ext = file.name.split(".").pop() || "jpg"
  const path = `${folder}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) return { error: uploadError.message }

  const { data } = supabase.storage.from("media").getPublicUrl(path)
  return { url: data.publicUrl }
}
