// @vitest-environment node
import { compile } from '@engine/compile'
import {
  FUENTE_ERROR_SEMANTICO,
  FUENTE_POTENCIA,
  FUENTE_TIPOS,
} from '@engine/ejemplos'
import { analizarLexico } from '@engine/lexer'
import { analizarSintactico } from '@engine/parser'
import { analizarSemantico } from '@engine/semantico'
import { hash, TablaSimbolos } from '@engine/tablaSimbolos'
import {
  asignable,
  comparacionValida,
  TABLA_ARITMETICA,
  tipoAritmetico,
} from '@engine/tipos'
import type { Instr } from '@engine/types'
import { describe, expect, it } from 'vitest'

const analizar = (fuente: string) => {
  const lex = analizarLexico(fuente)
  expect(lex.errores).toEqual([])
  const sin = analizarSintactico(lex.tokens)
  expect(sin.errores).toEqual([])
  return analizarSemantico(sin.ast)
}

const errores = (fuente: string) =>
  analizar(fuente).errores.map((e) => [e.linea, e.columna, e.mensaje])
const mensajes = (fuente: string) =>
  analizar(fuente).errores.map((e) => e.mensaje)
const avisos = (fuente: string) =>
  analizar(fuente).advertencias.map((e) => e.mensaje)

describe('reglas de tipos (sección 5.3)', () => {
  it('tabla de operadores aritméticos', () => {
    expect(TABLA_ARITMETICA.ent).toEqual({
      ent: 'ent',
      dec: 'dec',
      txt: null,
      bool: null,
    })
    expect(tipoAritmetico('+', 'txt', 'txt')).toBe('txt')
    expect(tipoAritmetico('*', 'txt', 'txt')).toBeNull()
    expect(tipoAritmetico('/', 'ent', 'ent')).toBe('dec')
    expect(tipoAritmetico('-', 'dec', 'ent')).toBe('dec')
    expect(tipoAritmetico('+', 'bool', 'bool')).toBeNull()
  })

  it('comparadores y asignaciones', () => {
    expect(comparacionValida('<', 'ent', 'dec')).toBe(true)
    expect(comparacionValida('>', 'txt', 'txt')).toBe(false)
    expect(comparacionValida('==', 'txt', 'txt')).toBe(true)
    expect(comparacionValida('!=', 'bool', 'bool')).toBe(true)
    expect(comparacionValida('==', 'txt', 'ent')).toBe(false)
    expect(asignable('dec', 'ent')).toBe('conversion')
    expect(asignable('ent', 'dec')).toBeNull()
    expect(asignable('txt', 'txt')).toBe('igual')
  })
})

describe('tabla de símbolos (hash)', () => {
  it('insertar, buscar, actualizar, eliminar y listar', () => {
    const t = new TablaSimbolos()
    expect(t.insertar('a', 'ent', 'variable', 1)).toMatchObject({
      numero: 1,
      direccion: 0,
      tamano: 4,
      valor: 0,
    })
    expect(t.insertar('b', 'dec', 'constante', 2)).toMatchObject({
      direccion: 4,
      tamano: 8,
    })
    expect(t.insertar('c', 'txt', 'variable', 3)?.direccion).toBe(12)
    expect(t.insertar('a', 'bool', 'variable', 4)).toBeNull()
    expect(t.buscar('b')?.categoria).toBe('constante')
    expect(t.buscar('z')).toBeUndefined()

    const antes = t.listar()
    t.actualizar('a', { usado: true })
    expect(t.buscar('a')?.usado).toBe(true)
    expect(antes[0].usado).toBe(false)
    expect(t.actualizar('z', { usado: true })).toBeUndefined()

    expect(t.eliminar('b')).toBe(true)
    expect(t.eliminar('b')).toBe(false)
    expect(t.listar().map((s) => s.nombre)).toEqual(['a', 'c'])
    expect(t.tamano).toBe(2)
  })

  it('crece al pasar el factor de carga y mantiene el orden', () => {
    const t = new TablaSimbolos(4)
    const nombres = Array.from({ length: 40 }, (_, i) => `v${i}`)
    for (const n of nombres) t.insertar(n, 'bool', 'variable', 1)
    expect(t.capacidad).toBeGreaterThanOrEqual(40 / 0.75)
    expect(t.listar().map((s) => s.nombre)).toEqual(nombres)
    expect(nombres.every((n) => t.buscar(n))).toBe(true)
    expect(t.buscar('v39')?.direccion).toBe(39)
  })

  it('listar reutiliza la instantánea hasta el siguiente cambio', () => {
    const t = new TablaSimbolos()
    t.insertar('a', 'ent', 'variable', 1)
    t.insertar('b', 'ent', 'variable', 1)
    const l1 = t.listar()
    expect(t.listar()).toBe(l1)
    t.actualizar('b', { usado: true })
    const l2 = t.listar()
    expect(l2).not.toBe(l1)
    expect(l2[1].usado).toBe(true)
    t.eliminar('a')
    t.insertar('c', 'ent', 'variable', 2)
    expect(t.listar().map((s) => s.nombre)).toEqual(['b', 'c'])
  })

  it('los nombres que chocan comparten cubeta sin perderse', () => {
    const t = new TablaSimbolos(1)
    t.insertar('x', 'ent', 'variable', 1)
    t.insertar('y', 'ent', 'variable', 1)
    expect(t.buscar('x')?.nombre).toBe('x')
    expect(hash('x')).not.toBe(hash('y'))
  })
})

