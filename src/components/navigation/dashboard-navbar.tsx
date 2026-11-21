import { getProfileDisplayName } from "@/lib/profile-name"
import { cookies } from "next/headers"
import { getAuthenticatedUser } from "@/lib/supabase/session"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { throwPublicError } from "@/lib/server-errors"

import { DashboardNavbarClient } from "./dashboard-navbar-client"

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "ST"
}

export async function DashboardNavbar() {
  const user=await getAuthenticatedUser()
  const store=await cookies()
  const supabase=createSupabaseServerClient({getAll:()=>store.getAll()})
  const {data:profile,error}=user?await supabase.from('profiles').select('full_name').eq('id',user.id).maybeSingle():{data:null,error:null}
  if(error)throwPublicError('navigation.loadProfile',error,'Unable to load your profile right now.')
  const displayName = getProfileDisplayName(user??undefined,profile?.full_name)
  const initials = getInitials(displayName)

  return <DashboardNavbarClient displayName={displayName} initials={initials} />
}
