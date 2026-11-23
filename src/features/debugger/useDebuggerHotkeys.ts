import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'

const FORM_FIELD = 'input, textarea, select'
const TYPING = `${FORM_FIELD}, [contenteditable="true"]`

export function useDebuggerHotkeys(scope: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useAppStore.getState()
      if (s.tourStep !== null || s.helpOpen) return
      const target = e.target as Node | null
      const inScope =
        !target || target === document.body || !!scope.current?.contains(target)
      if (!inScope) return
      const el = target instanceof Element ? target : null
      const inField = !!el?.closest(FORM_FIELD)
      const typing = !!el?.closest(TYPING)
      let action: (() => void) | null = null
      if (e.key === 'F5' && !e.shiftKey) action = s.togglePlay
      else if (e.key === 'F10') action = s.stepOver
      else if (e.key === 'F11') action = s.stepInto
      else if (e.key === 'F8') action = s.back
      else if (
        e.key === 'Enter' &&
        (e.ctrlKey || e.metaKey) &&
        !inField &&
        !e.defaultPrevented
      )
        action = e.shiftKey ? s.run : s.compile
      else if (e.key === '?' && !typing && !e.ctrlKey && !e.metaKey)
        action = () => s.setHelpOpen(true)
      if (!action) return
      e.preventDefault()
      action()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [scope])
}
