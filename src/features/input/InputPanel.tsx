import { clsx } from 'clsx'
import { useId } from 'react'
import { exampleFor, inputLabel } from '@/examples'
import { useT } from '@/i18n/useT'
import { useAppStore } from '@/store/appStore'

export function InputPanel({ className }: { className?: string }) {
  const input = useAppStore((s) => s.input)
  const setInput = useAppStore((s) => s.setInput)
  const run = useAppStore((s) => s.run)
  const source = useAppStore((s) => s.source)
  const presets = exampleFor(source)?.inputs.filter(Boolean) ?? []
  const id = useId()
  const t = useT()

  return (
    <section
      aria-labelledby={id}
      data-tour="entrada"
      className={clsx('flex min-h-0 flex-col bg-surface', className)}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 px-3 pt-1.5">
        <label id={id} htmlFor={`${id}-ta`} className="text-xs text-muted">
          {t.input.label}
        </label>
        {presets.length > 0 && (
          <fieldset className="ml-auto flex flex-wrap gap-1">
            <legend className="sr-only">{t.input.presets}</legend>
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setInput(p)}
                aria-pressed={p === input}
                title={t.input.usePreset}
                className={clsx(
                  'rounded border px-1.5 py-0.5 font-mono text-[11px] transition-colors max-md:min-h-9',
                  p === input
                    ? 'border-text text-text'
                    : 'border-border text-muted hover:text-text',
                )}
              >
                {inputLabel(p)}
              </button>
            ))}
          </fieldset>
        )}
      </div>
      <textarea
        id={`${id}-ta`}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            run()
          }
        }}
        spellCheck={false}
        placeholder={t.input.placeholder}
        aria-keyshortcuts="Control+Enter"
        className="min-h-16 flex-1 resize-none bg-transparent px-3 py-1.5 font-mono text-[13px] leading-relaxed text-text outline-none placeholder:text-muted/70"
      />
    </section>
  )
}
