"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type DeleteConfirmDialogProps = {
  trigger: React.ReactNode
  title: string
  description: React.ReactNode
  confirmLabel: string
  pendingLabel: string
  errorMessage: string
  onConfirm: () => Promise<void>
}

/**
 * Shared confirm-before-delete shell for academic records. The actual
 * mutation is supplied by the caller (an existing Server Action) — this
 * component only owns the open/pending/error UI state around it.
 */
export function DeleteConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel,
  errorMessage,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  function handleOpenChange(next: boolean) {
    if (isPending) {
      return
    }

    setOpen(next)

    if (!next) {
      setError(null)
    }
  }

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      try {
        await onConfirm()
        setOpen(false)
      } catch {
        setError(errorMessage)
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={isPending} onClick={handleConfirm}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {pendingLabel}
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
