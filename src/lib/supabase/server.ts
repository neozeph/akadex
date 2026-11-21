import { createServerClient, type CookieMethodsServer } from "@supabase/ssr"

import { getSupabaseConfig } from "./env"
import { createMeasuredFetch } from "../performance"

export function createSupabaseServerClient(cookies: CookieMethodsServer) {
  const { url, publishableKey } = getSupabaseConfig()

  return createServerClient(url, publishableKey, {
    cookies,
    ...(process.env.AKADEX_PERFORMANCE === "1" ? { global: { fetch: createMeasuredFetch() } } : {}),
  })
}
