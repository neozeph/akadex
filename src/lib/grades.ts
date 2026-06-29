export const GRADE_OPTIONS = [
  1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0,
] as const

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
