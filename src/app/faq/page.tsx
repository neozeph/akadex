import type { Metadata } from "next"

import { PageShell } from "@/components/landing/PageShell"

export const metadata: Metadata = {
  title: "Akadeks FAQ",
  description: "Answers to common questions about GPA tracking, data export, pricing, and how Akadeks works.",
}

const faqs = [
  {
    question: "How is GPA calculated?",
    answer: "Akadeks uses the grade values you enter for each subject to calculate a weighted GPA based on your saved academic data. You can review and adjust the details as needed.",
  },
  {
    question: "Can I export my data?",
    answer: "Export support is planned as part of the product roadmap. For now, your data remains available within the app and can be managed directly from your account.",
  },
  {
    question: "Is Akadeks free?",
    answer: "Akadeks is currently being built as a student-first product, and the core experience is designed to be accessible as the platform grows.",
  },
  {
    question: "Is Akadeks an official academic record?",
    answer: "No. Akadeks is a planning and productivity tool that helps you organize your work and track your progress, but it should not replace your school's official systems.",
  },
]

export default function FAQPage() {
  return (
    <PageShell
      eyebrow="FAQ"
      title="Answers to the questions students ask most often."
      description="A few of the most common questions about how Akadeks works, what it stores, and how it supports your academic routine."
    >
      <div className="space-y-4">
        {faqs.map((faq) => (
          <details key={faq.question} className="group rounded-[1.4rem] border border-border/70 bg-card/85 p-6 shadow-sm open:border-emerald-200/70 open:bg-emerald-50/70 dark:open:border-emerald-500/20 dark:open:bg-emerald-500/10">
            <summary className="cursor-pointer list-none text-lg font-semibold text-foreground">
              {faq.question}
            </summary>
            <p className="mt-3 text-base leading-8 text-muted-foreground">{faq.answer}</p>
          </details>
        ))}
      </div>
    </PageShell>
  )
}
