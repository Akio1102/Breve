import { TAMANO, VALOR_POR_DEFECTO } from './formato'
import type { Simbolo, TipoDato } from './types'

export function hash(nombre: string): number {
  let h = 5381
  for (let i = 0; i < nombre.length; i++)
    h = ((h << 5) + h + nombre.charCodeAt(i)) >>> 0
  return h
}

export class TablaSimbolos {
  private cubetas: Simbolo[][]
  private readonly orden: (Simbolo | undefined)[] = []
  private instantanea: Simbolo[] | null = null
  private pendientes = new Map<string, Simbolo>()
  private cantidad = 0
  private numero = 0
  private direccion = 0

  constructor(capacidad = 16) {
    this.cubetas = Array.from({ length: capacidad }, () => [])
  }

  get capacidad(): number {
    return this.cubetas.length
  }

  get tamano(): number {
    return this.cantidad
  }

  private cubeta(nombre: string): Simbolo[] {
    return this.cubetas[hash(nombre) % this.cubetas.length]
  }

  private static enCubeta(cubeta: Simbolo[], nombre: string) {
    for (const s of cubeta) if (s.nombre === nombre) return s
    return undefined
  }

  insertar(
    nombre: string,
    tipo: TipoDato,
    categoria: Simbolo['categoria'],
    lineaDeclaracion: number,
  ): Simbolo | null {
    const cubeta = this.cubeta(nombre)
    if (TablaSimbolos.enCubeta(cubeta, nombre)) return null
    const s: Simbolo = {
      numero: ++this.numero,
      nombre,
      categoria,
      tipo,
      tamano: TAMANO[tipo],
      valor: VALOR_POR_DEFECTO[tipo],
      direccion: this.direccion,
      lineaDeclaracion,
      lineasReferencia: [],
      usado: false,
      inicializado: false,
    }
    this.direccion += s.tamano
    cubeta.push(s)
    this.orden.push(s)
    this.pendientes.set(nombre, s)
    this.instantanea = null
    this.cantidad++
    if (this.cantidad > this.cubetas.length * 0.75) this.redimensionar()
    return s
  }

  buscar(nombre: string): Simbolo | undefined {
    return TablaSimbolos.enCubeta(this.cubeta(nombre), nombre)
  }

  actualizar(
    nombre: string,
    cambios: Partial<Omit<Simbolo, 'nombre' | 'numero'>>,
  ): Simbolo | undefined {
    const cubeta = this.cubeta(nombre)
    const i = cubeta.findIndex((s) => s.nombre === nombre)
    if (i < 0) return undefined
    const s = { ...cubeta[i], ...cambios }
    cubeta[i] = s
    this.orden[s.numero - 1] = s
    this.pendientes.set(nombre, s)
    this.instantanea = null
    return s
  }

  tomarCambios(): Simbolo[] {
    const cambios = [...this.pendientes.values()]
    this.pendientes = new Map()
    return cambios
  }

  eliminar(nombre: string): boolean {
    const cubeta = this.cubeta(nombre)
    const i = cubeta.findIndex((s) => s.nombre === nombre)
    if (i < 0) return false
    this.orden[cubeta[i].numero - 1] = undefined
    this.instantanea = null
    cubeta.splice(i, 1)
    this.cantidad--
    return true
  }

  listar(): Simbolo[] {
    this.instantanea ??=
      this.orden.length === this.cantidad
        ? (this.orden.slice() as Simbolo[])
        : this.orden.filter((s) => s !== undefined)
    return this.instantanea
  }

  private redimensionar() {
    const viejas = this.cubetas
    const n = viejas.length * 2
    this.cubetas = new Array<Simbolo[]>(n)
    for (let k = 0; k < n; k++) this.cubetas[k] = []
    for (const cubeta of viejas)
      for (const s of cubeta) this.cubetas[hash(s.nombre) % n].push(s)
  }
}
