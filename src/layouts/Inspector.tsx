import { clsx } from 'clsx'
import { StepCard } from '@/features/inspector/StepCard'
import { VariablesView } from '@/features/inspector/VariablesView'
import { MemoryView } from '@/features/memory/MemoryView'
import { WatchesView } from '@/features/watches/WatchesView'
import { useT } from '@/i18n/useT'
import { type SideTab, useAppStore } from '@/store/appStore'
import { TabPanel, Tabs } from '@/ui/Tabs'

export function InspectorContainer({ className }: { className?: string }) {
  const tab = useAppStore((s) => s.sideTab)
  const setTab = useAppStore((s) => s.setSideTab)
  const watchCount = useAppStore((s) => s.watches.length)
  const t = useT()
  const tabs: { id: SideTab; label: string }[] = [
    { id: 'vars', label: t.layout.tabs.vars },
    { id: 'mem', label: t.layout.tabs.mem },
    {
      id: 'watch',
      label: watchCount
        ? `${t.layout.tabs.watch} (${watchCount})`
        : t.layout.tabs.watch,
    },
  ]
  return (
    <aside
      aria-label={t.layout.inspector}
      data-tour="inspector"
      className={clsx('flex min-h-0 flex-col bg-surface', className)}
    >
      <div className="shrink-0 p-3 pb-2">
        <StepCard />
      </div>
      <Tabs
        items={tabs}
        value={tab}
        onChange={setTab}
        label={t.layout.inspector}
        idPrefix="side"
        className="shrink-0 border-b border-border px-2"
      />
      <TabPanel
        id={tab}
        tab={tab}
        idPrefix="side"
        className="min-h-0 flex-1 overflow-auto"
      >
        {tab === 'vars' && <VariablesView />}
        {tab === 'mem' && <MemoryView className="h-full" />}
        {tab === 'watch' && <WatchesView />}
      </TabPanel>
    </aside>
  )
}
