// @vitest-environment node
import { compile, ejecutar } from '@engine/compile'
import {
  FUENTE_ERROR_EJECUCION,
  FUENTE_POTENCIA,
  FUENTE_TIPOS,
} from '@engine/ejemplos'
import { describe, expect, it } from 'vitest'
import {
  exportIntermediate,
  exportOutput,
  exportResultJson,
  exportSource,
  exportSymbolsCsv,
  exportTraceCsv,
  markdownIntermediate,
  markdownSymbols,
} from '@/features/export/exporters'
import { en } from '@/i18n/en'
import { es } from '@/i18n/es'

const src = FUENTE_TIPOS
const r = compile(src)
if (!r) throw new Error('el ejemplo válido debe compilar')
const lineas = (s: string) => s.replace(/^﻿/, '').trimEnd().split('\n')

describe('exportar', () => {
  it('código .brv', () => {
    expect(exportSource('a.brv', src)).toMatchObject({
      name: 'a.brv',
      content: src,
    })
    expect(exportSource('a', src).name).toBe('a.brv')
  })

  describe('salida .txt (D5)', () => {
    it('con la entrada usada al principio', () => {
      const p = compile(FUENTE_POTENCIA)
      const f = exportOutput(
        'a.brv',
        ejecutar(p, ['Ana', '2', '5']),
        es.export,
        'Ana\n2\n5\n\n',
      )
      expect(f.name).toBe('a-salida.txt')
      expect(f.content).toBe(
        'Entrada:\nAna\n2\n5\n\nSalida:\nHola Ana\nResultado:\n32\nResultado pequeño\n',
      )
    })

    it('sin entrada lo dice', () => {
      const f = exportOutput('a.brv', ejecutar(r, []), es.export)
      expect(f.content).toBe(
        'Entrada:\n(sin entrada)\n\nSalida:\nAna es adulta\n1.9\n0\n',
      )
    })

    it('el error de ejecución lleva línea y cuádrupla', () => {
      const div = compile(FUENTE_ERROR_EJECUCION)
      const fallo = ejecutar(div, ['10', '0'])
      const e = fallo.error
      expect(exportOutput('a', fallo, es.export, '10\n0').content).toContain(
        `ERROR de ejecución: división entre cero en línea ${e?.linea} (cuádrupla ${e?.cuadrupla})\n`,
      )
      expect(exportOutput('a', fallo, en.export).content).toContain(
        `Runtime ERROR: división entre cero at line ${e?.linea}`,
      )
    })
  })

  describe('código intermedio .txt (D4)', () => {
    it('tres representaciones y los bloques básicos', () => {
      const f = exportIntermediate('a.brv', r, es.export)
      expect(f.name).toBe('a-intermedio.txt')
      const l = f.content.split('\n')
      expect(l).toContain('  3: t1 = 10 * iva')
      expect(l).toContain('  4: (=, total, (3))')
      expect(l).toContain('  8: (goto, –, –, 11)')
      expect(l).toContain('Bloques básicos')
      expect(l).toContain(
        'B0 (instrucciones 0 a 6) · llega desde: inicio del programa · sigue con: B1, B2',
      )
      expect(l.some((x) => x.includes('sigue con: fin del programa'))).toBe(
        true,
      )
      expect(f.content).not.toContain('Código optimizado')
    })

    it('con la casilla Optimizado, el código optimizado con su comparación', () => {
      const p = compile(FUENTE_POTENCIA)
      const f = exportIntermediate('potencia.brv', p, es.export, {
        optimizado: true,
        pasadas: es.intermediate.passes,
      })
      expect(f.name).toBe('potencia-optimizado.txt')
      const l = f.content.split('\n')
      expect(l[0]).toBe('Código optimizado')
      expect(l[1]).toBe('22 → 18 instrucciones. Cambios de cada pasada:')
      expect(l).toContain('  O4 copias: 2')
      expect(l).toContain('  8: potencia = potencia * base')
      expect(l).toContain(' 17: halt')
      expect(l).not.toContain(' 21: halt')
      expect(l).toContain(es.export.tripletsOwnNumbering)
      expect(l).toContain(' 10: (=, potencia, (9))')
      expect(l).toContain(' 22: (halt, –, –)')
      expect(l).toContain('  G1 saltos con comparación: 2')
    })

    it('sin nombres de pasadas usa sus códigos', () => {
      const p = compile(FUENTE_POTENCIA)
      const f = exportIntermediate('p', p, en.export, { optimizado: true })
      expect(f.name).toBe('p-optimized.txt')
      expect(f.content.split('\n')).toContain('  O4: 2')
    })
  })

  describe('tabla de símbolos .csv (D1 y D2)', () => {
    it('en español, con punto y coma y todos los campos de M2', () => {
      const f = exportSymbolsCsv('a.brv', r, es.export)
      expect(f.name).toBe('a-simbolos.csv')
      const l = lineas(f.content)
      expect(l).toHaveLength(r.tablaSimbolos.length + 1)
      expect(l[0]).toBe(
        'numero;nombre;categoria;tipo;tamano;direccion;valor_inicial;linea_declaracion;lineas_referencia;usado;inicializado',
      )
      expect(l[1]).toBe('1;edad;variable;ent;4;0;20;1;6 7;sí;sí')
      expect(l[3]).toBe('3;nombre;variable;txt;4;12;Ana;3;6;sí;sí')
    })

    it('en inglés, con coma', () => {
      const l = lineas(exportSymbolsCsv('a.brv', r, en.export).content)
      expect(l[0].split(',')).toHaveLength(11)
      expect(l[1]).toBe('1,edad,variable,ent,4,0,20,1,6 7,yes,yes')
    })

    it('después de ejecutar, con el valor final de cada símbolo', () => {
      const p = compile(FUENTE_POTENCIA)
      const x = ejecutar(p, ['Ana', '2', '5'])
      const l = lineas(exportSymbolsCsv('p', p, es.export, x.memoria).content)
      expect(l[0].endsWith(';valor_final')).toBe(true)
      const fila = (n: string) => l.slice(1).find((x) => x.split(';')[1] === n)
      expect(fila('potencia')?.split(';').at(-1)).toBe('32')
      expect(fila('nombre')?.split(';').at(-1)).toBe('Ana')
      expect(fila('_c1')?.split(';').at(-1)).toBe('5')
    })

    it('una celda con el separador se entrecomilla', () => {
      const t = compile('va txt s = "a;b"\ndi s')
      expect(lineas(exportSymbolsCsv('t', t, es.export).content)[1]).toBe(
        '1;s;variable;txt;4;0;"a;b";1;2;sí;sí',
      )
    })
  })

  it('resultado .json', () => {
    const f = exportResultJson('a.brv', src, r, es.export)
    expect(f.name).toBe('a-resultado.json')
    const data = JSON.parse(f.content)
    expect(data.traza).toHaveLength(r.traza.length)
    expect(data.source).toBe(src)
  })

  describe('Markdown para copiar (D11)', () => {
    it('la tabla de símbolos, con la barra vertical escapada', () => {
      const t = compile('va txt s = "a|b"\ndi s')
      const l = markdownSymbols(t, es.export).trimEnd().split('\n')
      expect(l[0]).toBe(
        '| numero | nombre | categoria | tipo | tamano | direccion | valor_inicial | linea_declaracion | lineas_referencia | usado | inicializado |',
      )
      expect(l[1]).toBe(
        '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
      )
      expect(l[2]).toBe(
        '| 1 | s | variable | txt | 4 | 0 | a\\|b | 1 | 2 | sí | sí |',
      )
    })

    it('el código intermedio optimizado, si se pide', () => {
      const p = compile(FUENTE_POTENCIA)
      const original = markdownIntermediate(p, es.export).trimEnd().split('\n')
      const opt = markdownIntermediate(p, es.export, { optimizado: true })
        .trimEnd()
        .split('\n')
      expect(original).toHaveLength(2 + 22)
      expect(opt).toHaveLength(2 + 18 + 2)
      expect(markdownSymbols(p, en.export, { potencia: 32 })).toContain(
        '| final_value |',
      )
    })

    it('optimizado: cada tripleta con su número, y x = a op b son dos (Q1)', () => {
      const p = compile(FUENTE_POTENCIA)
      const md = markdownIntermediate(p, es.export, { optimizado: true })
      expect(md).toContain(
        '| 8 | potencia = potencia * base | (9) (*, potencia, base)<br>(10) (=, potencia, (9)) | (*, potencia, base, potencia) |',
      )
      expect(md).toContain(
        '| 7 | if 0 >= exponente goto 11 | (7) (>=, 0, exponente)<br>(8) (if, (7), (15)) | (if>=, 0, exponente, 11) |',
      )
      expect(md.trimEnd().split('\n').at(-1)).toBe(
        es.export.tripletsOwnNumbering,
      )
      expect(markdownIntermediate(p, es.export)).toContain(
        '| 9 | t3 = potencia * base | (*, potencia, base) |',
      )
    })
  })

  describe('traza .csv (D3)', () => {
    it('con la acción traducida, la columna, la instrucción y los cambios', () => {
      const f = exportTraceCsv('a.brv', r, es.export, es.stepCard.actions)
      expect(f.name).toBe('a-traza.csv')
      const l = lineas(f.content)
      expect(l[0]).toBe(
        'paso;linea;columna;instruccion;accion;detalle;resultado;cambios',
      )
      expect(l[1]).toBe(
        '1;1;;;Inicio del análisis;programa;recorrido del árbol;',
      )
      expect(l[2]).toBe(
        '2;1;8;1;Insertar en la tabla;"insertar(edad, ent, variable)";dirección 0;edad nueva',
      )
      expect(l[3]).toBe(
        '3;1;15;1;Asignación;edad = 20 : ent;valor inicial edad = 20;edad: 0 → 20',
      )
    })

    it('sin nombres de acciones usa los internos; en inglés, con coma', () => {
      const l = lineas(exportTraceCsv('a.brv', r, en.export).content)
      expect(l[0]).toBe(
        'step,line,column,instruction,action,detail,result,changes',
      )
      expect(l[2].split(',')[4]).toBe('insertar')
      expect(exportTraceCsv('a.brv', r, en.export).name).toBe('a-trace.csv')
    })
  })
})
