import { useT } from '@/i18n/useT'
import { activeTrace, useAppStore } from '@/store/appStore'

export function StepAnnouncer() {
  const t = useT()
  const text = useAppStore((s) => {
    if (s.mode !== 'run' || s.playing) return ''
    const e = activeTrace(s)[s.step]
    if (!e) return ''
    const what = e.resultado ? `${e.detalle} → ${e.resultado}` : e.detalle
    return t.debug.announce(s.step + 1, e.linea, what)
  })
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {text}
    </div>
  )
}
