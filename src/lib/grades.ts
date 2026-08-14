export const GRADE_OPTIONS = [
  1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0,
] as const

export type GradableSubject = {
  grade: number | string | null
  units: number | string
}

/**
 * Weighted-average GWA across graded subjects only. Ungraded subjects
 * (grade === null) are excluded from both the numerator and denominator.
 * Returns null when there are no graded units, so callers don't divide by zero.
 */
export function calculateGwa(subjects: GradableSubject[]): number | null {
  const gradedSubjects = subjects.filter((subject) => subject.grade !== null)

  const totalGradedUnits = gradedSubjects.reduce(
    (sum, subject) => sum + Number(subject.units),
    0,
  )

  const weightedSum = gradedSubjects.reduce(
    (sum, subject) => sum + Number(subject.units) * Number(subject.grade),
    0,
  )

  return totalGradedUnits > 0 ? weightedSum / totalGradedUnits : null
}

export function formatGrade(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "No grade"
  }

  return value.toFixed(2)
}

export function getSubjectStatus(grade: number | null | undefined) {
  if (grade === null || grade === undefined) {
    return { label: "Ungraded", tone: "neutral" as const }
  }

  if (grade <= 3) {
    return { label: "Passed", tone: "success" as const }
  }

  return { label: "Failed", tone: "danger" as const }
}

/**
 * Shared tone -> visual style for getSubjectStatus(), so SubjectCard and the
 * Subject Workspace summary render status identically instead of each
 * defining its own copy. Sage for passed, terracotta for failed (the app's
 * existing attention color), muted for ungraded — gold/highlight is
 * deliberately not used here, it stays reserved for achievements.
 */
export const SUBJECT_STATUS_BADGE_CLASSES: Record<"success" | "neutral" | "danger", string> = {
  success: "border-transparent bg-primary/10 text-primary",
  neutral: "border-border bg-muted text-muted-foreground",
  danger: "border-transparent bg-terracotta/15 text-terracotta",
}