describe('semántico: ejemplos', () => {
  it('potencia.brv: sin errores ni advertencias', () => {
    const r = analizar(FUENTE_POTENCIA)
    expect(r.errores).toEqual([])
    expect(r.advertencias).toEqual([])
    expect(r.tabla.listar().map((s) => [s.nombre, s.direccion])).toEqual([
      ['nombre', 0],
      ['base', 4],
      ['exponente', 8],
      ['potencia', 12],
    ])
    expect(r.tabla.buscar('potencia')).toMatchObject({
      valor: 1,
      inicializado: true,
      lineasReferencia: [9, 11, 12],
    })
  })

  it('tipos.brv: dos advertencias, en orden de línea', () => {
    expect(avisos(FUENTE_TIPOS)).toEqual([
      "'y' fue declarada en la línea 5 y nunca se usa",
      "'x' se usa sin valor explícito ni lee: vale 0 (valor por defecto)",
    ])
  })

  it('error-semantico.brv: los cinco errores en una pasada', () => {
    expect(errores(FUENTE_ERROR_SEMANTICO)).toEqual([
      [
        1,
        15,
        "no se puede asignar dec a 'edad' de tipo ent (pérdida de precisión)",
      ],
      [3, 1, "no se puede modificar la constante 'iva'"],
      [4, 5, "no se puede leer en la constante 'iva' con lee"],
      [
        5,
        13,
        'tipos incompatibles txt + ent: no se puede sumar texto y número',
      ],
      [6, 4, "la condición de 'si' debe ser bool y es ent"],
    ])
    const r = compile(FUENTE_ERROR_SEMANTICO)
    expect(r.faseFallida).toBe('semantico')
    expect(r.tresDirecciones).toEqual([])
    expect(r.tablaSimbolos[0]).toMatchObject({
      nombre: 'edad',
      inicializado: false,
    })
  })

  it('la traza termina con el resumen', () => {
    expect(analizar(FUENTE_TIPOS).traza.at(-1)).toMatchObject({
      accion: 'fin',
      resultado: '0 errores, 2 advertencias',
    })
    expect(analizar(FUENTE_ERROR_SEMANTICO).traza.at(-1)?.resultado).toBe(
      '5 errores',
    )
    expect(analizar('va ent x = 1.5\ndi x').traza.at(-1)?.resultado).toBe(
      '1 error',
    )
  })
})

