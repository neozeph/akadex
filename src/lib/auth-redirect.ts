export function getAppOrigin(fallbackOrigin: string) {
  return (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || fallbackOrigin).replace(/\/$/, "")
}

export function getAuthCallbackUrl(fallbackOrigin: string) {
  return `${getAppOrigin(fallbackOrigin)}/auth/callback`
}
