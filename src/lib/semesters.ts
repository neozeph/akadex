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

const SHORT_TERM_LABELS: Record<string, string> = { "1": "S1", "2": "S2", summer: "Sum" }

/**
 * Compact "Y1 · S1" tick label for chart axes — same structured/legacy
 * fallback formatSemesterLabel() already uses, just abbreviated, so an
 * unconverted (pre-Sprint-3.6) semester still renders something sensible
 * instead of a blank tick.
 */
export function formatSemesterShortLabel(semester: StructuredSemester) {
  const termLabel = formatTermLabel(semester.term)

  if (semester.year_level && termLabel) {
    const shortTerm = SHORT_TERM_LABELS[semester.term as string] ?? termLabel
    return `Y${semester.year_level} · ${shortTerm}`
  }

  return semester.title?.trim() || "Untitled semester"
}

const TERM_SORT_ORDER: Record<string, number> = { "1": 1, "2": 2, summer: 3 }

/**
 * Chronological comparator for charts/analytics — orders by school_year_start,
 * then year_level, then term (1st < 2nd < Summer), NOT by created_at (which
 * only reflects when the row was entered into Akadex, not when the semester
 * actually happened).
 *
 * Legacy (pre-Sprint-3.6) rows with null year_level/term/school_year_start
 * can't be chronologically placed without parsing free-text title — which
 * Sprint 3.6 explicitly chose never to do — so every legacy row sorts after
 * every structured row, and ties among legacy rows fall back to created_at
 * as the only remaining reliable, deterministic signal.
 */
export function compareSemestersChronologically<
  T extends StructuredSemester & { created_at: string },
>(a: T, b: T): number {
  const aStructured = a.year_level !== null && a.term !== null && a.school_year_start !== null
  const bStructured = b.year_level !== null && b.term !== null && b.school_year_start !== null

  if (aStructured && bStructured) {
    if (a.school_year_start !== b.school_year_start) {
      return (a.school_year_start as number) - (b.school_year_start as number)
    }
    if (a.year_level !== b.year_level) {
      return (a.year_level as number) - (b.year_level as number)
    }
    return (TERM_SORT_ORDER[a.term as string] ?? 99) - (TERM_SORT_ORDER[b.term as string] ?? 99)
  }

  if (aStructured !== bStructured) {
    return aStructured ? -1 : 1
  }

  return a.created_at.localeCompare(b.created_at)
}
