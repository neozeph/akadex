import type { Metadata } from "next"

import { PageShell } from "@/components/landing/PageShell"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing use of the Acadex platform.",
}

const sections = [
  {
    title: "About Acadex",
    content: "Acadex is a student productivity and academic management platform designed to help students organize their academic life by managing semesters, tracking grades, monitoring GPA, organizing tasks, and improving productivity through focus sessions. Acadex is provided as a productivity tool and should not be considered an official academic record or substitute for your school's systems.",
  },
  {
    title: "Eligibility",
    content: "You must be at least 13 years old, or meet the minimum age required in your country, to use Acadex. By using the platform, you confirm that the information you provide is accurate.",
  },
  {
    title: "User Accounts",
    content: "You are responsible for maintaining the confidentiality of your account, keeping your credentials secure, and all activity that occurs under your account. You should immediately notify us if you believe your account has been compromised.",
  },
  {
    title: "Acceptable Use",
    content: "You agree not to use Acadex for unlawful purposes, attempt unauthorized access to other accounts, upload malicious code or harmful content, interfere with the operation or security of the platform, or misuse the service in a way that may affect other users.",
  },
  {
    title: "Academic Information",
    content: "Acadex stores information entered by users, including semester information, subjects, grades, tasks, and productivity records. Users are solely responsible for the accuracy of the information they enter. Acadex does not verify academic records.",
  },
  {
    title: "Limitation of Liability",
    content: "Acadex is provided as an educational productivity tool. We are not responsible for lost academic data, missed deadlines, incorrect GPA calculations caused by incorrect user input, or academic decisions made based on information stored within the platform.",
  },
]

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Terms of Service"
      title="The rules that guide the use of Acadex."
      description="These terms outline how the service is intended to be used and what responsibilities belong to both the user and the platform."
    >
      <div className="space-y-4">
        {sections.map((section) => (
          <section key={section.title} className="rounded-[1.5rem] border border-border/70 bg-card/85 p-7 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
            <p className="mt-3 text-base leading-8 text-muted-foreground">{section.content}</p>
          </section>
        ))}
      </div>
    </PageShell>
  )
}
