import { campo, formatTAC, formatValor, tokenText } from '@engine/formato'
import { PASADAS } from '@engine/optimizador'
import type {
  Diagnostico,
  FaseCompilacion,
  ResultadoCompilacion,
  ResultadoEjecucion,
  Simbolo,
  Tripleta,
} from '@engine/types'
import { arbolComoTexto, construirArbol } from '@/arbol/arbol'
import type { Messages } from '@/i18n'
import type { ExportFile, OpcionesArbol } from './exporters'
import { esc, svgArbol, svgBloques } from './svg'

export const DIBUJO_ARBOL_HASTA = 25

const ESTILOS = `
:root { color-scheme: light; --borde: #d0d7de; --tenue: #57606a; --caja: #f6f8fa; }
* { box-sizing: border-box; }
body { margin: 0 auto; max-width: 60rem; padding: 2rem 1.5rem 4rem; font: 14px/1.5 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1f2328; background: #fff; }
h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
h2 { font-size: 1.2rem; margin: 2.2rem 0 .6rem; padding-bottom: .25rem; border-bottom: 1px solid var(--borde); }
h3 { font-size: 1rem; margin: 1.4rem 0 .4rem; }
p, li { margin: .3rem 0; }
.tenue { color: var(--tenue); }
code, pre, td.mono, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace; font-size: 12px; }
pre { background: var(--caja); border: 1px solid var(--borde); border-radius: 6px; padding: .6rem .8rem; overflow-x: auto; white-space: pre; }
table { border-collapse: collapse; margin: .4rem 0 1rem; font-size: 12.5px; }
th, td { border: 1px solid var(--borde); padding: .2rem .5rem; text-align: left; vertical-align: top; }
th { background: var(--caja); font-weight: 600; }
td.num { text-align: right; font-variant-numeric: tabular-nums; }
.fases { display: flex; flex-wrap: wrap; gap: .4rem 1rem; padding: 0; list-style: none; }
.ok { color: #1a7f37; } .error { color: #cf222e; } .aviso { color: #9a6700; } .pendiente { color: var(--tenue); }
figure { margin: .6rem 0 1rem; overflow-x: auto; }
figure svg { max-width: 100%; height: auto; }
figcaption { font-size: 12px; color: var(--tenue); }
nav ol { columns: 2; margin: .4rem 0; }
@media print {
  body { max-width: none; padding: 0; font-size: 11pt; }
  @page { margin: 16mm 14mm; }
  h2 { break-after: avoid; }
  h3 { break-after: avoid; }
  table, pre, figure { break-inside: auto; }
  tr, figure svg { break-inside: avoid; }
  thead { display: table-header-group; }
  nav { display: none; }
  a { color: inherit; text-decoration: none; }
}
`

