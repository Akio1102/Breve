// @vitest-environment node
import type { PapelPaso } from '@engine/types'
import { describe, expect, it } from 'vitest'
import { TOUR_TARGETS } from '@/features/tour/steps'
import { MESSAGES } from '@/i18n'
import { en } from '@/i18n/en'
import { es } from '@/i18n/es'

function keys(o: object, prefix = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? keys(v, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  )
}

const PAPELES: PapelPaso[] = [
  { tipo: 'repInicio', contador: '_c1' },
  { tipo: 'repCondicion', contador: '_c1' },
  { tipo: 'repIncremento', contador: '_c1' },
  { tipo: 'repSalida', sale: true, destino: 9 },
  { tipo: 'repSalida', sale: false, destino: 9 },
  { tipo: 'repSigue', sigue: true, destino: 3 },
  { tipo: 'repSigue', sigue: false, destino: 3 },
  { tipo: 'repVuelve', destino: 3 },
  {
    tipo: 'siCondicion',
    condicion: 't1',
    verdadera: true,
    salta: true,
    destino: 5,
  },
  {
    tipo: 'siCondicion',
    condicion: 't1',
    verdadera: false,
    salta: false,
    destino: 5,
  },
  { tipo: 'siFin', destino: 8 },
]

describe('traducciones', () => {
  it('inglés y español tienen las mismas claves', () => {
    expect(keys(en).sort()).toEqual(keys(es).sort())
  })

  it('cada texto de cada idioma es una cadena no vacía, también los que reciben datos', () => {
    function revisar(v: unknown, ruta: string) {
      if (typeof v === 'function' && ruta.endsWith('.papel')) {
        for (const papel of PAPELES) {
          const r = v(papel)
          expect(typeof r, `${ruta}(${papel.tipo})`).toBe('string')
          expect(r.length, ruta).toBeGreaterThan(0)
        }
      } else if (typeof v === 'function') {
        for (const args of [
          [1, 1, 1],
          [2, 3, 4],
        ]) {
          const r = v(...args)
          expect(typeof r, ruta).toBe('string')
          expect(r.length, ruta).toBeGreaterThan(0)
        }
      } else if (Array.isArray(v))
        for (const [i, x] of v.entries()) revisar(x, `${ruta}[${i}]`)
      else if (v && typeof v === 'object')
        for (const [k, x] of Object.entries(v)) revisar(x, `${ruta}.${k}`)
      else {
        expect(typeof v, ruta).toBe('string')
        expect((v as string).length, ruta).toBeGreaterThan(0)
      }
    }
    for (const [lang, m] of Object.entries(MESSAGES)) revisar(m, lang)
  })

  it('el tour tiene un texto por cada elemento resaltado, en cada idioma', () => {
    for (const m of Object.values(MESSAGES))
      expect(m.tour.steps).toHaveLength(TOUR_TARGETS.length)
  })
})