describe('semántico: declaraciones (M3, M4, M5)', () => {
  it('identificador no declarado', () => {
    expect(errores('di j')).toEqual([[1, 4, "identificador no declarado 'j'"]])
    expect(errores('lee j')).toEqual([[1, 5, "identificador no declarado 'j'"]])
    expect(errores('j = 1')).toEqual([[1, 1, "identificador no declarado 'j'"]])
  })

  it('uso antes de la declaración', () => {
    expect(errores('di total\nva ent total = 1')).toEqual([
      [1, 4, "'total' se usa antes de su declaración (línea 2)"],
    ])
    expect(mensajes('va ent x = x')).toEqual([
      "'x' se usa en su propia declaración: todavía no tiene valor",
    ])
    expect(mensajes('cn ent K = K + 1')).toEqual([
      "'K' se usa en su propia declaración: todavía no tiene valor",
    ])
    expect(mensajes('va ent a = b, b = 1\ndi a')).toEqual([
      "'b' se usa antes de su declaración (línea 1)",
    ])
  })

  it('declaración duplicada', () => {
    expect(errores('va ent edad\nva ent edad\ndi edad')).toEqual([
      [2, 8, "'edad' ya fue declarada en la línea 1"],
    ])
    expect(mensajes('va ent a, a\ndi a')).toEqual([
      "'a' ya fue declarada en la línea 1",
    ])
    expect(mensajes('cn ent a = 1\nva txt a\ndi a')).toEqual([
      "'a' ya fue declarada en la línea 1",
    ])
  })

  it('no se modifica ni se lee una constante', () => {
    expect(mensajes('cn dec iva = 0.19\niva = 0.2\nlee iva\ndi iva')).toEqual([
      "no se puede modificar la constante 'iva'",
      "no se puede leer en la constante 'iva' con lee",
    ])
  })
})

describe('semántico: tipos (M6 a M11)', () => {
  it('tipos incompatibles en operaciones', () => {
    expect(mensajes('di "a" + 1')).toEqual([
      'tipos incompatibles txt + ent: no se puede sumar texto y número',
    ])
    expect(mensajes('di 1 + verdadero')).toEqual([
      'tipos incompatibles ent + bool: no se puede operar con valores bool',
    ])
    expect(mensajes('di "a" * 2')).toEqual([
      "tipos incompatibles txt * ent: '*' solo funciona con números",
    ])
    expect(mensajes('di "a" - "b"')).toEqual([
      "tipos incompatibles txt - txt: con texto solo se puede usar '+' (concatenación)",
    ])
    expect(mensajes('di -"a"')).toEqual([
      'el menos unario necesita un número y recibe txt',
    ])
  })

  it('un error no se repite en las expresiones que lo contienen', () => {
    expect(mensajes('di ("a" + 1) * 2 + j')).toEqual([
      'tipos incompatibles txt + ent: no se puede sumar texto y número',
      "identificador no declarado 'j'",
    ])
  })

  it('asignaciones: ent ← dec es error, dec ← ent se convierte', () => {
    expect(errores('va ent x = 3.5\ndi x')).toEqual([
      [
        1,
        12,
        "no se puede asignar dec a 'x' de tipo ent (pérdida de precisión)",
      ],
    ])
    expect(mensajes('va txt t = 1\ndi t')).toEqual([
      "no se puede asignar ent a 't' de tipo txt",
    ])
    const r = analizar('va dec d = 5\ndi d')
    expect(r.errores).toEqual([])
    expect(r.advertencias.map((a) => a.mensaje)).toEqual([
      "conversión implícita de ent a dec al asignar a 'd'",
    ])
    expect(r.tabla.buscar('d')?.valor).toBe(5)
    expect(r.traza.find((p) => p.accion === 'asignar')).toMatchObject({
      detalle: 'd = 5.0 : dec',
      resultado: 'valor inicial d = 5.0',
    })
  })

  it('comparaciones', () => {
    expect(mensajes('di "a" == 3')).toEqual([
      'comparación inválida txt == ent: solo se comparan números entre sí, textos entre sí o bool entre sí',
    ])
    expect(mensajes('di "a" > "b"')).toEqual([
      "comparación inválida txt > txt: '>' solo compara números",
    ])
    expect(
      mensajes('di "a" == "b"\ndi 1 < 2.5\ndi verdadero != falso'),
    ).toEqual([])
  })

  it('si: la condición debe ser bool', () => {
    expect(errores('va ent edad = 1\nsi edad di "x"')).toEqual([
      [2, 4, "la condición de 'si' debe ser bool y es ent"],
    ])
    expect(mensajes('va ent e = 1\nsi e > 1 di "x" no di "y"')).toEqual([])
  })

  it('rep: ent y, si es literal, mayor que 0', () => {
    expect(errores('rep 2.5 di "x"')).toEqual([
      [1, 5, "'rep' necesita un número ent de vueltas y recibe dec"],
    ])
    expect(mensajes('rep 0 di "x"')).toEqual([
      "'rep' necesita un número de vueltas mayor que 0 y recibe 0",
    ])
    expect(mensajes('rep -2 di "x"')).toEqual([
      "'rep' necesita un número de vueltas mayor que 0 y recibe -2",
    ])
    expect(mensajes('rep 3 di "x"')).toEqual([])
  })

  it('división entre el literal 0 y literal ent fuera de rango', () => {
    expect(errores('di 5 / 0')).toEqual([[1, 8, 'división entre el literal 0']])
    expect(mensajes('di 2147483648')).toEqual([
      'el literal 2147483648 está fuera del rango de ent (máximo 2147483647); solo cabe negativo, como -2147483648',
    ])
    expect(mensajes('di 2147483649')).toEqual([
      'el literal 2147483649 está fuera del rango de ent (máximo 2147483647)',
    ])
    expect(mensajes('di -2147483648\ndi 2147483647')).toEqual([])
  })

  it('sobrecarga de +: suma o concatenación en la traza', () => {
    const ops = (f: string) =>
      analizar(f)
        .traza.filter((p) => p.accion === 'operacion')
        .map((p) => `${p.detalle} → ${p.resultado}`)
    expect(ops('di 1 + 2\ndi "a" + "b"\ndi 1.5 + 2')).toEqual([
      '1 + 2 : ent + ent (suma) → ent',
      '"a" + "b" : txt + txt (concatenación) → txt',
      '1.5 + 2 : dec + ent (suma) → dec',
    ])
    expect(ops('va ent a = 1\ndi a / a')).toEqual([
      'a / a : ent / ent → dec (el divisor no es un literal: se revisa al ejecutar)',
    ])
  })
})

