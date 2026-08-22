export function getAppOrigin(fallbackOrigin: string) {
  return (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || fallbackOrigin).replace(/\/$/, "")
}

export function getAuthCallbackUrl(origin: string) {
  return `${origin.replace(/\/$/, "")}/auth/callback`
}
