import { About } from "@/components/landing/About"
import { Features } from "@/components/landing/Features"
import { FinalCta } from "@/components/landing/FinalCta"
import { Footer } from "@/components/landing/Footer"
import { Hero } from "@/components/landing/Hero"
import { Journey } from "@/components/landing/Journey"
import { Navbar } from "@/components/landing/Navbar"
import { ProductScreenshots } from "@/components/landing/ProductScreenshots"

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <ProductScreenshots />
      <Features />
      <Journey />
      <About />
      <FinalCta />
      <Footer />
    </main>
  )
}
