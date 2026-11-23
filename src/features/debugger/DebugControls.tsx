import { clsx } from 'clsx'
import {
  ArrowDownToLine,
  Pause,
  Play,
  RotateCcw,
  StepBack,
  StepForward,
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { useT } from '@/i18n/useT'
import {
  activeTrace,
  canDebug,
  canRun,
  isStale,
  numeroDePaso,
  type Speed,
  totalDePasos,
  useAppStore,
} from '@/store/appStore'
import { Button, IconButton } from '@/ui/Button'
import { TraceKindToggle } from './TraceKindToggle'

const SPEEDS: Speed[] = ['slow', 'normal', 'fast']

export function StepCounter({ className }: { className?: string }) {
  const numero = useAppStore(numeroDePaso)
  const total = useAppStore(totalDePasos)
  const mode = useAppStore((s) => s.mode)
  const t = useT()
  if (mode !== 'run' || total === 0) return null
  return (
    <span
      className={clsx('font-mono text-xs text-muted tabular-nums', className)}
    >
      {t.debug.counter(numero, total)}
    </span>
  )
}

export function DebugControls({
  className,
  compact,
}: {
  className?: string
  compact?: boolean
}) {
  const ready = useAppStore(canDebug)
  const stale = useAppStore(isStale)
  const runnable = useAppStore((s) => s.traceKind === 'execution' && canRun(s))
  const startable = ready || stale || runnable
  const runMode = useAppStore((s) => s.mode === 'run')
  const firstStep = useAppStore((s) => s.step === 0)
  const lastStep = useAppStore((s) => s.step >= activeTrace(s).length - 1)
  const running = runMode && ready
  const atStart = firstStep || !running
  const atEnd = lastStep && running
  const playing = useAppStore((s) => s.playing)
  const speed = useAppStore((s) => s.speed)
  const actions = useAppStore(
    useShallow((s) => ({
      startDebugging: s.startDebugging,
      togglePlay: s.togglePlay,
      back: s.back,
      stepInto: s.stepInto,
      stepOver: s.stepOver,
      reset: s.reset,
      setSpeed: s.setSpeed,
    })),
  )
  const size = compact ? 20 : 18
  const t = useT()

  return (
    <div
      role="toolbar"
      aria-label={t.debug.toolbar}
      data-tour="controles"
      className={clsx('flex items-center gap-1', className)}
    >
      {!compact && <TraceKindToggle className="mr-1" />}
      {!running && !compact && (
        <Button
          variant="primary"
          size="sm"
          onClick={actions.startDebugging}
          disabled={!startable}
          className="mr-1"
        >
          {t.debug.debug}
        </Button>
      )}
      <IconButton
        label={playing ? t.debug.pause : t.debug.play}
        shortcut="F5"
        onClick={actions.togglePlay}
        disabled={!startable}
        variant={running && !compact ? 'secondary' : 'ghost'}
      >
        {playing ? (
          <Pause size={size} aria-hidden />
        ) : (
          <Play size={size} aria-hidden />
        )}
      </IconButton>
      <IconButton
        label={t.debug.back}
        shortcut="F8"
        onClick={actions.back}
        disabled={!ready || atStart}
      >
        <StepBack size={size} aria-hidden />
      </IconButton>
      <IconButton
        label={t.debug.stepInto}
        shortcut="F11"
        onClick={actions.stepInto}
        disabled={!ready || atEnd}
      >
        <ArrowDownToLine size={size} aria-hidden />
      </IconButton>
      <IconButton
        label={t.debug.stepOver}
        shortcut="F10"
        onClick={actions.stepOver}
        disabled={!ready || atEnd}
      >
        <StepForward size={size} aria-hidden />
      </IconButton>
      <IconButton
        label={t.debug.reset}
        onClick={actions.reset}
        disabled={!ready || atStart}
      >
        <RotateCcw size={size - 2} aria-hidden />
      </IconButton>
      {!compact && (
        <label className="ml-2 flex items-center gap-1.5 text-xs text-muted">
          <span>{t.debug.speed}</span>
          <select
            value={speed}
            onChange={(e) => actions.setSpeed(e.target.value as Speed)}
            className="h-8 rounded border border-border bg-surface px-1.5 text-xs text-text"
          >
            {SPEEDS.map((sp) => (
              <option key={sp} value={sp}>
                {t.debug.speeds[sp]}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
