import { getSupabaseClaims } from "@/lib/supabase/session"

import { DashboardNavbarClient } from "./dashboard-navbar-client"

function getDisplayName(claims: Record<string, unknown> | undefined) {
  const metadata = (claims?.user_metadata ?? {}) as Record<string, unknown>
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name : undefined
  const name = typeof metadata.name === "string" ? metadata.name : undefined
  const email = typeof claims?.email === "string" ? claims.email : undefined
  const candidate = fullName ?? name ?? email?.split("@")?.[0] ?? "Student"

  return candidate.split(" ")[0] || "Student"
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ST"
}

export async function DashboardNavbar() {
  const { data } = await getSupabaseClaims()
  const claims = data?.claims as Record<string, unknown> | undefined
  const displayName = getDisplayName(claims)
  const initials = getInitials(displayName)

  return <DashboardNavbarClient displayName={displayName} initials={initials} />
}
