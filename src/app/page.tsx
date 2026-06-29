import { BeginAdventure } from "@/components/landing/BeginAdventure"
import { Features } from "@/components/landing/Features"
import { Footer } from "@/components/landing/Footer"
import { Hero } from "@/components/landing/Hero"
import { Journey } from "@/components/landing/Journey"
import { Navbar } from "@/components/landing/Navbar"

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_24%),linear-gradient(135deg,#f8faf6_0%,#f5fef9_48%,#ffffff_100%)] text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.15),transparent_32%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_20%),linear-gradient(135deg,#0f172a_0%,#111827_50%,#0b1220_100%)]">
      <Navbar />
      <Hero />
      <Features />
      <Journey />
      <BeginAdventure />
      <Footer />
    </main>
  )
}
