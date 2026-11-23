import { clsx } from 'clsx'
import { type DragEvent, lazy, Suspense, useState } from 'react'
import { llevaArchivos } from '@/files/openFile'
import { useOpenFile } from '@/files/useOpenFile'
import { useT } from '@/i18n/useT'
import { isStale, useAppStore } from '@/store/appStore'

const CodeEditor = lazy(() => import('./CodeEditor'))

function EditorFallback() {
  const source = useAppStore((s) => s.source)
  return (
    <pre
      aria-busy="true"
      className="h-full overflow-auto bg-editor p-3 pl-14 font-mono text-sm leading-[1.6] text-muted"
    >
      {source}
    </pre>
  )
}

export function EditorPane({
  className,
  compact,
}: {
  className?: string
  compact?: boolean
}) {
  const file = useAppStore((s) => s.file)
  const stale = useAppStore(isStale)
  const notice = useAppStore((s) => s.fileNotice)
  const open = useOpenFile()
  const [dragging, setDragging] = useState(false)
  const t = useT()

  const sobre = (e: DragEvent) => {
    if (!llevaArchivos(e.dataTransfer)) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    setDragging(true)
  }
  const soltar = (e: DragEvent) => {
    if (!llevaArchivos(e.dataTransfer)) return
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) void open(f)
  }

  return (
    <section
      aria-label={t.editor.label}
      data-tour="editor"
      className={clsx('relative flex min-h-0 flex-col bg-editor', className)}
      onDragOverCapture={sobre}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setDragging(false)
      }}
      onDropCapture={soltar}
    >
      {!compact && (
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3 text-[13px]">
          <span className="font-mono">{file}</span>
          {stale && <span className="text-xs text-warn">{t.editor.stale}</span>}
        </div>
      )}
      {notice && (
        <p
          role="alert"
          className="shrink-0 border-b border-danger/40 bg-danger/10 px-3 py-1 text-xs text-danger"
        >
          {notice}
        </p>
      )}
      {dragging && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center border-2 border-dashed border-accent bg-bg/80 text-sm font-medium"
        >
          {t.files.dropHint}
        </div>
      )}
      <div className="min-h-0 flex-1">
        <Suspense fallback={<EditorFallback />}>
          <CodeEditor className="h-full" />
        </Suspense>
      </div>
    </section>
  )
}
