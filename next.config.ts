import type { NextConfig } from "next";

import { authenticatedNoStoreHeader, securityHeaders } from "./src/lib/security-headers"

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      ...["dashboard", "tasks", "semesters", "pomodoro", "analytics", "settings"].map((route) => ({
        source: `/${route}/:path*`,
        headers: [authenticatedNoStoreHeader],
      })),
      {
        source: "/auth/callback",
        headers: [authenticatedNoStoreHeader],
      },
      {
        source: "/update-password",
        headers: [authenticatedNoStoreHeader],
      },
    ]
  },
};

export default nextConfig;
