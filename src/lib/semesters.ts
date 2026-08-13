export const YEAR_LEVEL_OPTIONS = [1, 2, 3, 4, 5, 6] as const

export const TERM_OPTIONS = [
  { value: "1", label: "1st Semester" },
  { value: "2", label: "2nd Semester" },
  { value: "summer", label: "Summer" },
] as const

export type Term = (typeof TERM_OPTIONS)[number]["value"]

export const SCHOOL_YEAR_START_MIN = 2000
export const SCHOOL_YEAR_START_MAX = 2100

export type StructuredSemester = {
  year_level: number | null
  term: string | null
  school_year_start: number | null
  title?: string | null
  school_year?: string | null
}

export function formatTermLabel(term: string | null | undefined) {
  return TERM_OPTIONS.find((option) => option.value === term)?.label ?? null
}

export function formatSchoolYear(startYear: number | null | undefined) {
  if (startYear === null || startYear === undefined) {
    return null
  }

  return `S.Y. ${startYear}–${startYear + 1}`
}

/**
 * Prefers the structured year_level/term fields; falls back to the legacy
 * free-text title for semesters created before Sprint 3.6 that haven't
 * been edited (and therefore converted) yet.
 */
export function formatSemesterLabel(semester: StructuredSemester) {
  const termLabel = formatTermLabel(semester.term)

  if (semester.year_level && termLabel) {
    return `Year ${semester.year_level} • ${termLabel}`
  }

  return semester.title?.trim() || "Untitled semester"
}

/**
 * Prefers the derived structured school year; falls back to the legacy
 * free-text school_year for unconverted semesters.
 */
export function formatSemesterSchoolYear(semester: StructuredSemester) {
  const structured = formatSchoolYear(semester.school_year_start)

  if (structured) {
    return structured
  }

  return semester.school_year?.trim() || null
}

/**
 * Deterministic range of selectable start years around a given year.
 * The caller must supply `currentYear` from a Server Component (e.g.
 * `new Date().getFullYear()` evaluated once server-side) rather than
 * computing it inside a Client Component, so the option list is identical
 * on the server render and the first client render.
 */
export function getSchoolYearStartOptions(currentYear: number) {
  const start = currentYear - 1
  const end = currentYear + 5

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}