describe('semántico: atributos (M12) y advertencias (M13)', () => {
  it('cada expresión sintetiza su tipo; los literales, también su valor', () => {
    const [, di] = analizar('va dec a = 1.5\ndi a * 2 >= 1').ast.instrucciones
    if (di.tipo !== 'Di' || di.valor.tipo !== 'Binaria')
      throw new Error('se esperaba di con comparación')
    expect(di.valor.anot).toEqual({ tipo: 'bool' })
    expect(di.valor.izq.anot).toEqual({ tipo: 'dec' })
    expect(di.valor.der.anot).toEqual({ tipo: 'ent', valor: 1 })
  })

  it('anota el árbol del parser sin copiarlo (R3)', () => {
    const sin = analizarSintactico(analizarLexico('di 1').tokens)
    const sem = analizarSemantico(sin.ast)
    expect(sem.ast).toBe(sin.ast)
    const di = sin.ast.instrucciones[0] as Extract<Instr, { tipo: 'Di' }>
    expect(di.valor.anot).toEqual({ tipo: 'ent', valor: 1 })
  })

  it('variable nunca usada y sin valor; las constantes no avisan', () => {
    expect(avisos('va ent a\ncn ent k = 1')).toEqual([
      "'a' fue declarada en la línea 1 y nunca se usa",
    ])
    expect(avisos('va ent a\ndi a\ndi a')).toEqual([
      "'a' se usa sin valor explícito ni lee: vale 0 (valor por defecto)",
    ])
    expect(avisos('va ent a\nlee a\ndi a')).toEqual([])
    expect(avisos('va ent a\na = 2\ndi a')).toEqual([])
  })

  it('condición constante', () => {
    expect(avisos('si verdadero di 1')).toEqual([
      'la condición es constante: siempre es verdadero',
    ])
  })

  it('las advertencias no detienen la compilación', () => {
    const r = compile('va ent a\nsi falso di 1\n')
    expect(r).toMatchObject({ ok: true, faseFallida: null })
    expect(r.advertencias).toHaveLength(2)
    expect(r.traza.length).toBeGreaterThan(0)
  })

  it('lee, asignación y referencias en la tabla', () => {
    const r = analizar('va ent n\nlee n\nn = n + 1\nrep n di n')
    expect(r.tabla.buscar('n')).toMatchObject({
      usado: true,
      inicializado: true,
      lineasReferencia: [2, 3, 4],
    })
    expect(r.traza.map((p) => p.accion)).toContain('leer')
    expect(r.traza.find((p) => p.accion === 'repetir')?.resultado).toBe(
      'tipo correcto: las vueltas se conocen al ejecutar',
    )
  })

  it('cada paso guarda su propia instantánea de la tabla', () => {
    const { traza } = analizar('va ent a = 1\nva ent b = a')
    expect(traza[0].simbolos).toEqual([])
    expect(traza.at(-1)?.simbolos.map((s) => s.nombre)).toEqual(['a', 'b'])
  })
})
