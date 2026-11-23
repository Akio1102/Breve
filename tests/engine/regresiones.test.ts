// @vitest-environment node
import { compile, ejecutar } from '@engine/compile'
import { analizarLexico } from '@engine/lexer'
import { MAX_PROFUNDIDAD } from '@engine/parser'
import { describe, expect, it } from 'vitest'

const errores = (src: string) => compile(src).errores.map((e) => e.mensaje)
const advertencias = (src: string) =>
  compile(src).advertencias.map((e) => e.mensaje)
const correr = (src: string, entrada = '') => {
  const r = compile(src)
  expect(r.errores).toEqual([])
  return ejecutar(r, entrada.split('\n'))
}

describe('C1: programas muy anidados no rompen el compilador', () => {
  const casos = {
    paréntesis: (n: number) => `di ${'('.repeat(n)}1${')'.repeat(n)}`,
    'menos unario': (n: number) => `di ${'-'.repeat(n)}1`,
    'suma encadenada': (n: number) => `di ${Array(n).fill('1').join(' + ')}`,
    'producto encadenado': (n: number) =>
      `di ${Array(n).fill('1').join(' * ')}`,
  }

  for (const [nombre, fuente] of Object.entries(casos)) {
    it(`${nombre}: el límite se acepta y 20 000 niveles dan un error sintáctico`, () => {
      expect(compile(fuente(MAX_PROFUNDIDAD - 1)).ok).toBe(true)
      const r = compile(fuente(20_000))
      expect(r.faseFallida).toBe('sintactico')
      expect(r.errores).toHaveLength(1)
      expect(r.errores[0].mensaje).toMatch(
        /^expresión demasiado (anidada|larga)/,
      )
    })
  }

  it('el error se recupera: la línea siguiente también se analiza', () => {
    const r = compile(`di ${'('.repeat(300)}1${')'.repeat(300)}\ndi )`)
    expect(r.errores.map((e) => e.linea)).toEqual([1, 2])
  })

  it('un fallo interno se entrega como diagnóstico, no como excepción', () => {
    const r = compile(null as unknown as string)
    expect(r.ok).toBe(false)
    expect(r.faseFallida).toBe('lexico')
    expect(r.errores[0].mensaje).toMatch(/^error interno del compilador/)
  })

  it('un fallo interno del ejecutor se entrega como error de ejecución', () => {
    const x = ejecutar(
      { cuadruplas: null, tresDirecciones: [], tablaSimbolos: [] } as never,
      [],
    )
    expect(x.ok).toBe(false)
    expect(x.error?.mensaje).toMatch(/^error interno del ejecutor/)
  })
})

describe('I1: rep no puede cambiar su número de vueltas', () => {
  it('el cuerpo que asigna a la variable de las vueltas es un error', () => {
    expect(errores('va ent n = 3\nrep n n = n + 1\ndi n')).toEqual([
      "el cuerpo de 'rep' modifica 'n', que indica el número de vueltas",
    ])
  })

  it('con una expresión las vueltas se calculan una vez y no hay error', () => {
    expect(correr('va ent n = 3\nrep n + 0 n = n + 1\ndi n').salida).toEqual([
      '6',
    ])
  })

  it('asignar a otra variable sigue permitido', () => {
    expect(
      correr('va ent n = 3, s = 0\nrep n s = s + n\ndi s\ndi n').salida,
    ).toEqual(['9', '3'])
  })
})

describe('I5: desbordamiento de dec', () => {
  it('al ejecutar, un resultado infinito es un error', () => {
    const x = correr('va dec d = 1.0\nrep 400 d = d * 10.0\ndi d')
    expect(x.ok).toBe(false)
    expect(x.error?.mensaje).toBe(
      'desbordamiento de dec: el resultado no cabe en 8 bytes',
    )
    expect(x.error?.linea).toBe(2)
  })

  it('un literal dec demasiado grande es un error semántico', () => {
    expect(errores(`va dec d = ${'9'.repeat(400)}.0\ndi d`)).toEqual([
      'el literal 99999999999999999999… está fuera del rango de dec',
    ])
  })
})

