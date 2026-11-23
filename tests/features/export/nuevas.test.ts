// @vitest-environment node
import { compile, ejecutar } from '@engine/compile'
import {
  ENTRADAS_POTENCIA,
  FUENTE_ERROR_SEMANTICO,
  FUENTE_POTENCIA,
} from '@engine/ejemplos'
import { describe, expect, it } from 'vitest'
import { arbolAbstracto, arbolComoTexto } from '@/arbol/arbol'
import {
  exportBlocksSvg,
  exportDiagnosticsCsv,
  exportResultJson,
  exportTokensCsv,
  exportTreeSvg,
  exportTreeText,
  FORMATO_JSON,
  JSON_COMPACTO_DESDE,
  VERSION_JSON,
} from '@/features/export/exporters'
import { DIBUJO_ARBOL_HASTA, exportReport } from '@/features/export/informe'
import { es } from '@/i18n/es'
import { programaGrande } from '../../helpers/programaGrande'

const lineas = (s: string) => s.replace(/^﻿/, '').trimEnd().split('\n')
const p = compile(FUENTE_POTENCIA)
const ast = p.ast
if (!ast) throw new Error('potencia.brv debe tener árbol')
const entrada = ENTRADAS_POTENCIA[0]
const x = ejecutar(p, entrada.split('\n'))

describe('JSON más útil (D6)', () => {
  it('encabezado con formato, versión, fecha y compilador', () => {
    const fecha = new Date('2026-11-21T10:00:00Z')
    const f = exportResultJson(
      'p.brv',
      FUENTE_POTENCIA,
      p,
      es.export,
      undefined,
      fecha,
    )
    const datos = JSON.parse(f.content)
    expect(datos).toMatchObject({
      formato: FORMATO_JSON,
      version: VERSION_JSON,
      fecha: '2026-11-21T10:00:00.000Z',
      file: 'p.brv',
    })
    expect(datos.compilador).toMatch(/^Compilador Breve \d+\.\d+\.\d+/)
    expect(f.content).toContain('\n  "formato"')
    expect(datos.traza[1]).toHaveProperty('cambios')
    expect(datos.traza[1]).not.toHaveProperty('simbolos')
  })

  it('un programa grande va sin sangría', () => {
    const g = compile(programaGrande(60))
    const f = exportResultJson('g.brv', '', g, es.export)
    expect(f.content.length).toBeGreaterThan(JSON_COMPACTO_DESDE)
    expect(f.content).not.toContain('\n')
    expect(JSON.parse(f.content).formato).toBe(FORMATO_JSON)
  })
})

