import type { ResultadoCompilacion, ResultadoEjecucion } from '@engine/types'
import type { Zippable } from 'fflate'
import type { Messages } from '@/i18n'
import {
  type ExportFile,
  exportBlocksSvg,
  exportDiagnosticsCsv,
  exportIntermediate,
  exportOutput,
  exportResultJson,
  exportSource,
  exportSymbolsCsv,
  exportTokensCsv,
  exportTraceCsv,
  exportTreeSvg,
  exportTreeText,
  type OpcionesArbol,
} from './exporters'
import { exportReport } from './informe'

export interface DatosZip {
  file: string
  source: string
  result: ResultadoCompilacion
  execution: { entrada: string; resultado: ResultadoEjecucion } | null
  optimizado: boolean
  arbol: OpcionesArbol
  lang: string
  fecha?: Date
}

export function archivosZip(d: DatosZip, t: Messages): ExportFile[] {
  const { file, source, result, execution } = d
  const m = t.export
  const semantico = result.traza.length > 0
  const ast =
    result.ast && result.ast.instrucciones.length > 0 ? result.ast : null
  const archivos: (ExportFile | null)[] = [
    exportSource(file, source),
    exportReport(
      {
        file,
        source,
        result,
        execution,
        optimizado: d.optimizado,
        arbol: d.arbol,
        fecha: d.fecha,
      },
      t,
      d.lang,
    ),
    execution
      ? exportOutput(file, execution.resultado, m, execution.entrada)
      : null,
    exportTokensCsv(file, result, m),
    semantico
      ? exportSymbolsCsv(file, result, m, execution?.resultado.memoria)
      : null,
    exportDiagnosticsCsv(file, result, m, t.phases.names, execution?.resultado),
    semantico ? exportTraceCsv(file, result, m, t.stepCard.actions) : null,
    ast ? exportTreeText(file, ast, m, d.arbol) : null,
    ast ? exportTreeSvg(file, ast, m, d.arbol) : null,
    result.ok
      ? exportIntermediate(file, result, m, { pasadas: t.intermediate.passes })
      : null,
    result.ok && result.optimizado
      ? exportIntermediate(file, result, m, {
          optimizado: true,
          pasadas: t.intermediate.passes,
        })
      : null,
    result.ok ? exportBlocksSvg(file, result, m) : null,
    semantico
      ? exportResultJson(
          file,
          source,
          result,
          m,
          execution
            ? { entrada: execution.entrada, resultado: execution.resultado }
            : undefined,
          d.fecha,
        )
      : null,
  ]
  return archivos.filter((a) => a !== null)
}

export async function exportZip(
  d: DatosZip,
  t: Messages,
): Promise<ExportFile<Uint8Array<ArrayBuffer>>> {
  const { strToU8, zipSync } = await import('fflate')
  const fecha = d.fecha ?? new Date()
  const entradas: Zippable = {}
  for (const a of archivosZip({ ...d, fecha }, t))
    entradas[a.name] = [strToU8(a.content), { mtime: fecha }]
  return {
    name: `${d.file.replace(/\.brv$/, '')}-${t.export.zipSuffix}.zip`,
    type: 'application/zip',
    content: zipSync(entradas, { level: 6 }) as Uint8Array<ArrayBuffer>,
  }
}
