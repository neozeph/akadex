import { cookies } from "next/headers"

import { createSupabaseServerClient } from "./server"

export async function getSupabaseClaims() {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
  })

  return supabase.auth.getClaims()
}
