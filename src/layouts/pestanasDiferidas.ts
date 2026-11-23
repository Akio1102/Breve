import { ArbolDelPaso } from '@/features/inspector/arbolDiferido'
import { cargaDiferida } from '@/ui/cargaDiferida'

export const TokensView = cargaDiferida(() =>
  import('@/features/tokens/TokensView').then((m) => m.TokensView),
)
export const AstView = cargaDiferida(() =>
  import('@/features/ast/AstView').then((m) => m.AstView),
)
export const SymbolsView = cargaDiferida(() =>
  import('@/features/symbols/SymbolsView').then((m) => m.SymbolsView),
)
export const IntermediateView = cargaDiferida(() =>
  import('@/features/intermediate/IntermediateView').then(
    (m) => m.IntermediateView,
  ),
)
export const TraceView = cargaDiferida(() =>
  import('@/features/trace/TraceView').then((m) => m.TraceView),
)

const TODAS = [
  TokensView,
  AstView,
  SymbolsView,
  IntermediateView,
  TraceView,
  ArbolDelPaso,
]

export function precargarPestanas(): Promise<unknown> {
  return Promise.all(TODAS.map((c) => c.precargar()))
}