describe('M2: asignación definida', () => {
  const PUEDE = /^'x' puede no tener valor aquí/

  it('un si sin no no asegura el valor', () => {
    expect(
      advertencias('va ent x\nva bool c\nlee c\nsi c x = 1\ndi x'),
    ).toEqual([expect.stringMatching(PUEDE)])
  })

  it('un si con valor en las dos ramas sí lo asegura', () => {
    expect(
      advertencias('va ent x\nva bool c\nlee c\nsi c x = 1 no x = 2\ndi x'),
    ).toEqual([])
  })

  it('una sola rama del si/no no basta', () => {
    expect(
      advertencias('va ent x\nva bool c\nlee c\nsi c x = 1 no di 0\ndi x'),
    ).toEqual([expect.stringMatching(PUEDE)])
  })

  it('dentro de la rama no se ve lo que asigna la otra', () => {
    expect(
      advertencias('va ent x\nva bool c\nlee c\nsi c x = 1 no di x'),
    ).toEqual([expect.stringMatching(PUEDE)])
  })

  it('rep con variable puede dar 0 vueltas; con un literal positivo, no', () => {
    expect(advertencias('va ent x, n\nlee n\nrep n x = 1\ndi x')).toEqual([
      expect.stringMatching(PUEDE),
    ])
    expect(advertencias('va ent x\nrep 2 x = 1\ndi x')).toEqual([])
  })

  it('una sola advertencia por variable', () => {
    expect(
      advertencias('va ent x\nva bool c\nlee c\nsi c x = 1\ndi x\ndi x'),
    ).toHaveLength(1)
  })
})

describe('M3: variables que reciben valores que nunca se usan', () => {
  it('asignada después de declararse', () => {
    expect(advertencias('va ent x\nx = 5')).toEqual([
      "'x' (línea 1) recibe valores, pero ninguno se usa",
    ])
  })

  it('leída con lee', () => {
    expect(advertencias('va ent x\nlee x')).toEqual([
      "'x' (línea 1) recibe valores, pero ninguno se usa",
    ])
  })

  it('solo declarada (con o sin valor inicial): el mensaje de siempre', () => {
    expect(advertencias('va ent x = 1')).toEqual([
      "'x' fue declarada en la línea 1 y nunca se usa",
    ])
  })
})

describe('M5: archivos de otros sistemas', () => {
  it('el BOM inicial se ignora y no mueve las columnas', () => {
    const r = analizarLexico('﻿di 1')
    expect(r.errores).toEqual([])
    expect(r.tokens[0]).toMatchObject({ tipo: 'DI', linea: 1, columna: 2 })
    expect(correr('﻿di 1').salida).toEqual(['1'])
  })

  it('un BOM en medio del código sigue siendo un carácter no válido', () => {
    expect(analizarLexico('di 1\n﻿di 2').errores).toHaveLength(1)
  })

  it('\\r solo (Mac antiguo) es un fin de línea', () => {
    const r = analizarLexico('va ent a = 1\rdi a')
    expect(r.tokens.find((t) => t.tipo === 'DI')).toMatchObject({
      linea: 2,
      columna: 1,
    })
    expect(correr('va ent a = 1\rdi a').salida).toEqual(['1'])
  })

  it('\\r\\n cuenta como un solo fin de línea', () => {
    expect(
      analizarLexico('di 1\r\ndi 2').tokens.find((t) => t.lexema === '2'),
    ).toMatchObject({ linea: 2 })
  })

  it('un comentario termina en \\r', () => {
    expect(correr('di 1 // uno\rdi 2').salida).toEqual(['1', '2'])
  })

  it('una cadena no cruza un \\r', () => {
    expect(analizarLexico('di "a\rb"').errores[0].mensaje).toMatch(
      /^cadena sin cerrar/,
    )
  })
})

