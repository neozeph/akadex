import { cookies } from "next/headers"

import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function getSettingsPageData() {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
  })

  const [userResult, profileResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("full_name, avatar_url, created_at").maybeSingle(),
  ])

  if (userResult.error) {
    throw new Error(userResult.error.message)
  }

  if (profileResult.error) {
    throw new Error(profileResult.error.message)
  }

  return {
    user: userResult.data.user,
    profile: profileResult.data,
  }
}
