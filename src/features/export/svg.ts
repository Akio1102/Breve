import type { BloqueBasico } from '@engine/bloques'
import { bloquesBasicos } from '@engine/bloques'
import { esSalto, formatTAC } from '@engine/formato'
import type { InstruccionTAC } from '@engine/types'
import type { Nodo } from '@/arbol/arbol'
import { dibujarArbol } from '@/arbol/layout'

const COLOR = {
  fondo: '#ffffff',
  texto: '#1f2328',
  tenue: '#6e7781',
  borde: '#d0d7de',
  caja: '#f6f8fa',
  noTerminal: '#8250df',
  sintetizado: '#0969da',
  heredado: '#9a6700',
  salto: '#cf222e',
}

const FUENTE =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace"

export const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const flecha = (id: string, color: string, orient = 'auto') =>
  `<marker id="${id}" viewBox="0 0 8 8" refX="8" refY="4" markerWidth="7" markerHeight="7" orient="${orient}"><path d="M0,0 L8,4 L0,8 z" fill="${color}"/></marker>`

export function svgArbol(
  raiz: Nodo,
  conAttrs: boolean,
  rol: (n: Nodo) => string = () => '',
  titulo = '',
): string {
  const d = dibujarArbol(raiz, conAttrs, rol)
  const partes: string[] = []
  for (const { padre, hijo, flecha: f } of d.aristas) {
    const color =
      f === 'sube'
        ? COLOR.sintetizado
        : f === 'baja'
          ? COLOR.heredado
          : COLOR.borde
    const marcas =
      f === 'sube'
        ? ' marker-start="url(#sube)"'
        : f === 'baja'
          ? ' marker-end="url(#baja)"'
          : ''
    partes.push(
      `<line x1="${padre.x}" y1="${padre.y + padre.alto}" x2="${hijo.x}" y2="${hijo.y}" stroke="${color}" stroke-width="1.25"${marcas}/>`,
    )
    if (hijo.rol)
      partes.push(
        `<text x="${hijo.x}" y="${hijo.y - 4}" text-anchor="middle" font-size="10" font-style="italic" fill="${COLOR.tenue}">${esc(hijo.rol)}</text>`,
      )
  }
  for (const n of d.nodos) {
    const x = n.x - n.ancho / 2
    const noTerminal = !n.nodo.texto
    partes.push(
      `<g transform="translate(${x},${n.y})"><rect width="${n.ancho}" height="${n.alto}" rx="${n.nodo.terminal ? 3 : 7}" fill="${n.nodo.terminal ? COLOR.fondo : COLOR.caja}" stroke="${n.nodo.terminal ? COLOR.borde : COLOR.tenue}"/>` +
        `<text x="${n.ancho / 2}" y="15" text-anchor="middle" font-size="12"${n.nodo.esInstruccion ? ' font-weight="600"' : ''}${noTerminal ? ` font-style="italic" fill="${COLOR.noTerminal}"` : ` fill="${COLOR.texto}"`}>${esc(n.etiqueta)}</text>` +
        (n.atributos
          ? `<text x="${n.ancho / 2}" y="30" text-anchor="middle" font-size="10">${n.atributos
              .split(' ')
              .map(
                (a, i) =>
                  `<tspan fill="${a.startsWith('↓') ? COLOR.heredado : COLOR.sintetizado}">${i > 0 ? ' ' : ''}${esc(a)}</tspan>`,
              )
              .join('')}</text>`
          : '') +
        '</g>',
    )
  }
  return documento(d.ancho, d.alto, partes, titulo, [
    flecha('sube', COLOR.sintetizado, 'auto-start-reverse'),
    flecha('baja', COLOR.heredado),
  ])
}

