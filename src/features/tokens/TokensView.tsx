import { formatValor, tokenText } from '@engine/formato'
import type { TipoToken, Token } from '@engine/types'
import { clsx } from 'clsx'
import { memo, type Ref, useRef } from 'react'
import { useT } from '@/i18n/useT'
import { currentEvent, useAppStore } from '@/store/appStore'
import { EMPTY } from '@/store/selectors'
import { EmptyState } from '@/ui/Badge'
import { useVirtualRows } from '@/ui/useVirtualRows'
import { SpacerRow } from '@/ui/VirtualSpacer'

type Group = 'reservada' | 'tipo' | 'literal' | 'id' | 'operador' | 'salto'

const GROUP: Record<TipoToken, Group> = {
  VA: 'reservada',
  CN: 'reservada',
  LEE: 'reservada',
  DI: 'reservada',
  SI: 'reservada',
  NO: 'reservada',
  REP: 'reservada',
  T_ENT: 'tipo',
  T_DEC: 'tipo',
  T_TXT: 'tipo',
  T_BOOL: 'tipo',
  VERDADERO: 'literal',
  FALSO: 'literal',
  ENTERO: 'literal',
  DECIMAL: 'literal',
  CADENA: 'literal',
  ID: 'id',
  IGUAL: 'operador',
  COMA: 'operador',
  MAS: 'operador',
  MENOS: 'operador',
  POR: 'operador',
  ENTRE: 'operador',
  PAR_ABRE: 'operador',
  PAR_CIERRA: 'operador',
  COMP: 'operador',
  SALTO: 'salto',
}

const GROUP_CLASS: Record<Group, string> = {
  reservada: 'text-kw',
  tipo: 'text-fn',
  literal: 'text-num',
  id: 'text-text',
  operador: 'text-op',
  salto: 'text-muted/70',
}

const TokenRow = memo(function TokenRow({
  n,
  token,
  current,
  onSelect,
  ref,
}: {
  n: number
  token: Token
  current: boolean
  onSelect(line: number, col: number): void
  ref?: Ref<HTMLTableRowElement>
}) {
  const t = useT()
  const group = GROUP[token.tipo]
  return (
    <tr
      ref={ref}
      data-index={n - 1}
      aria-rowindex={n + 1}
      className={clsx(
        'border-b border-border/60 hover:bg-surface-2',
        current && 'bg-surface-2/70',
      )}
    >
      <td className="px-2 py-1 text-right text-muted tabular-nums">{n}</td>
      <td className="px-2 py-1">
        <span className={clsx('font-medium', GROUP_CLASS[group])}>
          {t.tokens.names[token.tipo]}
        </span>
        <span className="ml-2 text-[11px] text-muted max-sm:hidden">
          {t.tokens.groups[group]}
        </span>
      </td>
      <td className="px-2 py-1">
        <button
          type="button"
          onClick={() => onSelect(token.linea, token.columna)}
          className="rounded px-1 hover:underline"
        >
          {tokenText(token)}
        </button>
      </td>
      <td className="px-2 py-1 text-val">
        {token.valor === undefined ? '' : formatValor(token.valor)}
      </td>
      <td className="px-2 py-1 text-right tabular-nums">{token.linea}</td>
      <td className="px-2 py-1 text-right tabular-nums">{token.columna}</td>
    </tr>
  )
})

export function TokensView({ className }: { className?: string }) {
  const tokens = useAppStore((s) => s.result?.tokens ?? EMPTY)
  const currentLine = useAppStore((s) => currentEvent(s)?.linea)
  const focusLine = useAppStore((s) => s.focusLine)
  const t = useT()
  const scroll = useRef<HTMLDivElement>(null)
  const rows = useVirtualRows({
    count: tokens.length,
    scrollRef: scroll,
    estimate: 25,
  })

  if (tokens.length === 0) return <EmptyState>{t.tokens.empty}</EmptyState>

  const c = t.tokens.columns
  return (
    <div ref={scroll} className={clsx('overflow-auto', className)}>
      <table
        aria-label={t.tokens.label}
        aria-rowcount={tokens.length + 1}
        className="w-full border-collapse font-mono text-xs"
      >
        <thead className="sticky top-0 bg-surface text-left text-[11px] text-muted">
          <tr className="border-b border-border" aria-rowindex={1}>
            <th className="px-2 py-1.5 text-right font-normal">{c.n}</th>
            <th className="px-2 py-1.5 font-normal">{c.tipo}</th>
            <th className="px-2 py-1.5 font-normal">{c.lexema}</th>
            <th className="px-2 py-1.5 font-normal">{c.valor}</th>
            <th className="px-2 py-1.5 text-right font-normal">{c.linea}</th>
            <th className="px-2 py-1.5 text-right font-normal">{c.columna}</th>
          </tr>
        </thead>
        <tbody>
          <SpacerRow height={rows.antes} cols={6} />
          {rows.indices.map((i) => (
            <TokenRow
              key={i}
              ref={rows.medir}
              n={i + 1}
              token={tokens[i]}
              current={tokens[i].linea === currentLine}
              onSelect={focusLine}
            />
          ))}
          <SpacerRow height={rows.despues} cols={6} />
        </tbody>
      </table>
      <p className="px-2 py-1.5 text-[11px] text-muted">
        {t.tokens.count(tokens.length)}
      </p>
    </div>
  )
}
