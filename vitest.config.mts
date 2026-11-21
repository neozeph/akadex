import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": "/src/test/server-only.ts",
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "e2e/**/*.test.ts"],
  },
})
