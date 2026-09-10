import { Monitor, Moon, Sun } from 'lucide-react'

import { useTheme, type ThemePreference } from '@/context/ThemeContext'

const nextPreference: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { preference, resolvedTheme, setPreference } = useTheme()
  const Icon = preference === 'system' ? Monitor : preference === 'dark' ? Moon : Sun
  const label = preference === 'system'
    ? `Appearance follows device (${resolvedTheme})`
    : `${preference[0].toUpperCase()}${preference.slice(1)} appearance`

  return (
    <button
      type="button"
      className={`dh-theme-toggle ${className}`.trim()}
      onClick={() => setPreference(nextPreference[preference])}
      aria-label={`${label}. Switch to ${nextPreference[preference]} mode.`}
      title={`${label} · switch to ${nextPreference[preference]}`}
    >
      <Icon aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </button>
  )
}
