type SessionTimeProps = {
  value: string
  timeZone: string
}

export function SessionTime({ value, timeZone }: SessionTimeProps) {
  const label = new Intl.DateTimeFormat("en", {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
  return <time dateTime={value}>{label}</time>
}
