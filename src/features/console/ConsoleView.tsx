import { clsx } from 'clsx'
import { CircleX, Play } from 'lucide-react'
import { useT } from '@/i18n/useT'
import {
  currentEvent,
  currentExecution,
  isExecuted,
  isStale,
  tracedExecution,
  useAppStore,
} from '@/store/appStore'
import { outputText } from '@/store/selectors'
import { Button } from '@/ui/Button'

export function ConsoleView({ className }: { className?: string }) {
  const result = useAppStore((s) => (isStale(s) ? null : s.result))
  const executed = useAppStore((s) => !isStale(s) && isExecuted(s))
  const paso = useAppStore((s) =>
    s.traceKind === 'execution' ? currentEvent(s) : undefined,
  )
  const execution = useAppStore((s) =>
    paso ? tracedExecution(s) : currentExecution(s),
  )
  const run = useAppStore((s) => s.run)
  const t = useT()

  const message = (text: string, action?: React.ReactNode) => (
    <div
      className={clsx(
        'flex flex-col items-start gap-3 p-3 text-[13px] text-muted',
        className,
      )}
    >
      <p>{text}</p>
      {action}
    </div>
  )

  if (!result) return message(t.console.waiting)
  if (!result.ok) return message(t.console.compileFirst)
  if (!executed)
    return message(
      t.console.runFirst,
      <Button size="sm" icon={<Play size={14} aria-hidden />} onClick={run}>
        {t.header.run}
      </Button>,
    )
  if (!execution) return message(t.console.waiting)

  const hasta = paso?.salida
  const ultima = hasta ? execution.salida[hasta - 1] : undefined
  const text = outputText(
    execution.salida,
    ultima === undefined ? hasta : (hasta as number) - 1,
  )
  const err = paso && paso.accion !== 'errorEjecucion' ? null : execution.error
  return (
    <div className={clsx('flex min-h-0 flex-col', className)}>
      <pre
        role="log"
        aria-label={t.console.output}
        className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap"
      >
        {text}
        {ultima !== undefined && (
          <span key={hasta} className="block animate-enter">
            {ultima}
          </span>
        )}
        {!text && ultima === undefined && (
          <span className="text-muted">{t.console.noOutput}</span>
        )}
        {err && (
          <span className="mt-1 flex items-start gap-1.5 text-danger">
            <CircleX size={14} className="mt-0.5 shrink-0" aria-hidden />
            {t.console.runtimeError(err.mensaje, err.linea, err.cuadrupla)}
          </span>
        )}
      </pre>
      <p className="shrink-0 border-t border-border px-3 py-1 text-[11px] text-muted">
        {hasta === undefined
          ? t.console.executed(execution.instrucciones)
          : t.console.walking(hasta, execution.salida.length)}
      </p>
    </div>
  )
}
