import { createServerClient, type CookieMethodsServer } from "@supabase/ssr"

import { getSupabaseConfig } from "./env"

export function createSupabaseServerClient(cookies: CookieMethodsServer) {
  const { url, publishableKey } = getSupabaseConfig()

  return createServerClient(url, publishableKey, {
    cookies,
  })
}
