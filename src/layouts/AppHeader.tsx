import { clsx } from 'clsx'
import { CircleHelp, Hammer, Keyboard, PanelRight, Play } from 'lucide-react'
import { EXAMPLES } from '@/examples'
import { ExportMenu } from '@/features/export/ExportMenu'
import { OpenFileButton } from '@/features/files/OpenFileButton'
import { LangToggle } from '@/features/language/LangToggle'
import { ThemeToggle } from '@/features/theme/ThemeToggle'
import { useT } from '@/i18n/useT'
import { canRun, isExecuted, isStale, useAppStore } from '@/store/appStore'
import { Button, IconButton } from '@/ui/Button'

export function ExamplesSelect({ className }: { className?: string }) {
  const current = useAppStore(
    (s) =>
      EXAMPLES.find((e) => e.file === s.file && e.source === s.source)?.id ??
      '',
  )
  const loadFile = useAppStore((s) => s.loadFile)
  const t = useT()
  return (
    <label className={clsx('flex items-center', className)}>
      <span className="sr-only">{t.header.examples}</span>
      <select
        value={current}
        onChange={(e) => {
          const ex = EXAMPLES.find((x) => x.id === e.target.value)
          if (ex) loadFile(ex.file, ex.source, ex.inputs[0])
        }}
        className="h-8 max-w-48 rounded border border-border bg-surface px-1.5 text-[13px] text-text max-md:h-11"
      >
        <option value="" disabled>
          {t.header.examples}…
        </option>
        {EXAMPLES.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {t.header.exampleNames[ex.id]}
          </option>
        ))}
      </select>
    </label>
  )
}

export function CompileButton({ className }: { className?: string }) {
  const compile = useAppStore((s) => s.compile)
  const stale = useAppStore(isStale)
  const t = useT()
  return (
    <Button
      size="sm"
      variant={stale ? 'primary' : 'secondary'}
      icon={<Hammer size={14} aria-hidden />}
      onClick={compile}
      aria-keyshortcuts="Control+Enter"
      title="Ctrl+Enter"
      className={clsx('max-md:h-11', className)}
    >
      {t.header.compile}
    </Button>
  )
}

export function RunButton({ className }: { className?: string }) {
  const run = useAppStore((s) => s.run)
  const enabled = useAppStore(canRun)
  const fresh = useAppStore((s) => !isStale(s) && isExecuted(s))
  const t = useT()
  return (
    <Button
      size="sm"
      variant={enabled && !fresh ? 'primary' : 'secondary'}
      icon={<Play size={14} aria-hidden />}
      onClick={run}
      disabled={!enabled}
      aria-keyshortcuts="Control+Shift+Enter"
      title={enabled ? 'Ctrl+Shift+Enter' : t.header.runDisabled}
      className={clsx('max-md:h-11', className)}
    >
      {t.header.run}
    </Button>
  )
}

export function AppHeader({
  showInspectorToggle,
}: {
  showInspectorToggle?: boolean
}) {
  const setTour = useAppStore((s) => s.setTour)
  const setHelpOpen = useAppStore((s) => s.setHelpOpen)
  const inspectorOpen = useAppStore((s) => s.inspectorOpen)
  const setInspectorOpen = useAppStore((s) => s.setInspectorOpen)
  const t = useT()
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface px-3">
      <h1 className="truncate text-sm font-medium">{t.app.name}</h1>
      <ExamplesSelect className="ml-2" />
      <CompileButton />
      <RunButton />
      <div className="ml-auto flex items-center gap-1">
        <IconButton label={t.header.tour} onClick={() => setTour(0)}>
          <CircleHelp size={18} aria-hidden />
        </IconButton>
        <IconButton
          label={t.header.shortcuts}
          shortcut="?"
          onClick={() => setHelpOpen(true)}
        >
          <Keyboard size={18} aria-hidden />
        </IconButton>
        <LangToggle />
        <ThemeToggle />
        <OpenFileButton />
        <ExportMenu />
        {showInspectorToggle && (
          <IconButton
            tooltipAlign="end"
            label={
              inspectorOpen ? t.header.hideInspector : t.header.showInspector
            }
            active={inspectorOpen}
            onClick={() => setInspectorOpen(!inspectorOpen)}
            aria-expanded={inspectorOpen}
            aria-controls="inspector-drawer"
          >
            <PanelRight size={18} aria-hidden />
          </IconButton>
        )}
      </div>
    </header>
  )
}
