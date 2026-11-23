import type { Fase } from '@engine/types'
import type { BottomTab } from '@/store/appStore'

export const PHASE_TAB: Record<Fase, BottomTab> = {
  lexico: 'tokens',
  sintactico: 'ast',
  semantico: 'symbols',
  intermedio: 'intermediate',
  ejecucion: 'console',
}

export const BOTTOM_TABS: BottomTab[] = [
  'console',
  'tokens',
  'ast',
  'symbols',
  'intermediate',
  'problems',
  'warnings',
  'trace',
]
