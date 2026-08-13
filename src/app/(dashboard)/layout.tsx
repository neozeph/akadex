import { redirect } from "next/navigation"

import { DashboardNavbar } from "@/components/navigation/dashboard-navbar"
import { getAuthenticatedUser } from "@/lib/supabase/session"

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[256px_minmax(0,1fr)] lg:h-screen lg:overflow-hidden">
      <DashboardNavbar />
      <main className="min-h-0 overflow-y-auto px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">{children}</main>
    </div>
  )
}
