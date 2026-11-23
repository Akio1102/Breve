import { clsx } from 'clsx'

export interface SegmentedItem<T extends string> {
  id: T
  label: string
  title?: string
}

export function Segmented<T extends string>({
  items,
  value,
  onChange,
  legend,
  className,
}: {
  items: SegmentedItem<T>[]
  value: T
  onChange(id: T): void
  legend: string
  className?: string
}) {
  return (
    <fieldset
      className={clsx(
        'flex items-center rounded-md border border-border p-0.5',
        className,
      )}
    >
      <legend className="sr-only">{legend}</legend>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          aria-pressed={value === it.id}
          onClick={() => onChange(it.id)}
          title={it.title}
          className={clsx(
            'rounded px-2 py-0.5 text-xs whitespace-nowrap max-md:min-h-9',
            value === it.id
              ? 'bg-surface-2 text-text'
              : 'text-muted hover:text-text',
          )}
        >
          {it.label}
        </button>
      ))}
    </fieldset>
  )
}
