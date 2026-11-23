import { hierarchy, tree } from 'd3-hierarchy'
import type { Attr, Nodo } from './arbol'

const CAR = 7.25
const CAR_ATTR = 6.1
const PAD_X = 10
const ALTO_TEXTO = 22
const ALTO_ATTR = 14
const NIVEL = 50
const NIVEL_ATTRS = 62
const ALTO_ROL = 11
const SEP = 12
const MARGEN = 14

export interface NodoDibujo {
  nodo: Nodo
  x: number
  y: number
  ancho: number
  alto: number
  etiqueta: string
  atributos: string
  rol: string
}

export interface AristaDibujo {
  padre: NodoDibujo
  hijo: NodoDibujo
  flecha: 'sube' | 'baja' | null
}

export interface Dibujo {
  nodos: NodoDibujo[]
  aristas: AristaDibujo[]
  ancho: number
  alto: number
}

const largo = (s: string) => [...s].length

export function textoAtributos(attrs: readonly Attr[]): string {
  const syn = attrs.filter((a) => a.kind === 'syn').map((a) => a.value)
  const inh = attrs
    .filter((a) => a.kind === 'inh')
    .map((a) => `↓${a.name}=${a.value}`)
  return [...(syn.length ? [`↑${syn.join(' ')}`] : []), ...inh].join(' ')
}

export function dibujarArbol(
  raiz: Nodo,
  conAttrs: boolean,
  rol: (n: Nodo) => string = () => '',
): Dibujo {
  const etiqueta = (n: Nodo) => n.texto || n.clase
  const atributos = (n: Nodo) => (conAttrs ? textoAtributos(n.attrs) : '')
  const ancho = (n: Nodo) =>
    Math.max(
      largo(etiqueta(n)) * CAR + 2 * PAD_X,
      largo(atributos(n)) * CAR_ATTR + 2 * PAD_X,
      largo(rol(n)) * CAR_ATTR + 4,
      30,
    )
  const alto = (n: Nodo) => ALTO_TEXTO + (atributos(n) ? ALTO_ATTR : 0)

  const h = hierarchy(raiz, (n) => n.hijos)
  tree<Nodo>()
    .nodeSize([1, conAttrs ? NIVEL_ATTRS : NIVEL])
    .separation(
      (a, b) =>
        (ancho(a.data) + ancho(b.data)) / 2 +
        (a.parent === b.parent ? SEP : 2 * SEP),
    )(h)

  const todos = h.descendants()
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = 0
  for (const d of todos) {
    const w = ancho(d.data)
    minX = Math.min(minX, (d.x ?? 0) - w / 2)
    maxX = Math.max(maxX, (d.x ?? 0) + w / 2)
    maxY = Math.max(maxY, (d.y ?? 0) + alto(d.data))
  }

  const porNodo = new Map<(typeof todos)[number], NodoDibujo>()
  const nodos = todos.map((d) => {
    const dibujo: NodoDibujo = {
      nodo: d.data,
      x: (d.x ?? 0) - minX + MARGEN,
      y: (d.y ?? 0) + MARGEN + ALTO_ROL,
      ancho: ancho(d.data),
      alto: alto(d.data),
      etiqueta: etiqueta(d.data),
      atributos: atributos(d.data),
      rol: rol(d.data),
    }
    porNodo.set(d, dibujo)
    return dibujo
  })
  const aristas = todos.flatMap((d) => {
    const padre = d.parent ? porNodo.get(d.parent) : undefined
    const hijo = porNodo.get(d)
    if (!padre || !hijo) return []
    const syn = d.data.attrs.some((a) => a.kind === 'syn')
    const inh = d.data.attrs.some((a) => a.kind === 'inh')
    const flecha: AristaDibujo['flecha'] =
      !conAttrs || d.parent?.data.clase === 'programa'
        ? null
        : syn
          ? 'sube'
          : inh
            ? 'baja'
            : null
    return [{ padre, hijo, flecha }]
  })

  return {
    nodos,
    aristas,
    ancho: Math.ceil(maxX - minX + 2 * MARGEN),
    alto: Math.ceil(maxY + 2 * MARGEN + ALTO_ROL),
  }
}

export function nodoEnColumna(
  raiz: Nodo,
  linea: number,
  columna: number,
): Nodo | null {
  const contiene = (n: Nodo) =>
    n.linea === linea &&
    n.desde !== undefined &&
    n.hasta !== undefined &&
    columna >= n.desde &&
    columna <= n.hasta
  let actual: Nodo | null = null
  let nivel: readonly Nodo[] = raiz.hijos
  for (;;) {
    const hijo = nivel.find(contiene)
    if (!hijo) return actual
    actual = hijo
    nivel = hijo.hijos
  }
}

export function ancestros(id: string): string[] {
  const partes = id.split('.')
  return partes.slice(0, -1).map((_, i) => partes.slice(0, i + 1).join('.'))
}

export function nodoPorId(raiz: Nodo, id: string): Nodo | null {
  const partes = id.split('.').slice(1).map(Number)
  let n: Nodo | undefined = raiz
  for (const p of partes) n = n?.hijos[p]
  return n ?? null
}

export function nodoDelPaso(
  raiz: Nodo,
  paso: { linea: number; columna?: number; largo?: number },
): Nodo | null {
  const { columna } = paso
  if (columna === undefined) return null
  const fin = columna + (paso.largo ?? 0)
  const contiene = (n: Nodo) =>
    n.linea === paso.linea &&
    n.desde !== undefined &&
    n.hasta !== undefined &&
    columna >= n.desde &&
    columna <= n.hasta
  let exacto: Nodo | null = null
  let ultimo: Nodo | null = null
  let nivel: readonly Nodo[] = raiz.desde === undefined ? raiz.hijos : [raiz]
  for (;;) {
    const n = nivel.find(contiene)
    if (!n) break
    ultimo = n
    if (n.desde === columna && n.hasta === fin) exacto = n
    nivel = n.hijos
  }
  return exacto ?? ultimo
}
