import { clsx } from 'clsx'
import { Suspense } from 'react'
import { ConsoleView } from '@/features/console/ConsoleView'
import { ProblemsView, WarningsView } from '@/features/problems/ProblemsView'
import { useT } from '@/i18n/useT'
import {
  type BottomTab,
  errorCount,
  useAppStore,
  warningCount,
} from '@/store/appStore'
import { Badge } from '@/ui/Badge'
import { TabPanel, Tabs } from '@/ui/Tabs'
import {
  AstView,
  IntermediateView,
  SymbolsView,
  TokensView,
  TraceView,
} from './pestanasDiferidas'
import { BOTTOM_TABS } from './phaseTabs'

export function ProblemsBadge() {
  const n = useAppStore(errorCount)
  if (n === 0) return null
  return <Badge tone="danger">{n}</Badge>
}

export function WarningsBadge() {
  const n = useAppStore(warningCount)
  if (n === 0) return null
  return <Badge tone="warn">{n}</Badge>
}

export function TabBadge({ tab }: { tab: BottomTab }) {
  if (tab === 'problems') return <ProblemsBadge />
  if (tab === 'warnings') return <WarningsBadge />
  return null
}

export function BottomTabContent({
  tab,
  className,
}: {
  tab: BottomTab
  className?: string
}) {
  switch (tab) {
    case 'console':
      return <ConsoleView className={className} />
    case 'tokens':
      return <TokensView className={className} />
    case 'ast':
      return <AstView className={className} />
    case 'symbols':
      return <SymbolsView className={className} />
    case 'intermediate':
      return <IntermediateView className={className} />
    case 'problems':
      return <ProblemsView className={className} />
    case 'warnings':
      return <WarningsView className={className} />
    case 'trace':
      return <TraceView className={className} />
  }
}

export function BottomPanel({ className }: { className?: string }) {
  const tab = useAppStore((s) => s.bottomTab)
  const setTab = useAppStore((s) => s.setBottomTab)
  const t = useT()

  const items = BOTTOM_TABS.map((id) => ({
    id,
    label: t.layout.tabs[id],
    badge: <TabBadge tab={id} />,
  }))

  return (
    <section
      aria-label={t.layout.bottomPanel}
      data-tour="panel-inferior"
      className={clsx('flex min-h-0 flex-col bg-surface', className)}
    >
      <Tabs
        items={items}
        value={tab}
        onChange={setTab}
        label={t.layout.bottomPanel}
        idPrefix="bottom"
        className="shrink-0 overflow-x-auto border-b border-border px-1"
      />
      <TabPanel
        id={tab}
        tab={tab}
        idPrefix="bottom"
        className="min-h-0 flex-1 overflow-hidden"
      >
        <Suspense fallback={null}>
          <BottomTabContent tab={tab} className="h-full" />
        </Suspense>
      </TabPanel>
    </section>
  )
}
