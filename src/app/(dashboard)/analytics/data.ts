import { cookies } from "next/headers"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { calculateGwa, getSubjectStatus, GRADE_OPTIONS } from "@/lib/grades"
import { compareSemestersChronologically, formatSemesterLabel, formatSemesterShortLabel } from "@/lib/semesters"
import { throwPublicError } from "@/lib/server-errors"

export type GwaBySemesterPoint = {
  semesterId: string
  label: string
  fullLabel: string
  gwa: number | null
  subjectCount: number
}

export type GradeDistributionBar = {
  grade: number
  count: number
}

export async function getAnalyticsData(userId: string) {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
  })

  // Two queries total — every semester and every subject for this user —
  // then everything below is aggregated in application code. No per-semester
  // query, so this stays O(1) round trips regardless of how many semesters
  // or subjects the account has.
  const [semestersResult, subjectsResult] = await Promise.all([
    supabase
      .from("semesters")
      .select("id, title, school_year, year_level, term, school_year_start, created_at")
      .eq("user_id", userId),
    supabase
      .from("subjects")
      .select("id, subject_code, subject_name, units, grade, semester_id")
      .eq("user_id", userId),
  ])

  if (semestersResult.error) {
    throwPublicError("analytics.loadSemesters", semestersResult.error, "Unable to load your analytics right now.")
  }

  if (subjectsResult.error) {
    throwPublicError("analytics.loadSubjects", subjectsResult.error, "Unable to load your analytics right now.")
  }

  const semesters = semestersResult.data ?? []
  const subjects = subjectsResult.data ?? []

  // Overall GWA is calculateGwa() run once across every subject the user
  // owns — NOT an average of per-semester GWAs, which would incorrectly
  // weight a 3-unit semester the same as a 21-unit one.
  const overallGwa = calculateGwa(subjects)
  const totalUnits = subjects.reduce((sum, subject) => sum + Number(subject.units), 0)
  const gradedSubjects = subjects.filter((subject) => subject.grade !== null)
  const ungradedCount = subjects.length - gradedSubjects.length
  const passedCount = subjects.filter((subject) => getSubjectStatus(subject.grade).tone === "success").length
  const failedCount = subjects.filter((subject) => getSubjectStatus(subject.grade).tone === "danger").length

  const subjectsBySemesterId = new Map<string, typeof subjects>()
  for (const subject of subjects) {
    if (!subject.semester_id) {
      continue
    }
    const bucket = subjectsBySemesterId.get(subject.semester_id) ?? []
    bucket.push(subject)
    subjectsBySemesterId.set(subject.semester_id, bucket)
  }

  const orderedSemesters = [...semesters].sort(compareSemestersChronologically)

  const gwaBySemester: GwaBySemesterPoint[] = orderedSemesters.map((semester) => {
    const semesterSubjects = subjectsBySemesterId.get(semester.id) ?? []

    return {
      semesterId: semester.id,
      label: formatSemesterShortLabel(semester),
      fullLabel: formatSemesterLabel(semester),
      // null when the semester has no graded subjects yet — never coerced
      // to 0, which would falsely read as a perfect GWA on the chart.
      gwa: calculateGwa(semesterSubjects),
      subjectCount: semesterSubjects.length,
    }
  })

  // Exact-grade counts over Akadex's finite grading scale. Ungraded
  // subjects are intentionally excluded here — they're reported as a
  // separate count, never as a bar on the grade axis.
  const gradeDistribution: GradeDistributionBar[] = GRADE_OPTIONS.map((grade) => ({
    grade,
    count: gradedSubjects.filter((subject) => Number(subject.grade) === grade).length,
  }))

  return {
    overallGwa,
    semesterCount: semesters.length,
    subjectCount: subjects.length,
    totalUnits,
    gradedCount: gradedSubjects.length,
    ungradedCount,
    passedCount,
    failedCount,
    gwaBySemester,
    gradeDistribution,
  }
}
