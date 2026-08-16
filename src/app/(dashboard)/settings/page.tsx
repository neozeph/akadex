import { redirect } from "next/navigation"
import { UserCircle2, Mail, Palette, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { getAuthenticatedUser } from "@/lib/supabase/session"

import { updateDisplayName } from "./actions"
import { getSettingsPageData } from "./data"

export default async function SettingsPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  const { profile } = await getSettingsPageData()
  const currentName = profile?.full_name ?? user.user_metadata?.full_name ?? ""

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your Akadex account and preferences."
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-border p-3">
              <UserCircle2 className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Account overview</h2>
              <p className="text-sm text-muted-foreground">
                Your current auth details from Supabase.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-border p-4">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="size-4" />
                Email
              </p>
              <p className="mt-2 font-medium">{user?.email ?? "No email available"}</p>
            </div>

            <div className="rounded-2xl border border-border p-4">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="size-4" />
                Display name
              </p>
              <p className="mt-2 font-medium">
                {profile?.full_name ?? user?.user_metadata?.full_name ?? "No name set yet"}
              </p>
            </div>

            <div className="rounded-2xl border border-border p-4">
              <p className="text-sm text-muted-foreground">Member since</p>
              <p className="mt-2 font-medium">
                {profile?.created_at
                  ? new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(profile.created_at))
                  : "Unavailable"}
              </p>
            </div>
          </div>
        </div>

        <form action={updateDisplayName} className="space-y-4 rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-border p-3">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Display name</h2>
              <p className="text-sm text-muted-foreground">
                Update the name that appears across your account screens.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <label className="mb-2 block text-sm font-medium" htmlFor="full_name">
              Full name
            </label>
            <input
              id="full_name"
              name="full_name"
              defaultValue={currentName}
              placeholder="Juan Dela Cruz"
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground focus:ring-3 focus:ring-primary/20"
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Leave this blank if you want to clear the display name.
            </p>
          </div>

          <Button type="submit" className="w-full sm:w-auto">
            Save display name
          </Button>
        </form>

        <div className="space-y-4 rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-border p-3">
              <Palette className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Appearance</h2>
              <p className="text-sm text-muted-foreground">
                Switch between light, dark, or system mode.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <ThemeToggle />
            <p className="mt-3 text-sm text-muted-foreground">
              Akadex follows your system theme by default.
            </p>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Sign out</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Use this if you are switching accounts or testing another student profile.
            </p>
            <div className="mt-4">
              <SignOutButton />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
