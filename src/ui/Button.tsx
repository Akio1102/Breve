import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:opacity-85',
  secondary: 'text-text border border-border hover:bg-surface-2',
  ghost: 'text-text hover:bg-surface-2',
  danger: 'text-danger border border-danger/40 hover:bg-danger/10',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5',
  md: 'h-9 px-3 text-sm gap-2',
  lg: 'h-11 px-4 text-sm gap-2',
}

const ICON_SIZES = {
  sm: 'size-7 max-md:size-11',
  md: 'size-9 max-md:size-11',
} as const
const ACTIVE = 'bg-surface-2 text-text'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  shortcut?: string
  variant?: Variant
  active?: boolean
  size?: keyof typeof ICON_SIZES
  tooltipAlign?: 'center' | 'end'
}

export function IconButton({
  label,
  shortcut,
  variant = 'ghost',
  active,
  size = 'md',
  tooltipAlign = 'center',
  className,
  children,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      aria-keyshortcuts={shortcut}
      aria-pressed={active}
      className={clsx(
        'group relative inline-flex shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        ICON_SIZES[size],
        active ? ACTIVE : VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {children}
      <span
        role="tooltip"
        className={clsx(
          'pointer-events-none absolute top-full z-50 mt-1.5 hidden whitespace-nowrap rounded border border-muted/40 bg-raised px-2 py-1 font-sans text-xs text-text group-hover:block group-focus-visible:block',
          tooltipAlign === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2',
        )}
      >
        {label}
        {shortcut && (
          <kbd className="ml-1.5 font-mono text-muted">{shortcut}</kbd>
        )}
      </span>
    </button>
  )
}
