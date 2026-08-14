"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DeleteConfirmDialog } from "@/components/academic/delete-confirm-dialog"
import { EditSubjectDialog, type EditableSubject } from "@/components/academic/edit-subject-dialog"

type SubjectWorkspaceActionsProps = {
  subject: EditableSubject
  semesterId: string
  onUpdate: (formData: FormData) => Promise<void>
  onDelete: (formData: FormData) => Promise<void>
}

/**
 * Thin wrapper around the existing EditSubjectDialog/DeleteConfirmDialog —
 * no new subject form or confirmation flow. The one addition on top of the
 * unmodified deleteSubject Server Action is navigating back to the semester
 * page after a successful delete, since the workspace route the user is
 * standing on stops existing the moment its subject is gone.
 */
export function SubjectWorkspaceActions({ subject, semesterId, onUpdate, onDelete }: SubjectWorkspaceActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil className="size-3.5" />
        Edit
      </Button>

      <DeleteConfirmDialog
        trigger={
          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        }
        title={`Delete ${subject.subject_code}?`}
        description="This subject will be permanently deleted. Its tasks are kept but lose their subject link. This action cannot be undone."
        confirmLabel="Delete subject"
        pendingLabel="Deleting..."
        errorMessage="Something went wrong deleting this subject. Please try again."
        onConfirm={async () => {
          const formData = new FormData()
          formData.set("semester_id", semesterId)
          formData.set("subject_id", subject.id)
          await onDelete(formData)
          router.push(`/semesters/${semesterId}`)
        }}
      />

      <EditSubjectDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        semesterId={semesterId}
        subject={subject}
        onSave={onUpdate}
      />
    </div>
  )
}
