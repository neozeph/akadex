import { formatSemesterLabel, type StructuredSemester } from "@/lib/semesters"

export type TaskSubjectOption = {
  id: string
  subject_code: string
  subject_name: string
  semester: StructuredSemester | null
}

/**
 * "CS201 — Data Structures · Year 2 / 1st Semester" for the task Subject
 * select — reuses the same structured/legacy fallback formatSemesterLabel
 * already relies on, so an unconverted (Sprint 3.6) semester still renders
 * something sensible instead of a blank suffix.
 */
export function formatSubjectOptionLabel(subject: TaskSubjectOption) {
  const base = `${subject.subject_code} — ${subject.subject_name}`

  if (!subject.semester) {
    return base
  }

  return `${base} · ${formatSemesterLabel(subject.semester)}`
}
