"use client"

import * as React from "react"

type SessionTimeProps = {
  value: string
}

function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

export function SessionTime({ value }: SessionTimeProps) {
  const [label, setLabel] = React.useState<string | null>(null)

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLabel(formatSessionTime(value))
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [value])

  return <time dateTime={value}>{label ?? ""}</time>
}
