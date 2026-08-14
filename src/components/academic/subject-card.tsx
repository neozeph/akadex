"use client"

import * as React from "react"
import Link from "next/link"
import { Pencil, Trash2 } from "lucide-react"

import { EditSubjectDialog, type EditableSubject } from "@/components/academic/edit-subject-dialog"
import { DeleteConfirmDialog } from "@/components/academic/delete-confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { formatGrade, getSubjectStatus, SUBJECT_STATUS_BADGE_CLASSES } from "@/lib/grades"
import { cn } from "@/lib/utils"

type SubjectCardProps = {
  subject: EditableSubject
  semesterId: string
  activeTaskCount: number
  onUpdate: (formData: FormData) => Promise<void>
  onDelete: (formData: FormData) => Promise<void>
}

/**
 * Primary interaction is now navigation to the Subject Workspace
 * (Sprint 5.2) rather than opening Edit — same stretched-link architecture
 * SemesterCard already uses: an absolutely-positioned full-bleed Link sits
 * under a pointer-events-none content layer, so nothing needs
 * stopPropagation. Edit/Delete are a small pointer-events-auto island that
 * sits above the Link and intercepts its own clicks instead.
 */
export function SubjectCard({ subject, semesterId, activeTaskCount, onUpdate, onDelete }: SubjectCardProps) {
  const [editOpen, setEditOpen] = React.useState(false)
  const status = getSubjectStatus(subject.grade)
  const units = Number(subject.units)
  const workspaceHref = `/semesters/${semesterId}/subjects/${subject.id}`

  return (
    <>
      <article className="group relative rounded-xl border border-border bg-card shadow-sm transition-colors duration-150 hover:border-primary/60 hover:bg-accent/40 hover:shadow-md dark:hover:border-primary/50">
        <Link
          href={workspaceHref}
          className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={`Open ${subject.subject_code} — ${subject.subject_name}`}
        />

        <div className="pointer-events-none relative z-10 flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="font-accent text-[0.68rem] font-semibold tracking-[0.1em] text-primary uppercase">
              {subject.subject_code}
            </span>
            <Badge variant="outline" className={cn("shrink-0", SUBJECT_STATUS_BADGE_CLASSES[status.tone])}>
              {status.label.toUpperCase()}
            </Badge>
          </div>

          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">{subject.subject_name}</h3>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {units} unit{units === 1 ? "" : "s"}
            </span>
            <span className="font-semibold text-foreground">
              Grade {subject.grade === null ? "—" : formatGrade(subject.grade)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p
              className={cn(
                "flex items-center gap-1.5 text-xs",
                activeTaskCount > 0 ? "font-medium text-primary" : "text-muted-foreground",
              )}
            >
              {activeTaskCount > 0 ? (
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-primary" />
              ) : null}
              {activeTaskCount === 0
                ? "No active tasks"
                : `${activeTaskCount} active task${activeTaskCount === 1 ? "" : "s"}`}
            </p>

            <div className="pointer-events-auto flex items-center gap-1 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                aria-label={`Edit ${subject.subject_code}`}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pencil className="size-3.5" />
              </button>

              <DeleteConfirmDialog
                trigger={
                  <button
                    type="button"
                    aria-label={`Delete ${subject.subject_code}`}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                }
                title={`Delete ${subject.subject_code}?`}
                description="This subject will be permanently deleted. This action cannot be undone."
                confirmLabel="Delete subject"
                pendingLabel="Deleting..."
                errorMessage="Something went wrong deleting this subject. Please try again."
                onConfirm={async () => {
                  const formData = new FormData()
                  formData.set("semester_id", semesterId)
                  formData.set("subject_id", subject.id)
                  await onDelete(formData)
                }}
              />
            </div>
          </div>
        </div>
      </article>

      <EditSubjectDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        semesterId={semesterId}
        subject={subject}
        onSave={onUpdate}
      />
    </>
  )
}
