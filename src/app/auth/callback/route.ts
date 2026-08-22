import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", origin))
  }

  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options)
      })
    },
  })

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL("/login?error=confirmation_failed", origin))
  }

  // exchangeCodeForSession tags its result with "recovery" only when the code
  // originated from resetPasswordForEmail() (vs. signUp()'s confirmation
  // code), based on state the SDK itself stored client-side when the flow
  // was started — not on anything this request's query string controls.
  // Not yet reflected in @supabase/auth-js's public return type.
  const redirectType = (data as { redirectType?: string | null }).redirectType

  if (redirectType === "recovery") {
    return NextResponse.redirect(new URL("/update-password", origin))
  }

  return NextResponse.redirect(new URL("/dashboard", origin))
}
