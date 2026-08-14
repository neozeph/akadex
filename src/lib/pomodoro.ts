export const DEFAULT_FOCUS_MINUTES = 25
export const DEFAULT_BREAK_MINUTES = 5
export const MIN_POMODORO_MINUTES = 1
export const MAX_POMODORO_MINUTES = 120

/** "6h 20m" / "45m" — for totals (Focus Time). Database duration is always seconds. */
export function formatFocusDuration(totalSeconds: number) {
  const totalMinutes = Math.round(totalSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) {
    return `${minutes}m`
  }

  if (minutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}m`
}

/** "42 min" — for a single value like Average Session. */
export function formatFocusMinutes(totalSeconds: number) {
  return `${Math.round(totalSeconds / 60)} min`
}
