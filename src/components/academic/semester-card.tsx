import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { formatSemesterLabel, formatSemesterSchoolYear, formatTermLabel, type StructuredSemester } from "@/lib/semesters"

type SemesterCardProps = {
  semester: StructuredSemester & { id: string }
  editAction: React.ReactNode
  deleteAction: React.ReactNode
}

/**
 * A single decorative SVG path draws the folder body and tab as one
 * continuous silhouette. The semantic structure stays clean HTML: the Link
 * owns navigation, and edit/delete remain independent controls above it.
 *
 * The path's top edge rises into the tab and then flows back down into the
 * folder body, avoiding the pasted-on rectangle look.
 */
export function SemesterCard({ semester, editAction, deleteAction }: SemesterCardProps) {
  const termLabel = formatTermLabel(semester.term)
  const schoolYear = formatSemesterSchoolYear(semester)
  const hasStructuredData = Boolean(semester.year_level && termLabel)

  return (
    <div className="group relative min-h-[146px]">
      <Link
        href={`/semesters/${semester.id}`}
        aria-label={`Open ${formatSemesterLabel(semester)}`}
        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />

      <svg
        aria-hidden="true"
        viewBox="0 0 320 160"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 z-10 h-full w-full drop-shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:drop-shadow-md"
      >
        <path
          d="M12 46 Q12 27 31 27 H112 Q123 27 131 36 L143 49 H290 Q308 49 308 67 V130 Q308 148 290 148 H30 Q12 148 12 130 Z"
          className="fill-card stroke-border transition-colors duration-200 group-hover:stroke-primary/50"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M31 27 H112 Q123 27 131 36 L143 49 H12 V46 Q12 27 31 27 Z"
          className="fill-accent transition-colors duration-200"
        />
      </svg>

      <div className="pointer-events-none relative z-20 flex min-h-[146px] flex-col justify-between px-4 pb-4 pt-7 transition-transform duration-200 group-hover:-translate-y-0.5">
        <div>
          {hasStructuredData ? (
            <>
              <p className="ml-1 font-accent text-[0.68rem] font-semibold tracking-[0.1em] text-primary uppercase">
                Year {semester.year_level}
              </p>
              <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-6 text-foreground">{termLabel}</h3>
            </>
          ) : (
            <h3 className="line-clamp-2 text-base font-semibold leading-6 text-foreground">{formatSemesterLabel(semester)}</h3>
          )}
          {schoolYear ? <p className="mt-0.5 text-sm text-muted-foreground">{schoolYear}</p> : null}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Open
            <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>

          <div className="pointer-events-auto flex items-center gap-1.5">
            {editAction}
            {deleteAction}
          </div>
        </div>
      </div>
    </div>
  )
}
