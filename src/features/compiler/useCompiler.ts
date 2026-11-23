import { useEffect } from 'react'
import { isStale, useAppStore } from '@/store/appStore'

export const AUTO_COMPILE_MS = 350

export const AUTO_COMPILE_MAX_CHARS = 120_000

export function useCompiler() {
  useEffect(() => {
    const s = useAppStore.getState()
    if (isStale(s)) s.compile()

    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = useAppStore.subscribe((state, prev) => {
      if (state.source === prev.source) return
      clearTimeout(timer)
      if (state.source.length > AUTO_COMPILE_MAX_CHARS) return
      timer = setTimeout(() => {
        const now = useAppStore.getState()
        if (isStale(now) && now.mode === 'edit') now.compile()
      }, AUTO_COMPILE_MS)
    })
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [])
}
