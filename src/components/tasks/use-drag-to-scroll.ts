"use client"

import * as React from "react"

const DEFAULT_DRAG_THRESHOLD = 5

export const DRAG_SCROLL_INTERACTIVE_SELECTOR = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "label",
  "summary",
  "[role='button']",
  "[role='checkbox']",
  "[role='combobox']",
  "[role='dialog']",
  "[role='link']",
  "[role='menu']",
  "[role='menuitem']",
  "[role='option']",
  "[role='tooltip']",
  "[contenteditable='true']",
  "[data-no-drag-scroll]",
].join(",")

type DragState = {
  pointerId: number
  startX: number
  startY: number
  startScrollLeft: number
  isDragging: boolean
  didDrag: boolean
}

export function getDragScrollLeft(startScrollLeft: number, startX: number, currentX: number) {
  return startScrollLeft - (currentX - startX)
}

export function shouldStartHorizontalDrag(deltaX: number, deltaY: number, threshold = DEFAULT_DRAG_THRESHOLD) {
  return Math.abs(deltaX) >= threshold && Math.abs(deltaX) > Math.abs(deltaY)
}

export function shouldIgnoreDragScrollTarget(target: EventTarget | null) {
  return typeof Element !== "undefined" && target instanceof Element && Boolean(target.closest(DRAG_SCROLL_INTERACTIVE_SELECTOR))
}

export function useDragToScroll<TElement extends HTMLElement>(threshold = DEFAULT_DRAG_THRESHOLD) {
  const ref = React.useRef<TElement | null>(null)
  const dragState = React.useRef<DragState | null>(null)
  const suppressNextClick = React.useRef(false)
  const [isDragging, setIsDragging] = React.useState(false)

  const clearDragState = React.useCallback(() => {
    dragState.current = null
    setIsDragging(false)
  }, [])

  React.useEffect(() => {
    window.addEventListener("blur", clearDragState)
    return () => {
      window.removeEventListener("blur", clearDragState)
      clearDragState()
    }
  }, [clearDragState])

  const onPointerDown = React.useCallback<React.PointerEventHandler<TElement>>(
    (event) => {
      if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return
      if (shouldIgnoreDragScrollTarget(event.target)) return

      dragState.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startScrollLeft: event.currentTarget.scrollLeft,
        isDragging: false,
        didDrag: false,
      }
    },
    [],
  )

  const onPointerMove = React.useCallback<React.PointerEventHandler<TElement>>(
    (event) => {
      const state = dragState.current
      if (!state || state.pointerId !== event.pointerId) return

      const deltaX = event.clientX - state.startX
      const deltaY = event.clientY - state.startY

      if (!state.isDragging) {
        if (!shouldStartHorizontalDrag(deltaX, deltaY, threshold)) {
          if (Math.abs(deltaY) >= threshold && Math.abs(deltaY) >= Math.abs(deltaX)) {
            clearDragState()
          }
          return
        }

        state.isDragging = true
        state.didDrag = true
        setIsDragging(true)
        event.currentTarget.setPointerCapture?.(event.pointerId)
      }

      event.preventDefault()
      event.currentTarget.scrollLeft = getDragScrollLeft(state.startScrollLeft, state.startX, event.clientX)
    },
    [clearDragState, threshold],
  )

  const onPointerUp = React.useCallback<React.PointerEventHandler<TElement>>(
    (event) => {
      const state = dragState.current
      if (!state || state.pointerId !== event.pointerId) return

      suppressNextClick.current = state.didDrag
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      clearDragState()
    },
    [clearDragState],
  )

  const onPointerLeave = React.useCallback<React.PointerEventHandler<TElement>>(
    (event) => {
      const state = dragState.current
      if (!state || state.pointerId !== event.pointerId || state.isDragging) return
      clearDragState()
    },
    [clearDragState],
  )

  const onClickCapture = React.useCallback<React.MouseEventHandler<TElement>>((event) => {
    if (!suppressNextClick.current) return
    suppressNextClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }, [])

  return {
    ref,
    isDragging,
    dragScrollProps: {
      onClickCapture,
      onLostPointerCapture: clearDragState,
      onPointerCancel: clearDragState,
      onPointerDown,
      onPointerLeave,
      onPointerMove,
      onPointerUp,
    },
  }
}
