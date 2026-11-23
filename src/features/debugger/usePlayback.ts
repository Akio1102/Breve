import { useEffect } from 'react'
import { SPEED_MS, useAppStore } from '@/store/appStore'

export function usePlayback() {
  const playing = useAppStore((s) => s.playing)
  const speed = useAppStore((s) => s.speed)
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => useAppStore.getState().tick(), SPEED_MS[speed])
    return () => clearInterval(id)
  }, [playing, speed])
}
