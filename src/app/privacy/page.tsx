import type { Metadata } from "next"

import { PageShell } from "@/components/landing/PageShell"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Akadex handles your data, account details, and privacy preferences.",
}

const sections = [
  {
    title: "Information We Collect",
    content: "When you create an account, we may collect your email address and authentication information provided through Supabase Authentication. Within the application, we may also store semester information, subjects, grades, GPA calculations, academic tasks, Pomodoro session history, profile preferences, and theme preference.",
  },
  {
    title: "How We Use Your Information",
    content: "Your information is used to authenticate your account, provide personalized academic tracking, save your progress, calculate GPA and academic statistics, improve the functionality of Akadex, and maintain the security of the platform. We do not use your academic information for advertising purposes.",
  },
  {
    title: "Data Storage",
    content: "Akadex stores user information securely using Supabase. Reasonable measures are taken to protect your data through secure authentication and database security features, including Row Level Security. No method of electronic storage is completely secure, but we strive to follow industry best practices.",
  },
  {
    title: "Data Sharing",
    content: "Akadex does not sell your personal information. We do not share your academic information with third parties except when required by law or when necessary to provide essential platform services.",
  },
  {
    title: "Cookies and Local Storage",
    content: "Akadex may use cookies or browser storage to keep you signed in, remember theme preferences, improve user experience, and store temporary application settings. These technologies are not used for behavioral advertising.",
  },
]

export default function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Privacy Policy"
      title="Your academic data is handled with care."
      description="This policy explains what information Akadex collects, how it is used, and the steps taken to protect your account and records."
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