const tabla = (
  cabecera: readonly string[],
  filas: (string | number)[][],
  numericas: number[] = [],
) =>
  `<table><thead><tr>${cabecera.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${filas
    .map(
      (f) =>
        `<tr>${f
          .map(
            (c, i) =>
              `<td class="${numericas.includes(i) ? 'num' : 'mono'}">${esc(String(c))}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('')}</tbody></table>`

const lista = (items: string[]) =>
  `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`

export interface DatosInforme {
  file: string
  source: string
  result: ResultadoCompilacion
  execution?: { entrada: string; resultado: ResultadoEjecucion } | null
  optimizado?: boolean
  arbol: OpcionesArbol
  fecha?: Date
}

export function exportReport(
  datos: DatosInforme,
  t: Messages,
  lang: string,
): ExportFile {
  const { file, source, result, execution, arbol } = datos
  const r = t.report
  const fecha = datos.fecha ?? new Date()
  const secciones: [id: string, titulo: string, html: string][] = []

  const lineas = source.replace(/\n$/, '').split(/\r\n|\r|\n/)
  const ancho = String(lineas.length).length
  secciones.push([
    'codigo',
    r.sections.source,
    `<pre>${lineas
      .map((l, i) => `${String(i + 1).padStart(ancho)}  ${esc(l)}`)
      .join('\n')}</pre>`,
  ])

  secciones.push([
    'lexico',
    r.sections.lexical,
    result.tokens.length === 0
      ? `<p class="tenue">${esc(r.none)}</p>`
      : `<p>${esc(t.tokens.count(result.tokens.length))}</p>${tabla(
          [
            t.tokens.columns.n,
            t.tokens.columns.tipo,
            t.tokens.columns.lexema,
            t.tokens.columns.valor,
            t.tokens.columns.linea,
            t.tokens.columns.columna,
          ],
          result.tokens.map((tok, i) => [
            i + 1,
            tok.tipo,
            tokenText(tok),
            tok.valor === undefined ? '' : formatValor(tok.valor),
            tok.linea,
            tok.columna,
          ]),
          [0, 4, 5],
        )}`,
  ])

  const ast = result.ast
  let arbolHtml = `<p class="tenue">${esc(r.noTree)}</p>`
  if (ast && ast.instrucciones.length > 0) {
    const raiz = construirArbol(ast, arbol.modo)
    const texto = arbolComoTexto(raiz, arbol.atributos)
    const dibujo =
      ast.instrucciones.length <= DIBUJO_ARBOL_HASTA
        ? `<figure>${svgArbol(raiz, arbol.atributos, arbol.rol)}<figcaption>${esc(r.treeCaption(t.ast.modes[arbol.modo]))}</figcaption></figure>`
        : `<p class="tenue">${esc(r.treeTooBig(DIBUJO_ARBOL_HASTA))}</p>`
    arbolHtml = `<p>${esc(t.ast.modeHint[arbol.modo])}</p>${dibujo}<pre>${esc(texto)}</pre>`
  }
  secciones.push(['sintactico', r.sections.syntax, arbolHtml])

  const memoria = execution?.resultado.memoria
  const sim = t.symbols.columns
  const valor = (s: Simbolo) => formatValor(s.valor, s.tipo)
  const final = (s: Simbolo) => {
    const v = memoria?.[s.nombre]
    return v === undefined ? '—' : formatValor(v, s.tipo)
  }
  secciones.push([
    'semantico',
    r.sections.semantic,
    result.tablaSimbolos.length === 0
      ? `<p class="tenue">${esc(r.noSymbols)}</p>`
      : tabla(
          [
            sim.numero,
            sim.nombre,
            sim.categoria,
            sim.tipo,
            sim.tamano,
            sim.direccion,
            r.initialValue,
            ...(memoria ? [r.finalValue] : []),
            sim.lineaDecl,
            sim.lineasRef,
          ],
          result.tablaSimbolos.map((s) => [
            s.numero,
            s.nombre,
            t.symbols.categories[s.categoria],
            s.tipo,
            s.tamano,
            s.direccion,
            valor(s),
            ...(memoria ? [final(s)] : []),
            s.lineaDeclaracion,
            s.lineasReferencia.join(', ') || '—',
          ]),
          [0, 4, 5],
        ),
  ])

  const intermedio = (
    codigo: ResultadoCompilacion['tresDirecciones'],
    tripletas: Tripleta[],
    cuadruplas: ResultadoCompilacion['cuadruplas'],
  ) => {
    const c = t.intermediate.columns
    const [h1, h2, h3] = t.export.intermediateHeaders
    return [
      `<h3>${esc(h1)}</h3>`,
      tabla(
        [c.n, c.instruction],
        codigo.map((x, i) => [i, formatTAC(x)]),
        [0],
      ),
      `<h3>${esc(h2)}</h3>`,
      tripletas.length === codigo.length
        ? ''
        : `<p class="tenue">${esc(t.export.tripletsOwnNumbering)}</p>`,
      tabla(
        [c.n, c.op, c.arg1, c.arg2],
        tripletas.map((x, i) => [`(${i})`, x.op, campo(x.arg1), campo(x.arg2)]),
      ),
      `<h3>${esc(h3)}</h3>`,
      tabla(
        [c.n, c.op, c.arg1, c.arg2, c.result],
        cuadruplas.map((x, i) => [
          i,
          x.op,
          campo(x.arg1),
          campo(x.arg2),
          campo(x.resultado),
        ]),
        [0],
      ),
      `<h3>${esc(t.export.blocksHeader)}</h3>`,
      `<figure>${svgBloques(codigo, {
        entrada: t.export.blockEntry,
        fin: t.export.blockEnd,
      })}<figcaption>${esc(t.intermediate.blocks.hint)}</figcaption></figure>`,
    ].join('')
  }
  let intermedioHtml = `<p class="tenue">${esc(t.intermediate.empty)}</p>`
  if (result.ok) {
    intermedioHtml = intermedio(
      result.tresDirecciones,
      result.tripletas,
      result.cuadruplas,
    )
    const opt = datos.optimizado ? result.optimizado : null
    if (opt)
      intermedioHtml += `<h3>${esc(t.export.optimizedTitle)}</h3><p>${esc(
        t.intermediate.comparison(
          result.tresDirecciones.length,
          opt.tresDirecciones.length,
        ),
      )}</p>${lista(
        PASADAS.map(
          (p) =>
            `${esc(t.intermediate.passes[p])}: ${esc(t.intermediate.passCount(opt.cambios[p]))}`,
        ),
      )}${intermedio(opt.tresDirecciones, opt.tripletas, opt.cuadruplas)}`
  }
  secciones.push(['intermedio', r.sections.intermediate, intermedioHtml])

  let ejecucionHtml = `<p class="tenue">${esc(r.notRun)}</p>`
  if (execution) {
    const x = execution.resultado
    const entrada = execution.entrada.replace(/\s+$/, '')
    ejecucionHtml = [
      `<h3>${esc(r.input)}</h3>`,
      `<pre>${esc(entrada || t.export.noInput)}</pre>`,
      `<h3>${esc(r.output)}</h3>`,
      `<pre>${esc(x.salida.join('\n') || r.noOutput)}</pre>`,
      x.error
        ? `<p class="error">${esc(t.export.runtimeError(x.error.mensaje, x.error.linea, x.error.cuadrupla))}</p>`
        : '',
      `<p class="tenue">${esc(r.executed(x.instrucciones))}</p>`,
    ].join('')
  }
  secciones.push(['ejecucion', r.sections.execution, ejecucionHtml])

  const diag = (d: Diagnostico) => [
    t.phases.names[d.fase],
    d.linea,
    d.columna,
    d.mensaje,
  ]
  const cab = [r.phase, r.line, r.column, r.message]
  secciones.push([
    'diagnosticos',
    r.sections.diagnostics,
    [
      `<h3>${esc(r.errors(result.errores.length + (execution?.resultado.error ? 1 : 0)))}</h3>`,
      result.errores.length || execution?.resultado.error
        ? tabla(
            cab,
            [
              ...result.errores.map(diag),
              ...(execution?.resultado.error
                ? [diag(execution.resultado.error)]
                : []),
            ],
            [1, 2],
          )
        : `<p class="tenue">${esc(r.none)}</p>`,
      `<h3>${esc(r.warnings(result.advertencias.length))}</h3>`,
      result.advertencias.length
        ? tabla(cab, result.advertencias.map(diag), [1, 2])
        : `<p class="tenue">${esc(r.none)}</p>`,
    ].join(''),
  ])

  const fases: FaseCompilacion[] = [
    'lexico',
    'sintactico',
    'semantico',
    'intermedio',
  ]
  const fallida = result.faseFallida
  const estado = (f: FaseCompilacion) => {
    if (fallida === f) return ['error', t.phases.status.error]
    if (fallida && fases.indexOf(f) > fases.indexOf(fallida))
      return ['pendiente', t.phases.status.pending]
    return ['ok', t.phases.status.ok]
  }
  const ejec = execution
    ? execution.resultado.error
      ? ['error', t.phases.status.error]
      : ['ok', t.phases.status.ok]
    : ['pendiente', t.phases.status.pending]
  const resumen = `<ul class="fases">${[
    ...fases.map((f) => [t.phases.names[f], ...estado(f)]),
    [t.phases.names.ejecucion, ...ejec],
  ]
    .map(
      ([n, clase, texto]) =>
        `<li><strong>${esc(n)}</strong>: <span class="${clase}">${esc(texto)}</span></li>`,
    )
    .join('')}</ul>`

  const indice = `<nav aria-label="${esc(r.contents)}"><ol>${secciones
    .map(([id, titulo]) => `<li><a href="#${id}">${esc(titulo)}</a></li>`)
    .join('')}</ol></nav>`

  const html = `<!doctype html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Compilador Breve ${esc(__APP_VERSION__)}">
<title>${esc(r.title(file))}</title>
<style>${ESTILOS}</style>
</head>
<body>
<header>
<h1>${esc(r.title(file))}</h1>
<p class="tenue">${esc(r.generated(fecha.toLocaleString(lang), `Compilador Breve ${__APP_VERSION__}`))}</p>
<p>${esc(r.printHint)}</p>
${resumen}
${indice}
</header>
${secciones
  .map(
    ([id, titulo, cuerpo], i) =>
      `<section id="${id}"><h2>${i + 1}. ${esc(titulo)}</h2>${cuerpo}</section>`,
  )
  .join('\n')}
</body>
</html>
`
  return {
    name: `${file.replace(/\.brv$/, '')}-${t.export.reportSuffix}.html`,
    type: 'text/html;charset=utf-8',
    content: html,
  }
}
