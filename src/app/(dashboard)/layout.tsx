import { redirect } from "next/navigation"

import { DashboardNavbar } from "@/components/navigation/dashboard-navbar"
import { getSupabaseClaims } from "@/lib/supabase/session"

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { data } = await getSupabaseClaims()

  if (!data?.claims?.sub) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <DashboardNavbar />
      <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
