import { lazy, Suspense, useEffect, useRef } from 'react'
import { useCompiler } from '@/features/compiler/useCompiler'
import { StepAnnouncer } from '@/features/debugger/StepAnnouncer'
import { useDebuggerHotkeys } from '@/features/debugger/useDebuggerHotkeys'
import { usePlayback } from '@/features/debugger/usePlayback'
import { useTheme } from '@/features/theme/useTheme'
import { useDocumentLang } from '@/i18n/useT'
import { DesktopLayout } from '@/layouts/DesktopLayout'
import { MobileLayout } from '@/layouts/MobileLayout'
import { precargarPestanas } from '@/layouts/pestanasDiferidas'
import { useAppStore } from '@/store/appStore'
import { ErrorBoundary } from '@/ui/ErrorBoundary'
import { useMediaQuery } from '@/ui/useMediaQuery'

const Tour = lazy(() => import('@/features/tour/Tour'))
const ShortcutsDialog = lazy(
  () => import('@/features/shortcuts/ShortcutsDialog'),
)

function AppContent() {
  const root = useRef<HTMLDivElement>(null)
  useCompiler()
  useTheme()
  useDocumentLang()
  usePlayback()
  useDebuggerHotkeys(root)
  useEffect(() => {
    const precargar = () => void precargarPestanas()
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(precargar, { timeout: 2000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(precargar, 500)
    return () => clearTimeout(id)
  }, [])

  const wide = useMediaQuery('(min-width: 1280px)')
  const tablet = useMediaQuery('(min-width: 768px) and (min-height: 560px)')
  const tourOpen = useAppStore((s) => s.tourStep !== null)
  const helpOpen = useAppStore((s) => s.helpOpen)

  return (
    <div ref={root} className="h-full">
      {tablet ? <DesktopLayout wide={wide} /> : <MobileLayout />}
      <StepAnnouncer />
      {tourOpen && (
        <Suspense fallback={null}>
          <Tour />
        </Suspense>
      )}
      {helpOpen && (
        <Suspense fallback={null}>
          <ShortcutsDialog />
        </Suspense>
      )}
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}
