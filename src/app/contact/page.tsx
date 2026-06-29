import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, GitBranch, Mail, MessageSquare } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageShell } from "@/components/landing/PageShell"

export const metadata: Metadata = {
  title: "Contact Acadex",
  description: "Reach out to the Acadex team through GitHub or email for questions, feedback, or ideas.",
}

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Contact"
      title="Say hello and share what you are building with Acadex."
      description="Whether you have a question, a feature idea, or want to talk through your academic workflow, the door is open."
      actions={
        <>
          <Link href="mailto:hello@acadex.app">
            <Button size="lg" className="gap-2">
              <Mail className="size-4" />
              Email the team
            </Button>
          </Link>
          <Link href="https://github.com/neozeph/acadex" target="_blank" rel="noreferrer">
            <Button variant="outline" size="lg" className="gap-2">
              <GitBranch className="size-4" />
              Open GitHub
            </Button>
          </Link>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.7rem] border border-border/70 bg-background/70 p-8 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
            <MessageSquare className="size-5" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-foreground">Ways to connect</h2>
          <ul className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
            <li>• Share feedback about the product experience.</li>
            <li>• Suggest improvements to planning, GPA tracking, or focus sessions.</li>
            <li>• Report bugs or discuss your favorite study workflow.</li>
          </ul>
        </div>

        <div className="rounded-[1.7rem] border border-emerald-200/70 bg-card/85 p-8 shadow-sm dark:border-emerald-500/20">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-600 dark:text-emerald-300">
            Quick start
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Prefer a fast path?</h2>
          <p className="mt-3 text-base leading-8 text-muted-foreground">
            Open a GitHub issue for product feedback, or drop us an email and we will get back to you as soon as possible.
          </p>
          <div className="mt-6 rounded-[1.2rem] border border-border/70 bg-background/70 p-5">
            <p className="text-sm text-muted-foreground">Email</p>
            <a href="mailto:hello@acadex.app" className="mt-2 inline-flex items-center gap-2 text-base font-medium text-foreground hover:text-emerald-600">
              hello@acadex.app
              <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
