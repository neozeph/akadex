"use client"

import * as React from "react"

type Theme = "light" | "dark"
type ThemeMode = Theme | "system"

type ThemeContextValue = {
  theme: ThemeMode
  resolvedTheme: Theme
  mounted: boolean
  setTheme: (theme: ThemeMode) => void
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

function getSystemTheme() {
  if (typeof window === "undefined") {
    return "light" as Theme
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return
  }

  const resolvedTheme = theme === "system" ? getSystemTheme() : theme
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
  document.documentElement.style.colorScheme = resolvedTheme
}

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [theme, setThemeState] = React.useState<ThemeMode>("system")
  const [systemTheme, setSystemTheme] = React.useState<Theme>("light")
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const storedTheme = window.localStorage.getItem("theme") as ThemeMode | null
    const initialTheme = storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
      ? storedTheme
      : "system"

    const frame = window.requestAnimationFrame(() => {
      setThemeState(initialTheme)
      setSystemTheme(getSystemTheme())
      setMounted(true)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    applyTheme(theme)
    window.localStorage.setItem("theme", theme)
  }, [theme])

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      setSystemTheme(getSystemTheme())
      if (theme === "system") {
        applyTheme("system")
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme])

  const resolvedTheme = theme === "system" ? systemTheme : theme

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      mounted,
      setTheme: setThemeState,
    }),
    [mounted, resolvedTheme, theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}
