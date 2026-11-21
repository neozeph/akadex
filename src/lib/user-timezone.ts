import "server-only"
import { cache } from "react"
import { cookies } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { DEFAULT_TIME_ZONE, isValidTimeZone } from "@/lib/dates"
import { throwPublicError } from "@/lib/server-errors"

export const getUserTimeZone = cache(async (userId: string) => {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient({ getAll: () => cookieStore.getAll() })
  const { data, error } = await supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle()
  if (error) throwPublicError("profile.loadTimezone", error, "Unable to load your calendar preferences. Please try again.")
  const timeZone = data?.timezone ?? DEFAULT_TIME_ZONE
  if (!isValidTimeZone(timeZone)) throwPublicError("profile.invalidTimezone", new Error("Invalid stored timezone"), "Unable to load your calendar preferences. Please try again.")
  return timeZone
})
