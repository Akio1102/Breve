import type { AccionTraza, PasoTraza } from '@engine/types'
import {
  Calculator,
  CircleCheck,
  CircleStop,
  CircleX,
  CornerDownRight,
  Cpu,
  Equal,
  GitBranch,
  Keyboard,
  type LucideIcon,
  MessageSquare,
  OctagonX,
  Play,
  Printer,
  Repeat,
  Search,
  Sigma,
  SquarePlus,
  TextCursorInput,
  TriangleAlert,
} from 'lucide-react'

export const ACTION_CLASS: Partial<Record<AccionTraza, string>> = {
  insertar: 'text-ok',
  buscar: 'text-fn',
  operacion: 'text-kw',
  asignar: 'text-val',
  leer: 'text-str',
  mostrar: 'text-str',
  error: 'text-danger',
  advertencia: 'text-warn',
  copiar: 'text-val',
  calcular: 'text-kw',
  leerEntrada: 'text-str',
  escribir: 'text-str',
  saltar: 'text-fn',
  errorEjecucion: 'text-danger',
}

export const ACTION_ICON: Record<AccionTraza, LucideIcon> = {
  inicio: Play,
  insertar: SquarePlus,
  buscar: Search,
  operacion: Calculator,
  asignar: Equal,
  leer: Keyboard,
  mostrar: MessageSquare,
  condicion: GitBranch,
  repetir: Repeat,
  advertencia: TriangleAlert,
  error: CircleX,
  fin: CircleCheck,
  arranque: Cpu,
  copiar: Equal,
  calcular: Sigma,
  leerEntrada: TextCursorInput,
  escribir: Printer,
  saltar: CornerDownRight,
  terminar: CircleStop,
  errorEjecucion: OctagonX,
}

export interface GrupoTraza {
  id: number
  desde: number
  hasta: number
  linea: number
  instr: number
  especial: Extract<
    AccionTraza,
    'inicio' | 'fin' | 'arranque' | 'terminar'
  > | null
}

const ESPECIALES = new Set<AccionTraza>([
  'inicio',
  'fin',
  'arranque',
  'terminar',
])

export function agruparTraza(traza: readonly PasoTraza[]): GrupoTraza[] {
  const grupos: GrupoTraza[] = []
  traza.forEach((p, i) => {
    const especial = ESPECIALES.has(p.accion)
      ? (p.accion as GrupoTraza['especial'])
      : null
    const ultimo = grupos.at(-1)
    if (ultimo && !especial && !ultimo.especial && ultimo.instr === p.instr) {
      ultimo.hasta = i
      return
    }
    grupos.push({
      id: i,
      desde: i,
      hasta: i,
      linea: p.linea,
      instr: p.instr,
      especial,
    })
  })
  return grupos
}
