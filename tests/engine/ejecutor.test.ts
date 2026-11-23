// @vitest-environment node
import { compile, ejecutar } from '@engine/compile'
import { MAX_INSTRUCCIONES } from '@engine/ejecutor'
import {
  FUENTE_ERROR_EJECUCION,
  FUENTE_POTENCIA,
  FUENTE_TIPOS,
} from '@engine/ejemplos'
import { describe, expect, it } from 'vitest'

const correr = (fuente: string, entrada = '') => {
  const r = compile(fuente)
  expect(r.errores).toEqual([])
  return ejecutar(r, entrada.split('\n'))
}
const salida = (fuente: string, entrada = '') => {
  const r = correr(fuente, entrada)
  expect(r.error).toBeNull()
  return r.salida
}
const error = (fuente: string, entrada = '') => correr(fuente, entrada).error

describe('ejecución: los ejemplos (sección 9)', () => {
  it('Ana, 2, 5 → Hola Ana, Resultado:, 32, Resultado pequeño', () => {
    const { traza, ...r } = correr(FUENTE_POTENCIA, 'Ana\n2\n5')
    expect(traza.pc).toHaveLength(51)
    expect(traza.pc.slice(0, 9)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(traza.pc.at(-1)).toBe(21)
    expect(traza.escrituras.nombre.slice(0, 4)).toEqual([
      'potencia',
      'nombre',
      'base',
      'exponente',
    ])
    expect(traza.escrituras.valor.slice(0, 4)).toEqual([1, 'Ana', 2, 5])
    expect(traza.salida).toHaveLength(4)
    expect(traza.pc[traza.salida[0]]).toBe(5)
    expect(r).toEqual({
      ok: true,
      salida: ['Hola Ana', 'Resultado:', '32', 'Resultado pequeño'],
      memoria: {
        nombre: 'Ana',
        base: 2,
        exponente: 5,
        potencia: 32,
        t1: 'Hola Ana',
        _c1: 5,
        t2: true,
        t3: 32,
        t4: 5,
        t5: false,
      },
      instrucciones: 51,
      limiteAlcanzado: false,
      error: null,
    })
  })

  it('Ana, 3, 5 → 243 y Resultado grande', () => {
    expect(salida(FUENTE_POTENCIA, 'Ana\n3\n5').slice(2)).toEqual([
      '243',
      'Resultado grande',
    ])
  })

  it('exponente 0 → 1: el rep no da ninguna vuelta', () => {
    const r = correr(FUENTE_POTENCIA, 'Ana\n2\n0')
    expect(r.salida[2]).toBe('1')
    expect(r.instrucciones).toBe(16)
    expect(r.memoria).not.toHaveProperty('t3')
  })

  it('tipos.brv: dec, concatenación y variables sin valor', () => {
    const r = correr(FUENTE_TIPOS)
    expect(r.salida).toEqual(['Ana es adulta', '1.9', '0'])
    expect(r.memoria).toMatchObject({ edad: 23, total: 1.9, x: 0, y: 0 })
    expect(r.instrucciones).toBe(36)
  })

  it('division.brv: 10 / 4 = 2.5 y 10 / 0 es error', () => {
    expect(salida(FUENTE_ERROR_EJECUCION, '10\n4')).toEqual(['2.5'])
    expect(error(FUENTE_ERROR_EJECUCION, '10\n0')).toEqual({
      fase: 'ejecucion',
      cuadrupla: 2,
      linea: 5,
      columna: 6,
      largo: 1,
      mensaje: 'división entre cero',
    })
  })

  it('abc para un ent', () => {
    const r = correr(FUENTE_POTENCIA, 'Ana\nabc\n5')
    expect(r.ok).toBe(false)
    expect(r.error).toMatchObject({
      cuadrupla: 2,
      linea: 6,
      columna: 5,
      largo: 4,
      mensaje:
        "entrada inválida 'abc': 'base' es de tipo ent (un entero, p. ej. 5 o -3)",
    })
    expect(r.instrucciones).toBe(3)
    expect(r.memoria).toMatchObject({ nombre: 'Ana', potencia: 1, base: 0 })
  })

  it('entrada insuficiente', () => {
    expect(error(FUENTE_POTENCIA, 'Ana')?.mensaje).toBe(
      "entrada insuficiente: no hay un valor para 'base' (se leyeron 1 de 3)",
    )
  })

  it('la entrada se normaliza: espacios y líneas vacías al final', () => {
    expect(salida(FUENTE_POTENCIA, ' Ana \n 2\n5\n\n')[0]).toBe('Hola Ana')
  })
})

describe('ejecución: operaciones', () => {
  it('2 + 3 * 4 da 14 (S2)', () => {
    expect(salida('di 2 + 3 * 4')).toEqual(['14'])
    expect(salida('di (2 + 3) * 4')).toEqual(['20'])
  })

  it('aritmética de ent y dec', () => {
    expect(
      salida('di 7 / 2\ndi 8 - 3 - 2\ndi -4 * 2\ndi 1.5 + 1\ndi 10 * 0.5'),
    ).toEqual(['3.5', '3', '-8', '2.5', '5.0'])
  })

  it('dec ← ent se escribe como dec', () => {
    expect(salida('va dec d = 5\ndi d')).toEqual(['5.0'])
  })

  it('comparaciones y bool', () => {
    expect(
      salida(
        'di 2 > 1\ndi 2 <= 1\ndi "a" == "a"\ndi verdadero != falso\ndi 2 == 2.0',
      ),
    ).toEqual(['verdadero', 'falso', 'verdadero', 'verdadero', 'verdadero'])
  })

  it('si con y sin no', () => {
    const f =
      'va ent n\nlee n\nsi n > 0 di "pos" no di "no pos"\nsi n == 0 di "cero"'
    expect(salida(f, '5')).toEqual(['pos'])
    expect(salida(f, '0')).toEqual(['no pos', 'cero'])
  })

  it('rep con expresión, con valor negativo y dos seguidos', () => {
    expect(
      salida('va ent n, s\nlee n\nrep n * 2 s = s + 1\ndi s', '3'),
    ).toEqual(['6'])
    expect(salida('va ent n\nlee n\nrep n di "x"\ndi "fin"', '-2')).toEqual([
      'fin',
    ])
    expect(salida('rep 2 di "a"\nrep 3 di "b"')).toEqual([
      'a',
      'a',
      'b',
      'b',
      'b',
    ])
  })

  it('lee convierte al tipo de la variable', () => {
    expect(
      salida(
        'va txt t\nva dec d\nva bool b\nva ent e\nlee t\nlee d\nlee b\nlee e\ndi t + "!"\ndi d * 2\nsi b di e',
        'hola mundo\n1.25\nverdadero\n-7',
      ),
    ).toEqual(['hola mundo!', '2.5', '-7'])
  })

  it('cada write escribe una línea, aunque sea vacía', () => {
    expect(salida('di ""\ndi "a"')).toEqual(['', 'a'])
  })
})

describe('ejecución: errores', () => {
  it('entrada inválida para dec y bool', () => {
    expect(error('va dec d\nlee d\ndi d', '1,5')?.mensaje).toBe(
      "entrada inválida '1,5': 'd' es de tipo dec (un número, p. ej. 2.5)",
    )
    expect(error('va bool b\nlee b\ndi b', 'si')?.mensaje).toBe(
      "entrada inválida 'si': 'b' es de tipo bool (verdadero o falso)",
    )
  })

  it('un número leído fuera de rango se distingue de una entrada inválida', () => {
    expect(error('va ent e\nlee e\ndi e', '3000000000')?.mensaje).toBe(
      "entrada fuera de rango '3000000000': 'e' es ent (de -2147483648 a 2147483647)",
    )
    expect(error('va dec d\nlee d\ndi d', `${'9'.repeat(400)}`)?.mensaje).toBe(
      `entrada fuera de rango '${'9'.repeat(400)}': no cabe en un dec`,
    )
    expect(error('va ent e\nlee e\ndi e', '3.5')?.mensaje).toMatch(
      /^entrada inválida '3.5'/,
    )
  })

  it('desbordamiento de ent', () => {
    expect(error('va ent x = 2147483647\ndi x + 1')).toMatchObject({
      linea: 2,
      columna: 6,
      mensaje:
        'desbordamiento de ent: el resultado 2147483648 no cabe en 4 bytes (de -2147483648 a 2147483647)',
    })
    expect(error('va ent x = 65536\ndi x * x')?.mensaje).toMatch(
      /desbordamiento/,
    )
  })

  it('lo escrito antes del error se conserva', () => {
    const r = correr('va ent a, b\nlee a\nlee b\ndi "antes"\ndi a / b', '1\n0')
    expect(r.salida).toEqual(['antes'])
    expect(r.error?.mensaje).toBe('división entre cero')
    expect(r.limiteAlcanzado).toBe(false)
  })

  it(`límite de ${MAX_INSTRUCCIONES} instrucciones: no congela la página`, () => {
    const r = correr('va ent s\nrep 100000 s = s + 1\ndi s')
    expect(r.ok).toBe(false)
    expect(r.limiteAlcanzado).toBe(true)
    expect(r.instrucciones).toBe(MAX_INSTRUCCIONES)
    expect(r.error).toMatchObject({ linea: 2, columna: 1, largo: 3 })
    expect(r.error?.mensaje).toBe(
      'se superó el límite de 100 000 instrucciones ejecutadas (¿un rep con demasiadas vueltas?)',
    )
    expect(salida('va ent s\nrep 10000 s = s + 1\ndi s')).toEqual(['10000'])
  })
})
