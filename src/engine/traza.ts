import type { PasoTraza, Simbolo } from './types'

export const CADA = 64

function aplicar(tabla: readonly Simbolo[], cambios: readonly Simbolo[]) {
  if (cambios.length === 0) return tabla as Simbolo[]
  const nueva = tabla.slice()
  for (const s of cambios) nueva[s.numero - 1] = s
  return nueva
}

export class TrazaTabla {
  private readonly cambios: (readonly Simbolo[])[] = []
  private readonly puntos = new Map<number, Simbolo[]>()
  private recientes: [number, Simbolo[]][] = []

  agregar(cambios: readonly Simbolo[]): number {
    this.cambios.push(cambios)
    return this.cambios.length - 1
  }

  tablaEn(k: number): Simbolo[] {
    const reciente = this.recientes.find(([i]) => i === k)
    if (reciente) return reciente[1]

    const base = Math.floor(k / CADA) * CADA
    let tabla = this.punto(base)
    for (let i = base + 1; i <= k; i++) tabla = aplicar(tabla, this.cambios[i])

    this.recientes = [[k, tabla], ...this.recientes.slice(0, 1)]
    return tabla
  }

  private punto(base: number): Simbolo[] {
    let desde = base
    while (desde >= 0 && !this.puntos.has(desde)) desde -= CADA
    let tabla = desde >= 0 ? (this.puntos.get(desde) as Simbolo[]) : []
    for (let i = Math.max(desde + 1, 0); i <= base; i++) {
      tabla = aplicar(tabla, this.cambios[i])
      if (i % CADA === 0) this.puntos.set(i, tabla)
    }
    return tabla
  }
}

class Paso implements PasoTraza {
  linea: number
  instr: number
  accion: PasoTraza['accion']
  detalle: string
  resultado: string
  columna?: number
  largo?: number
  cambios: Simbolo[]
  cuadrupla?: number
  siguiente?: number
  salida?: number
  vuelta?: number
  vueltas?: number
  papel?: PasoTraza['papel']
  readonly #traza: TrazaTabla
  readonly #k: number

  constructor(
    traza: TrazaTabla,
    k: number,
    datos: Omit<PasoTraza, 'simbolos' | 'cambios'>,
    cambios: Simbolo[],
  ) {
    this.linea = datos.linea
    this.instr = datos.instr
    this.accion = datos.accion
    this.detalle = datos.detalle
    this.resultado = datos.resultado
    if (datos.columna !== undefined) this.columna = datos.columna
    if (datos.largo !== undefined) this.largo = datos.largo
    this.cambios = cambios
    if (datos.cuadrupla !== undefined) this.cuadrupla = datos.cuadrupla
    if (datos.siguiente !== undefined) this.siguiente = datos.siguiente
    if (datos.salida !== undefined) this.salida = datos.salida
    if (datos.papel !== undefined) this.papel = datos.papel
    this.#traza = traza
    this.#k = k
  }

  get simbolos(): Simbolo[] {
    return this.#traza.tablaEn(this.#k)
  }
}

export function crearPaso(
  traza: TrazaTabla,
  datos: Omit<PasoTraza, 'simbolos' | 'cambios'>,
  cambios: readonly Simbolo[],
): PasoTraza {
  return new Paso(traza, traza.agregar(cambios), datos, cambios as Simbolo[])
}
