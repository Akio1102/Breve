import { useEffect } from 'react'
import { type ThemePref, useAppStore } from '@/store/appStore'

export function resolveTheme(pref: ThemePref): 'dark' | 'light' {
  if (pref !== 'system') return pref
  return typeof matchMedia === 'function' &&
    matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

export function nextTheme(pref: ThemePref): ThemePref {
  const target = resolveTheme(pref) === 'dark' ? 'light' : 'dark'
  return target === resolveTheme('system') ? 'system' : target
}

export function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.classList.toggle('light', theme === 'light')
}

export function useTheme() {
  const pref = useAppStore((s) => s.theme)
  useEffect(() => {
    applyTheme(resolveTheme(pref))
    if (pref !== 'system' || typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-color-scheme: light)')
    const onChange = () => applyTheme(resolveTheme('system'))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])
}
