import { CircleHelp } from 'lucide-react'
import { Suspense, useRef, useState } from 'react'
import { DebugControls, StepCounter } from '@/features/debugger/DebugControls'
import { EditorPane } from '@/features/editor/EditorPane'
import { ExportMenu } from '@/features/export/ExportMenu'
import { OpenFileButton } from '@/features/files/OpenFileButton'
import { InputPanel } from '@/features/input/InputPanel'
import { StepCard } from '@/features/inspector/StepCard'
import { VariablesView } from '@/features/inspector/VariablesView'
import { LangToggle } from '@/features/language/LangToggle'
import { MemoryView } from '@/features/memory/MemoryView'
import { PhaseBar } from '@/features/phases/PhaseBar'
import { ThemeToggle } from '@/features/theme/ThemeToggle'
import { Timeline } from '@/features/timeline/Timeline'
import { WatchesView } from '@/features/watches/WatchesView'
import { useT } from '@/i18n/useT'
import {
  type BottomTab,
  canDebug,
  errorCount,
  isRunning,
  isStale,
  type SideTab,
  useAppStore,
} from '@/store/appStore'
import { Button, IconButton } from '@/ui/Button'
import { TabPanel, Tabs } from '@/ui/Tabs'
import { CompileButton, ExamplesSelect, RunButton } from './AppHeader'
import { BottomTabContent, TabBadge } from './BottomPanel'
import { BOTTOM_TABS, PHASE_TAB } from './phaseTabs'

type MobileTab = SideTab | BottomTab

const TABS: MobileTab[] = [...BOTTOM_TABS, 'vars', 'mem', 'watch']

const isBottomTab = (t: MobileTab): t is BottomTab =>
  (BOTTOM_TABS as MobileTab[]).includes(t)

export function MobileLayout() {
  const [tab, setTab] = useState<MobileTab>('console')
  const tabs = useRef<HTMLDivElement>(null)
  const setTour = useAppStore((s) => s.setTour)
  const running = useAppStore(isRunning)
  const ready = useAppStore(canDebug)
  const stale = useAppStore(isStale)
  const errors = useAppStore(errorCount)
  const startDebugging = useAppStore((s) => s.startDebugging)
  const compile = useAppStore((s) => s.compile)
  const t = useT()

  const show = (next: MobileTab) => {
    setTab(next)
    tabs.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
  }

  let action: React.ReactNode
  if (running)
    action = (
      <>
        <DebugControls compact className="flex-1 justify-between" />
        <StepCounter className="sr-only" />
      </>
    )
  else if (stale)
    action = (
      <Button variant="primary" size="lg" className="w-full" onClick={compile}>
        {t.header.compile}
      </Button>
    )
  else if (ready)
    action = (
      <>
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={startDebugging}
        >
          {t.debug.debug}
        </Button>
        <RunButton className="flex-1" />
      </>
    )
  else if (errors)
    action = (
      <Button
        variant="danger"
        size="lg"
        className="w-full"
        onClick={() => show('problems')}
      >
        {t.layout.showErrors(errors)}
      </Button>
    )
  else
    action = (
      <Button variant="primary" size="lg" className="w-full" disabled>
        {t.debug.debug}
      </Button>
    )

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
        <h1 className="sr-only">{t.app.name}</h1>
        <ExamplesSelect />
        <CompileButton className="max-sm:hidden" />
        <div className="ml-auto flex items-center">
          <IconButton
            tooltipAlign="end"
            label={t.header.tour}
            onClick={() => setTour(0)}
          >
            <CircleHelp size={20} aria-hidden />
          </IconButton>
          <LangToggle />
          <ThemeToggle />
          <OpenFileButton compact />
          <ExportMenu compact />
        </div>
      </header>
      <PhaseBar
        className="shrink-0 border-b border-border px-2"
        onSelect={(p) => show(PHASE_TAB[p])}
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        <EditorPane
          compact
          className="h-[38svh] shrink-0 border-b border-border"
        />
        <InputPanel className="shrink-0 border-b border-border" />
        {running && <Timeline className="border-b border-border" />}
        <div className="p-3 pb-0">
          <StepCard />
        </div>
        <div ref={tabs} className="mt-1 scroll-mt-2">
          <Tabs<MobileTab>
            items={TABS.map((id) => ({
              id,
              label: t.layout.tabs[id],
              badge: isBottomTab(id) ? <TabBadge tab={id} /> : undefined,
            }))}
            value={tab}
            onChange={setTab}
            label={t.layout.inspector}
            idPrefix="mobile"
            className="overflow-x-auto border-b border-border px-1"
          />
        </div>
        <TabPanel id={tab} tab={tab} idPrefix="mobile" className="min-h-48">
          {tab === 'vars' && <VariablesView />}
          {tab === 'mem' && <MemoryView />}
          {tab === 'watch' && <WatchesView />}
          {isBottomTab(tab) && (
            <Suspense fallback={null}>
              <BottomTabContent tab={tab} />
            </Suspense>
          )}
        </TabPanel>
      </main>
      <nav
        aria-label={t.layout.debugging}
        className="fixed inset-x-0 bottom-0 z-10 flex items-center gap-1 border-t border-border bg-surface px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
      >
        {action}
      </nav>
    </div>
  )
}