describe('exportaciones nuevas (D7)', () => {
  it('tokens en CSV, con el separador del idioma', () => {
    const f = exportTokensCsv('potencia.brv', p, es.export)
    expect(f.name).toBe('potencia-tokens.csv')
    const l = lineas(f.content)
    expect(l[0]).toBe('numero;componente;lexema;valor;linea;columna')
    expect(l[1]).toBe('1;SALTO;↵;;1;51')
    expect(l[2]).toBe('2;VA;va;;2;1')
    expect(l).toHaveLength(p.tokens.length + 1)
  })

  it('errores y advertencias, también el de ejecución con su cuádrupla', () => {
    const sem = compile(FUENTE_ERROR_SEMANTICO)
    const f = exportDiagnosticsCsv('e.brv', sem, es.export, es.phases.names)
    expect(f.name).toBe('e-diagnosticos.csv')
    const l = lineas(f.content)
    expect(l[0]).toBe('tipo;fase;linea;columna;mensaje')
    expect(l.filter((x) => x.startsWith('error;Semántico;'))).toHaveLength(
      sem.errores.length,
    )
    const div = compile('va ent a = 0\ndi 1 / a')
    const dx = ejecutar(div, [])
    const g = lineas(
      exportDiagnosticsCsv('d.brv', div, es.export, es.phases.names, dx)
        .content,
    )
    expect(g).toContain('error;Ejecución;2;6;división entre cero (cuádrupla 1)')
  })

  it('el árbol como texto y como imagen SVG', () => {
    const op = { modo: 'abstract' as const, atributos: true }
    const txt = exportTreeText('p.brv', ast, es.export, op)
    expect(txt.name).toBe('p-arbol.txt')
    expect(txt.content).toBe(arbolComoTexto(arbolAbstracto(ast), true))
    const svg = exportTreeSvg('p.brv', ast, es.export, op)
    expect(svg.name).toBe('p-arbol.svg')
    expect(svg.type).toMatch(/^image\/svg\+xml/)
    expect(svg.content).toMatch(
      /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/,
    )
    expect(svg.content).toContain('>rep</text>')
    expect(svg.content).toContain('>&gt;</text>')
    expect(svg.content).not.toMatch(/>[^<]*>[^<]*<\/text>/)
  })

  it('el grafo de bloques básicos como imagen SVG', () => {
    const f = exportBlocksSvg('p.brv', p, es.export)
    expect(f.name).toBe('p-bloques.svg')
    for (let b = 0; b < 7; b++) expect(f.content).toContain(`>B${b}</text>`)
    expect(f.content.match(/<path d="M[\d.]+,[\d.]+ H/g)).toHaveLength(4)
    const opt = exportBlocksSvg('p.brv', p, es.export, { optimizado: true })
    expect(opt.content).toContain('>17: halt<')
    expect(opt.content).not.toContain('21: halt')
  })
})

describe('informe para entregar (D8)', () => {
  const html = exportReport(
    {
      file: 'potencia.brv',
      source: FUENTE_POTENCIA,
      result: p,
      execution: { entrada, resultado: x },
      optimizado: true,
      arbol: { modo: 'abstract', atributos: false },
      fecha: new Date('2026-11-21T10:00:00Z'),
    },
    es,
    'es',
  )

  it('un HTML autónomo con todas las fases', () => {
    expect(html.name).toBe('potencia-informe.html')
    expect(html.type).toMatch(/^text\/html/)
    const c = html.content
    expect(c).toMatch(/^<!doctype html>\n<html lang="es">/)
    for (const titulo of Object.values(es.report.sections))
      expect(c).toContain(titulo)
    expect(c).toContain('<svg')
    expect(c).toContain('Hola Ana')
    expect(c).toContain('Código optimizado')
    expect(c).toContain('@media print')
    expect(c).not.toMatch(/<(link|script|img)\b/)
    expect(c).not.toMatch(/(src|href)="https?:/)
  })

  it('escapa el código del programa', () => {
    const r = exportReport(
      {
        file: 'x.brv',
        source: 'di "<b>hola</b>"\n',
        result: compile('di "<b>hola</b>"\n'),
        arbol: { modo: 'abstract', atributos: false },
      },
      es,
      'es',
    )
    expect(r.content).toContain('&lt;b&gt;hola&lt;/b&gt;')
    expect(r.content).not.toContain('<b>hola')
  })

  it('con errores, lo que hay; un programa grande, el árbol solo en texto', () => {
    const sem = compile(FUENTE_ERROR_SEMANTICO)
    const r = exportReport(
      {
        file: 'e.brv',
        source: FUENTE_ERROR_SEMANTICO,
        result: sem,
        arbol: { modo: 'abstract', atributos: false },
      },
      es,
      'es',
    ).content
    expect(r).toContain('El programa no se ejecutó.')
    expect(r).toContain(`Errores (${sem.errores.length})`)
    const g = compile(programaGrande(10))
    const big = exportReport(
      {
        file: 'g.brv',
        source: programaGrande(10),
        result: g,
        arbol: { modo: 'abstract', atributos: false },
      },
      es,
      'es',
    ).content
    expect(big).toContain(es.report.treeTooBig(DIBUJO_ARBOL_HASTA))
  })
})