describe('Q4: desbordamiento de txt', () => {
  it('una concatenación demasiado larga es un error de ejecución con su posición', () => {
    const x = correr('va txt s = "hola"\nrep 40 s = s + s\ndi s')
    expect(x.ok).toBe(false)
    expect(x.limiteAlcanzado).toBe(false)
    expect(x.error?.mensaje).toBe(
      'desbordamiento de txt: el texto tendría 131 072 caracteres (máximo 100 000)',
    )
    expect(x.error).toMatchObject({ linea: 2, columna: 14, largo: 1 })
    expect(correr('va txt s = "hola"\nrep 14 s = s + s\ndi s').ok).toBe(true)
  })

  it('el optimizador no pliega una concatenación que se desbordaría', () => {
    const r = compile(`va txt s = "${'a'.repeat(60_000)}"\ndi s + s`)
    expect(r.optimizado?.tresDirecciones.some((i) => i.op === 'bin')).toBe(true)
    expect(ejecutar(r, []).error?.mensaje).toMatch(/^desbordamiento de txt/)
  })

  it('una entrada de texto demasiado larga es un error', () => {
    const x = correr('va txt s\nlee s\ndi s', 'x'.repeat(100_001))
    expect(x.error?.mensaje).toBe(
      "entrada fuera de rango: el texto para 's' tiene 100 001 caracteres (máximo 100 000)",
    )
  })
})

describe('P1: precisión de dec', () => {
  const salida = (src: string) => {
    const r = compile(src)
    const opt = r.optimizado
    const original = ejecutar(r, []).salida
    if (opt)
      expect(
        ejecutar(
          {
            ...r,
            cuadruplas: opt.cuadruplas,
            tresDirecciones: opt.tresDirecciones,
          },
          [],
        ).salida,
      ).toEqual(original)
    return original
  }

  it('los cálculos encadenados no pierden precisión', () => {
    expect(salida('va dec d = 1 / 3\ndi d * 3')).toEqual(['1.0'])
    expect(salida('va dec d = 2\nva dec r = d / 7 * 7\ndi r')).toEqual(['2.0'])
  })

  it('se muestra con 15 cifras', () => {
    expect(salida('va dec d = 0.1 + 0.2\ndi d')).toEqual(['0.3'])
    expect(salida('va ent e = 10\ndi e * 0.19')).toEqual(['1.9'])
  })

  it('se compara con las cifras que se muestran', () => {
    expect(salida('va dec d = 0.1 + 0.2\ndi d == 0.3')).toEqual(['verdadero'])
    expect(salida('va dec d = 0.1 + 0.2\ndi d > 0.3')).toEqual(['falso'])
    expect(salida('va dec d = 0.1 + 0.2\ndi d != 0.3')).toEqual(['falso'])
  })
})

describe('P2: optimizar programas grandes', () => {
  const programa = (n: number) => {
    const l: string[] = []
    for (let i = 0; i < n; i++)
      l.push(`va ent a${i} = ${i}`, `rep 2 a${i} = a${i} + 1`, `di a${i}`)
    return l.join('\n')
  }

  it('desenrolla miles de rep en tiempo lineal', () => {
    const r = compile(programa(2000))
    const inicio = performance.now()
    const o = r.optimizado
    const ms = performance.now() - inicio
    expect(o?.cambios.G4).toBe(2000)
    expect(ms).toBeLessThan(5000)
  })

  it('el resultado de desenrollar es el mismo que ejecutar el ciclo', () => {
    const r = compile(programa(50))
    const o = r.optimizado
    if (!o) throw new Error('sin optimizar')
    const original = ejecutar(r, [])
    const optimizado = ejecutar(
      { ...r, cuadruplas: o.cuadruplas, tresDirecciones: o.tresDirecciones },
      [],
    )
    expect(optimizado.salida).toEqual(original.salida)
    expect(optimizado.salida.slice(0, 3)).toEqual(['2', '3', '4'])
  })

  it('el código optimizado se calcula al leerlo, una sola vez', () => {
    const r = compile('va ent x = 2 * 3\ndi x')
    const d = Object.getOwnPropertyDescriptor(r, 'optimizado')
    expect(d?.get).toBeTypeOf('function')
    expect(d?.enumerable).toBe(true)
    const a = r.optimizado
    expect(a).not.toBeNull()
    expect(r.optimizado).toBe(a)
    expect({ ...r }.optimizado).toBe(a)
    expect(JSON.parse(JSON.stringify(r)).optimizado).not.toBeNull()
  })
})
