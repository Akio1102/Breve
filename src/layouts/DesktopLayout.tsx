import { clsx } from 'clsx'
import { useEffect, useRef } from 'react'
import { DebugControls, StepCounter } from '@/features/debugger/DebugControls'
import { EditorPane } from '@/features/editor/EditorPane'
import { InputPanel } from '@/features/input/InputPanel'
import { PhaseBar } from '@/features/phases/PhaseBar'
import { Timeline } from '@/features/timeline/Timeline'
import { useT } from '@/i18n/useT'
import { useAppStore } from '@/store/appStore'
import { SplitPane } from '@/ui/SplitPane'
import { AppHeader } from './AppHeader'
import { BottomPanel } from './BottomPanel'
import { InspectorContainer } from './Inspector'
import { PHASE_TAB } from './phaseTabs'

function useDrawerFocus(
  drawer: React.RefObject<HTMLElement | null>,
  open: boolean,
) {
  const setInspectorOpen = useAppStore((s) => s.setInspectorOpen)
  useEffect(() => {
    if (!open) return
    const returnTo =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    drawer.current
      ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
      ?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      e.preventDefault()
      setInspectorOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (returnTo?.isConnected) returnTo.focus()
    }
  }, [drawer, open, setInspectorOpen])
}

export function DesktopLayout({ wide }: { wide: boolean }) {
  const inspectorOpen = useAppStore((s) => s.inspectorOpen)
  const setInspectorOpen = useAppStore((s) => s.setInspectorOpen)
  const setBottomTab = useAppStore((s) => s.setBottomTab)
  const drawer = useRef<HTMLDivElement>(null)
  const t = useT()
  useDrawerFocus(drawer, !wide && inspectorOpen)

  const editorAndPanel = (
    <SplitPane
      className="h-full"
      label={t.layout.resizeEditor}
      storageKey="compilador-split-editor"
      first={
        <div className="flex h-full flex-col">
          <EditorPane className="min-h-0 flex-1" />
          <InputPanel className="min-h-28 shrink-0 border-t border-border" />
        </div>
      }
      second={<BottomPanel className="h-full" />}
    />
  )

  return (
    <div className="flex h-full flex-col">
      <AppHeader showInspectorToggle={!wide} />
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-border bg-surface px-3 py-1.5">
        <PhaseBar onSelect={(p) => setBottomTab(PHASE_TAB[p])} />
        <div className="ml-auto flex items-center gap-3">
          <StepCounter />
          <DebugControls />
        </div>
      </div>
      <div className="shrink-0 border-b border-border bg-surface">
        <Timeline />
      </div>
      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        {wide ? (
          <SplitPane
            orientation="horizontal"
            className="min-w-0 flex-1"
            label={t.layout.resizeInspector}
            storageKey="compilador-split-inspector"
            initial={66}
            min={40}
            max={80}
            first={editorAndPanel}
            second={<InspectorContainer className="h-full" />}
          />
        ) : (
          <>
            <div className="min-w-0 flex-1">{editorAndPanel}</div>
            {inspectorOpen && (
              <div
                className="absolute inset-0 z-20 bg-scrim/50"
                onClick={() => setInspectorOpen(false)}
                aria-hidden
              />
            )}
            <div
              ref={drawer}
              id="inspector-drawer"
              className={clsx(
                'absolute inset-y-0 right-0 z-30 w-[min(460px,92vw)] border-l border-border transition-[translate,visibility] duration-200',
                inspectorOpen ? 'translate-x-0' : 'invisible translate-x-full',
              )}
            >
              <InspectorContainer className="h-full" />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
