import { useT } from '@/i18n/useT'
import { TRACE_KINDS, useAppStore } from '@/store/appStore'
import { Segmented } from '@/ui/Segmented'

export function TraceKindToggle({ className }: { className?: string }) {
  const kind = useAppStore((s) => s.traceKind)
  const setKind = useAppStore((s) => s.setTraceKind)
  const t = useT()
  return (
    <Segmented
      legend={t.debug.traceKind}
      value={kind}
      onChange={setKind}
      className={className}
      items={TRACE_KINDS.map((k) => ({
        id: k,
        label: t.debug.traceKinds[k],
        title: t.debug.traceKindHint[k],
      }))}
    />
  )
}
