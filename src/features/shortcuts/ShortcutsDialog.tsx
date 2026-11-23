import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useT } from '@/i18n/useT'
import { useAppStore } from '@/store/appStore'
import { IconButton } from '@/ui/Button'

export default function ShortcutsDialog() {
  const setHelpOpen = useAppStore((s) => s.setHelpOpen)
  const ref = useRef<HTMLDialogElement>(null)
  const t = useT()

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal?.()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby="shortcuts-title"
      onClose={() => setHelpOpen(false)}
      className="m-auto w-[min(420px,calc(100vw-2rem))] rounded-lg border border-muted/40 bg-raised p-4 text-text shadow-xl shadow-black/20 backdrop:bg-scrim"
    >
      <div className="mb-3 flex items-center gap-2">
        <h2 id="shortcuts-title" className="flex-1 text-sm font-medium">
          {t.shortcuts.title}
        </h2>
        <IconButton
          label={t.shortcuts.close}
          tooltipAlign="end"
          onClick={() => ref.current?.close()}
        >
          <X size={16} aria-hidden />
        </IconButton>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
        {t.shortcuts.items.map(({ keys, desc }) => (
          <div key={keys} className="contents">
            <dt>
              <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
                {keys}
              </kbd>
            </dt>
            <dd className="text-muted">{desc}</dd>
          </div>
        ))}
      </dl>
    </dialog>
  )
}