function documento(
  ancho: number,
  alto: number,
  partes: string[],
  titulo: string,
  marcas: string[],
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" font-family="${FUENTE}">
${titulo ? `<title>${esc(titulo)}</title>\n` : ''}<defs>${marcas.join('')}</defs>
<rect width="100%" height="100%" fill="${COLOR.fondo}"/>
${partes.join('\n')}
</svg>
`
}

const CAR = 7.25
const LINEA = 16
const CABECERA = 20
const PAD = 8
const ENTRE = 30
const CARRIL = 14
const MARGEN = 16

export interface TextosBloques {
  entrada: string
  fin: string
}

export function svgBloques(
  codigo: readonly InstruccionTAC[],
  textos: TextosBloques,
  titulo = '',
): string {
  const bloques = bloquesBasicos(codigo)
  const lineas = (b: BloqueBasico) =>
    Array.from(
      { length: b.fin - b.inicio + 1 },
      (_, k) => `${b.inicio + k}: ${formatTAC(codigo[b.inicio + k])}`,
    )
  const anchoCaja =
    Math.max(
      12,
      ...bloques.flatMap((b) => lineas(b).map((l) => [...l].length)),
    ) *
      CAR +
    2 * PAD
  const x0 = MARGEN + 40
  let y = MARGEN + 22
  const cajas = bloques.map((b) => {
    const alto = CABECERA + lineas(b).length * LINEA + PAD
    const caja = { b, y, alto }
    y += alto + ENTRE
    return caja
  })

  const inicioDe = new Map(bloques.map((b) => [b.inicio, b.id]))
  const destino = (b: BloqueBasico) => {
    const ultima = codigo[b.fin]
    return esSalto(ultima) ? inicioDe.get(ultima.salto) : undefined
  }
  const saltos = bloques.flatMap((b) => {
    const d = destino(b)
    return d !== undefined && d !== b.id + 1 ? [{ desde: b.id, hasta: d }] : []
  })
  saltos.sort(
    (a, b) => Math.abs(a.hasta - a.desde) - Math.abs(b.hasta - b.desde),
  )
  const carriles = saltos.map((_, i) => i)
  const ancho = x0 + anchoCaja + (saltos.length + 1) * CARRIL + MARGEN + 10

  const partes: string[] = []
  partes.push(
    `<text x="${x0 + anchoCaja / 2}" y="${MARGEN + 8}" text-anchor="middle" font-size="11" fill="${COLOR.tenue}">${esc(textos.entrada)}</text>`,
    `<line x1="${x0 + anchoCaja / 2}" y1="${MARGEN + 11}" x2="${x0 + anchoCaja / 2}" y2="${cajas[0]?.y ?? 0}" stroke="${COLOR.tenue}" marker-end="url(#f)"/>`,
  )
  for (const { b, y: top, alto } of cajas) {
    partes.push(
      `<rect x="${x0}" y="${top}" width="${anchoCaja}" height="${alto}" rx="6" fill="${COLOR.caja}" stroke="${COLOR.borde}"/>`,
      `<text x="${x0 + PAD}" y="${top + 14}" font-size="11" font-weight="600" fill="${COLOR.texto}">B${b.id}</text>`,
      ...lineas(b).map(
        (l, k) =>
          `<text x="${x0 + PAD}" y="${top + CABECERA + 12 + k * LINEA}" font-size="12" fill="${COLOR.texto}" xml:space="preserve">${esc(l)}</text>`,
      ),
    )
    const ultima = codigo[b.fin]
    const sigue = ultima.op !== 'goto' && ultima.op !== 'halt'
    if (cajas[b.id + 1] && (sigue || destino(b) === b.id + 1)) {
      const sig = cajas[b.id + 1]
      partes.push(
        `<line x1="${x0 + anchoCaja / 2}" y1="${top + alto}" x2="${x0 + anchoCaja / 2}" y2="${sig.y}" stroke="${COLOR.tenue}" marker-end="url(#f)"/>`,
      )
    }
    if (b.sucesores.length === 0)
      partes.push(
        `<text x="${x0 + anchoCaja / 2}" y="${top + alto + 16}" text-anchor="middle" font-size="11" fill="${COLOR.tenue}">${esc(textos.fin)}</text>`,
      )
  }
  saltos.forEach((s, i) => {
    const a = cajas[s.desde]
    const z = cajas[s.hasta]
    const xc = x0 + anchoCaja + CARRIL * (carriles[i] + 1)
    const y1 = a.y + a.alto - 8
    const y2 = z.y + 10
    partes.push(
      `<path d="M${x0 + anchoCaja},${y1} H${xc} V${y2} H${x0 + anchoCaja}" fill="none" stroke="${COLOR.salto}" stroke-width="1.25" marker-end="url(#s)"/>`,
    )
  })
  const alto = (cajas.at(-1)?.y ?? 0) + (cajas.at(-1)?.alto ?? 0) + 30 + MARGEN
  return documento(ancho, alto, partes, titulo, [
    flecha('f', COLOR.tenue),
    flecha('s', COLOR.salto),
  ])
}
