import { cookies } from "next/headers"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/lib/supabase/session"
import { throwPublicError } from "@/lib/server-errors"

export async function getSettingsPageData() {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
  })

  const [user, profileResult] = await Promise.all([
    getAuthenticatedUser(),
    supabase.from("profiles").select("full_name, avatar_url, created_at").maybeSingle(),
  ])

  if (profileResult.error) {
    throwPublicError("settings.loadProfile", profileResult.error, "Unable to load your settings right now.")
  }

  return {
    user,
    profile: profileResult.data,
  }
}
