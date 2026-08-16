type Header = {
  key: string
  value: string
}

function originFromUrl(value: string | undefined) {
  if (!value) {
    return null
  }

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

const supabaseOrigin = originFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
const isProductionHttpsDeployment = process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production"

export function createContentSecurityPolicy(isProduction = process.env.NODE_ENV === "production") {
  const connectSrc = [
    "'self'",
    ...(supabaseOrigin ? [supabaseOrigin] : []),
    ...(!isProduction ? ["http://localhost:*", "http://127.0.0.1:*", "ws://localhost:*", "ws://127.0.0.1:*"] : []),
  ]

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    ...(supabaseOrigin ? [supabaseOrigin] : []),
  ]

  const scriptSrc = [
    "'self'",
    // Next.js App Router emits inline bootstrap / RSC payload scripts unless a
    // nonce-based CSP architecture is introduced across the render pipeline.
    "'unsafe-inline'",
    ...(!isProduction ? ["'unsafe-eval'"] : []),
  ]

  const styleSrc = [
    "'self'",
    // Tailwind/Next theme and style hydration currently rely on inline styles.
    "'unsafe-inline'",
  ]

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    `style-src ${styleSrc.join(" ")}`,
    `img-src ${imgSrc.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ")
}

export const contentSecurityPolicy = createContentSecurityPolicy(isProductionHttpsDeployment)

export function createSecurityHeaders(isProduction = isProductionHttpsDeployment): Header[] {
  return [
  {
    key: "Content-Security-Policy",
    value: createContentSecurityPolicy(isProduction),
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000",
        },
      ]
    : []),
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "magnetometer=()",
      "gyroscope=()",
      "accelerometer=()",
      "browsing-topics=()",
    ].join(", "),
  },
  ]
}

export const securityHeaders = createSecurityHeaders(isProductionHttpsDeployment)

export const authenticatedNoStoreHeader: Header = {
  key: "Cache-Control",
  value: "private, no-store",
}
