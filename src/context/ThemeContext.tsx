/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'digitalhood-theme-preference-v1'
const COOKIE_KEY = 'digitalhood_theme'

function isPreference(value: string | null | undefined): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

function readCookiePreference() {
  if (typeof document === 'undefined') return null
  const value = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${COOKIE_KEY}=`))
    ?.split('=')[1]
  return isPreference(value) ? value : null
}

function readPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const cookiePreference = readCookiePreference()
  if (cookiePreference) return cookiePreference
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isPreference(stored)) return stored
  } catch {
    // Storage can be unavailable in strict privacy mode; the cookie remains a fallback.
  }
  return 'system'
}

function persistPreference(preference: ThemePreference) {
  try {
    window.localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // Applying the selected theme still works for this page when storage is unavailable.
  }

  const sharedDomain = window.location.hostname === 'digitalhood.info' || window.location.hostname.endsWith('.digitalhood.info')
  document.cookie = `${COOKIE_KEY}=${preference}; Path=/; Max-Age=31536000; SameSite=Lax${sharedDomain ? '; Domain=.digitalhood.info; Secure' : ''}`
}

type ThemeContextValue = {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference)
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    media.addEventListener?.('change', handleChange)
    return () => media.removeEventListener?.('change', handleChange)
  }, [])

  const resolvedTheme: ResolvedTheme = preference === 'system'
    ? systemDark ? 'dark' : 'light'
    : preference

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = resolvedTheme
    root.dataset.themePreference = preference
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.style.colorScheme = resolvedTheme
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', resolvedTheme === 'dark' ? '#090d16' : '#26248c')
  }, [preference, resolvedTheme])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && isPreference(event.newValue)) {
        setPreferenceState(event.newValue)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    const syncSharedPreference = () => setPreferenceState(readPreference())
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncSharedPreference()
    }
    window.addEventListener('focus', syncSharedPreference)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('focus', syncSharedPreference)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const setPreference = (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference)
    persistPreference(nextPreference)
  }

  const value = useMemo(() => ({ preference, resolvedTheme, setPreference }), [preference, resolvedTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used within ThemeProvider')
  return value
}
