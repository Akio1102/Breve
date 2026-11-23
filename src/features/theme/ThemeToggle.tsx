import { Moon, Sun } from 'lucide-react'
import { useT } from '@/i18n/useT'
import { useAppStore } from '@/store/appStore'
import { IconButton } from '@/ui/Button'
import { useMediaQuery } from '@/ui/useMediaQuery'
import { nextTheme, resolveTheme } from './useTheme'

export function ThemeToggle() {
  const pref = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  useMediaQuery('(prefers-color-scheme: light)')
  const t = useT()
  const dark = resolveTheme(pref) === 'dark'
  const next = nextTheme(pref)
  const label =
    (dark ? t.prefs.toLight : t.prefs.toDark) +
    (next === 'system' ? t.prefs.systemHint : '')
  return (
    <IconButton tooltipAlign="end" label={label} onClick={() => setTheme(next)}>
      {dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </IconButton>
  )
}
