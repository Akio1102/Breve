import { clsx } from 'clsx'
import { FolderOpen } from 'lucide-react'
import { useRef } from 'react'
import { useOpenFile } from '@/files/useOpenFile'
import { useT } from '@/i18n/useT'

export function OpenFileButton({ compact }: { compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const open = useOpenFile()
  const t = useT()
  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        title={t.files.openHint}
        aria-label={compact ? t.files.open : undefined}
        className={clsx(
          'inline-flex items-center justify-center gap-1.5 rounded text-[13px] transition-colors hover:bg-surface-2',
          compact ? 'size-11' : 'h-8 border border-border px-2.5',
        )}
      >
        <FolderOpen size={compact ? 20 : 15} aria-hidden />
        {!compact && t.files.open}
      </button>
      <input
        ref={input}
        type="file"
        accept=".brv,.txt,text/plain"
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void open(f)
        }}
      />
    </>
  )
}
