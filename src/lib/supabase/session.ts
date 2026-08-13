import { cache } from "react"
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

/**
 * Authoritative identity check: asks the Supabase Auth server whether the
 * session's user still exists, unlike getSupabaseClaims() which only verifies
 * the JWT locally and stays "valid" for a deleted user until the token
 * expires. Use this at authorization boundaries (protected routes, user-owned
 * mutations). Wrapped in React.cache so multiple calls within the same
 * request (e.g. layout + page) share one network round trip instead of
 * hitting Supabase Auth repeatedly; the cache is scoped to the request's
 * render and never persists across requests.
 */
export const getAuthenticatedUser = cache(async () => {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
  })

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return null
  }

  return data.user
})
