// @vitest-environment node
import { compile, ejecutar } from '@engine/compile'
import {
  ENTRADAS_POTENCIA,
  FUENTE_ERROR_SINTACTICO,
  FUENTE_POTENCIA,
} from '@engine/ejemplos'
import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { archivosZip, exportZip } from '@/features/export/zip'
import { es } from '@/i18n/es'

const arbol = { modo: 'abstract' as const, atributos: false }
const p = compile(FUENTE_POTENCIA)
const entrada = ENTRADAS_POTENCIA[0]
const x = ejecutar(p, entrada.split('\n'))
const datos = {
  file: 'potencia.brv',
  source: FUENTE_POTENCIA,
  result: p,
  execution: { entrada, resultado: x },
  optimizado: true,
  arbol,
  lang: 'es',
  fecha: new Date('2026-11-21T10:00:00Z'),
}

describe('exportar todo en un .zip (D9)', () => {
  it('cada exportación disponible, con su nombre de siempre', () => {
    expect(archivosZip(datos, es).map((a) => a.name)).toEqual([
      'potencia.brv',
      'potencia-informe.html',
      'potencia-salida.txt',
      'potencia-tokens.csv',
      'potencia-simbolos.csv',
      'potencia-diagnosticos.csv',
      'potencia-traza.csv',
      'potencia-arbol.txt',
      'potencia-arbol.svg',
      'potencia-intermedio.txt',
      'potencia-optimizado.txt',
      'potencia-bloques.svg',
      'potencia-resultado.json',
    ])
  })

  it('con errores sintácticos, solo lo que hay', () => {
    const r = compile(FUENTE_ERROR_SINTACTICO)
    const nombres = archivosZip(
      {
        ...datos,
        file: 'e.brv',
        source: FUENTE_ERROR_SINTACTICO,
        result: r,
        execution: null,
      },
      es,
    ).map((a) => a.name)
    expect(nombres).toEqual([
      'e.brv',
      'e-informe.html',
      'e-tokens.csv',
      'e-diagnosticos.csv',
    ])
  })

  it('un .zip válido que se puede abrir', async () => {
    const f = await exportZip(datos, es)
    expect(f.name).toBe('potencia-todo.zip')
    expect(f.type).toBe('application/zip')
    const archivos = unzipSync(f.content)
    expect(Object.keys(archivos)).toHaveLength(13)
    expect(strFromU8(archivos['potencia.brv'])).toBe(FUENTE_POTENCIA)
    expect(strFromU8(archivos['potencia-salida.txt'])).toContain('Hola Ana')
  })
})
