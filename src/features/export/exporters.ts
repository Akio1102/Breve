import { bloquesBasicos } from '@engine/bloques'
import { campo, formatTAC, formatValor, tokenText } from '@engine/formato'
import { PASADAS } from '@engine/optimizador'
import type {
  AccionTraza,
  Cuadrupla,
  Fase,
  IdPasada,
  InstruccionTAC,
  Programa,
  ResultadoCompilacion,
  ResultadoEjecucion,
  Simbolo,
  Tripleta,
  Valor,
} from '@engine/types'
import {
  arbolComoTexto,
  construirArbol,
  type ModoArbol,
  type Nodo,
} from '@/arbol/arbol'
import type { Messages } from '@/i18n'
import { outputText } from '@/store/selectors'
import { svgArbol, svgBloques } from './svg'

type ExportText = Messages['export']

export interface ExportFile<
  C extends string | Uint8Array<ArrayBuffer> = string,
> {
  name: string
  type: string
  content: C
}

const base = (file: string) => file.replace(/\.brv$/, '')

function csvCell(v: string | number): string {
  const s = String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const csv = (
  m: ExportText,
  header: readonly string[],
  rows: (string | number)[][],
) =>
  `﻿${[header, ...rows].map((r) => r.map(csvCell).join(m.csvSeparator)).join('\n')}\n`

export function exportSource(file: string, source: string): ExportFile {
  return {
    name: file.endsWith('.brv') ? file : `${file}.brv`,
    type: 'text/plain;charset=utf-8',
    content: source,
  }
}

export function exportOutput(
  file: string,
  execution: ResultadoEjecucion,
  m: ExportText,
  entrada = '',
): ExportFile {
  const lineas = entrada.split('\n')
  while (lineas.length > 0 && lineas.at(-1)?.trim() === '') lineas.pop()
  const e = execution.error
  const error = e ? `${m.runtimeError(e.mensaje, e.linea, e.cuadrupla)}\n` : ''
  return {
    name: `${base(file)}-${m.outputSuffix}.txt`,
    type: 'text/plain;charset=utf-8',
    content: [
      m.outputInput,
      lineas.length > 0 ? outputText(lineas) : `${m.noInput}\n`,
      m.outputTitle,
      outputText(execution.salida) + error,
    ].join('\n'),
  }
}

const tripletaTexto = (t: Tripleta) =>
  `(${t.op}, ${campo(t.arg1)}, ${campo(t.arg2)})`

export interface OpcionesIntermedio {
  optimizado?: boolean
  pasadas?: Record<IdPasada, string>
}

export function exportIntermediate(
  file: string,
  result: ResultadoCompilacion,
  m: ExportText,
  opciones: OpcionesIntermedio = {},
): ExportFile {
  const opt = opciones.optimizado ? result.optimizado : null
  const codigo: InstruccionTAC[] =
    opt?.tresDirecciones ?? result.tresDirecciones
  const tripletas: Tripleta[] = opt?.tripletas ?? result.tripletas
  const cuadruplas: Cuadrupla[] = opt?.cuadruplas ?? result.cuadruplas
  const n = (i: number) => String(i).padStart(3)
  const tac = codigo.map((x, i) => `${n(i)}: ${formatTAC(x)}`)
  const tri = tripletas.map((x, i) => `${n(i)}: ${tripletaTexto(x)}`)
  const cua = cuadruplas.map(
    (x, i) =>
      `${n(i)}: (${x.op}, ${campo(x.arg1)}, ${campo(x.arg2)}, ${campo(x.resultado)})`,
  )
  const nombre = (b: number) => `B${b}`
  const lista = (ids: number[], vacio: string) =>
    ids.length > 0 ? ids.map(nombre).join(', ') : vacio
  const bloques = bloquesBasicos(codigo).map((b) =>
    m.block(
      nombre(b.id),
      b.inicio,
      b.fin,
      lista(b.predecesores, m.blockEntry),
      lista(b.sucesores, m.blockEnd),
    ),
  )
  const resumen = opt
    ? [
        m.optimizedTitle,
        m.optimizedSummary(result.tresDirecciones.length, codigo.length),
        ...PASADAS.map(
          (p) => `  ${opciones.pasadas?.[p] ?? p}: ${opt.cambios[p]}`,
        ),
        '',
      ]
    : []
  const [h1, h2, h3] = m.intermediateHeaders
  return {
    name: `${base(file)}-${opt ? m.optimizedSuffix : m.intermediateSuffix}.txt`,
    type: 'text/plain;charset=utf-8',
    content: [
      ...resumen,
      h1,
      ...tac,
      '',
      h2,
      ...(tripletas.length === codigo.length ? [] : [m.tripletsOwnNumbering]),
      ...tri,
      '',
      h3,
      ...cua,
      '',
      m.blocksHeader,
      ...bloques,
      '',
    ].join('\n'),
  }
}

const celda = (v: Valor | undefined, s: Simbolo) =>
  v === undefined ? '' : typeof v === 'string' ? v : formatValor(v, s.tipo)

export function exportSymbolsCsv(
  file: string,
  result: ResultadoCompilacion,
  m: ExportText,
  memoria?: Record<string, Valor>,
): ExportFile {
  const siNo = (b: boolean) => (b ? m.yes : m.no)
  const rows = result.tablaSimbolos.map((s) => [
    s.numero,
    s.nombre,
    s.categoria,
    s.tipo,
    s.tamano,
    s.direccion,
    celda(s.valor, s),
    s.lineaDeclaracion,
    s.lineasReferencia.join(' '),
    siNo(s.usado),
    siNo(s.inicializado),
    ...(memoria ? [celda(memoria[s.nombre], s)] : []),
  ])
  const header = memoria
    ? [...m.symbolsHeader, m.finalValueHeader]
    : m.symbolsHeader
  return {
    name: `${base(file)}-${m.symbolsSuffix}.csv`,
    type: 'text/csv;charset=utf-8',
    content: csv(m, header, rows),
  }
}

export const FORMATO_JSON = 'compilador-breve/resultado'
export const VERSION_JSON = 2
export const JSON_COMPACTO_DESDE = 200_000

export function exportResultJson(
  file: string,
  source: string,
  result: ResultadoCompilacion,
  m: ExportText,
  execution?: { entrada: string; resultado: ResultadoEjecucion | null },
  fecha = new Date(),
): ExportFile {
  const datos = {
    formato: FORMATO_JSON,
    version: VERSION_JSON,
    fecha: fecha.toISOString(),
    compilador: `Compilador Breve ${__APP_VERSION__}`,
    file,
    source,
    ...result,
    ...(execution && { ejecucion: execution }),
  }
  const compacto = JSON.stringify(datos)
  return {
    name: `${base(file)}-${m.resultSuffix}.json`,
    type: 'application/json',
    content:
      compacto.length > JSON_COMPACTO_DESDE
        ? compacto
        : JSON.stringify(datos, null, 2),
  }
}

export function exportTraceCsv(
  file: string,
  result: ResultadoCompilacion,
  m: ExportText,
  acciones?: Record<AccionTraza, string>,
): ExportFile {
  const antes = new Map<string, Simbolo>()
  const rows = result.traza.map((p, i) => {
    const cambios = p.cambios.flatMap((s) => {
      const previo = antes.get(s.nombre)
      antes.set(s.nombre, s)
      if (!previo) return [m.traceNew(s.nombre)]
      if (previo.valor === s.valor) return []
      return [
        `${s.nombre}: ${formatValor(previo.valor, s.tipo)} → ${formatValor(s.valor, s.tipo)}`,
      ]
    })
    return [
      i + 1,
      p.linea,
      p.columna ?? '',
      p.accion === 'inicio' || p.accion === 'fin' ? '' : p.instr + 1,
      acciones?.[p.accion] ?? p.accion,
      p.detalle,
      p.resultado,
      cambios.join(' · '),
    ]
  })
  return {
    name: `${base(file)}-${m.traceSuffix}.csv`,
    type: 'text/csv;charset=utf-8',
    content: csv(m, m.csvHeader, rows),
  }
}

export function exportTokensCsv(
  file: string,
  result: ResultadoCompilacion,
  m: ExportText,
): ExportFile {
  return {
    name: `${base(file)}-${m.tokensSuffix}.csv`,
    type: 'text/csv;charset=utf-8',
    content: csv(
      m,
      m.tokensHeader,
      result.tokens.map((t, i) => [
        i + 1,
        t.tipo,
        tokenText(t),
        t.valor === undefined ? '' : formatValor(t.valor),
        t.linea,
        t.columna,
      ]),
    ),
  }
}

export function exportDiagnosticsCsv(
  file: string,
  result: ResultadoCompilacion,
  m: ExportText,
  fases: Record<Fase, string>,
  execution?: ResultadoEjecucion | null,
): ExportFile {
  const fila = (
    tipo: string,
    d: { fase: Fase; linea: number; columna: number; mensaje: string },
  ) => [tipo, fases[d.fase], d.linea, d.columna, d.mensaje]
  const e = execution?.error
  return {
    name: `${base(file)}-${m.diagnosticsSuffix}.csv`,
    type: 'text/csv;charset=utf-8',
    content: csv(m, m.diagnosticsHeader, [
      ...result.errores.map((d) => fila(m.errorKind, d)),
      ...(e
        ? [
            fila(m.errorKind, {
              ...e,
              mensaje: m.withQuad(e.mensaje, e.cuadrupla),
            }),
          ]
        : []),
      ...result.advertencias.map((d) => fila(m.warningKind, d)),
    ]),
  }
}

export interface OpcionesArbol {
  modo: ModoArbol
  atributos: boolean
  rol?: (n: Nodo) => string
}

export function exportTreeText(
  file: string,
  ast: Programa,
  m: ExportText,
  { modo, atributos }: OpcionesArbol,
): ExportFile {
  return {
    name: `${base(file)}-${m.treeSuffix}.txt`,
    type: 'text/plain;charset=utf-8',
    content: arbolComoTexto(construirArbol(ast, modo), atributos),
  }
}

export function exportTreeSvg(
  file: string,
  ast: Programa,
  m: ExportText,
  { modo, atributos, rol }: OpcionesArbol,
): ExportFile {
  return {
    name: `${base(file)}-${m.treeSuffix}.svg`,
    type: 'image/svg+xml;charset=utf-8',
    content: svgArbol(construirArbol(ast, modo), atributos, rol, file),
  }
}

export function exportBlocksSvg(
  file: string,
  result: ResultadoCompilacion,
  m: ExportText,
  opciones: Pick<OpcionesIntermedio, 'optimizado'> = {},
): ExportFile {
  const codigo =
    (opciones.optimizado ? result.optimizado?.tresDirecciones : null) ??
    result.tresDirecciones
  return {
    name: `${base(file)}-${m.blocksSuffix}.svg`,
    type: 'image/svg+xml;charset=utf-8',
    content: svgBloques(
      codigo,
      { entrada: m.blockEntry, fin: m.blockEnd },
      file,
    ),
  }
}

export function download(f: ExportFile<string | Uint8Array<ArrayBuffer>>) {
  const url = URL.createObjectURL(new Blob([f.content], { type: f.type }))
  const a = document.createElement('a')
  a.href = url
  a.download = f.name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const md = (v: string | number) => String(v).replace(/\|/g, '\\|') || ' '

const tablaMd = (header: readonly string[], rows: (string | number)[][]) =>
  [
    `| ${header.map(md).join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.map(md).join(' | ')} |`),
  ].join('\n')

export function markdownIntermediate(
  result: ResultadoCompilacion,
  m: ExportText,
  opciones: OpcionesIntermedio = {},
): string {
  const opt = opciones.optimizado ? result.optimizado : null
  const codigo = opt?.tresDirecciones ?? result.tresDirecciones
  const tri = opt?.tripletas ?? result.tripletas
  const cua = opt?.cuadruplas ?? result.cuadruplas
  const origen = opt?.origenTripletas ?? tri.map((_, k) => k)
  const propia = tri.length !== codigo.length
  const deInstruccion = codigo.map(() => [] as string[])
  for (const [k, t] of tri.entries())
    deInstruccion[origen[k]]?.push(
      propia ? `(${k}) ${tripletaTexto(t)}` : tripletaTexto(t),
    )
  const tabla = tablaMd(
    m.markdownIntermediateHeader,
    codigo.map((x, i) => [
      i,
      formatTAC(x),
      deInstruccion[i].join('<br>'),
      `(${cua[i].op}, ${campo(cua[i].arg1)}, ${campo(cua[i].arg2)}, ${campo(cua[i].resultado)})`,
    ]),
  )
  return propia ? `${tabla}\n\n${m.tripletsOwnNumbering}\n` : `${tabla}\n`
}

export function markdownSymbols(
  result: ResultadoCompilacion,
  m: ExportText,
  memoria?: Record<string, Valor>,
): string {
  const siNo = (b: boolean) => (b ? m.yes : m.no)
  const header = memoria
    ? [...m.symbolsHeader, m.finalValueHeader]
    : m.symbolsHeader
  return `${tablaMd(
    header,
    result.tablaSimbolos.map((s) => [
      s.numero,
      s.nombre,
      s.categoria,
      s.tipo,
      s.tamano,
      s.direccion,
      celda(s.valor, s),
      s.lineaDeclaracion,
      s.lineasReferencia.join(' '),
      siNo(s.usado),
      siNo(s.inicializado),
      ...(memoria ? [celda(memoria[s.nombre], s)] : []),
    ]),
  )}\n`
}
