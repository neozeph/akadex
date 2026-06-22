export default function SettingsPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">
        <p className="text-sm font-semibold tracking-[0.25em] text-muted-foreground uppercase">
          Settings
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Preferences and account</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          We will add profile editing and app preferences here. The dark/light
          toggle is already in the navbar and follows system by default.
        </p>
      </section>
    </main>
  )
}
