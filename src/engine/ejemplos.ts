import type { Cuadrupla, InstruccionTAC, TipoDato, Tripleta } from './types'

export const FUENTE_POTENCIA = `// potencia.brv : calcula base elevado a exponente
va txt nombre
va ent base, exponente
va ent potencia = 1
lee nombre
lee base
lee exponente
di "Hola " + nombre
rep exponente potencia = potencia * base
di "Resultado:"
di potencia
si potencia > 100 di "Resultado grande" no di "Resultado pequeño"
`

export const FUENTE_TIPOS = `va ent edad = 20
cn dec iva = 0.19
va txt nombre = "Ana"
va dec total = 10 * iva
va ent x, y
si edad >= 18 di nombre + " es adulta" no di "Menor"
rep 3 edad = edad + 1
di total
di x
`

export const FUENTE_ERROR_LEXICO = `va ent x = 5 @
va dec y = 3.
di "Hola
`

export const FUENTE_ERROR_SINTACTICO = `va edad = 20
cn ent x
lee
si edad >= 18
di (2 + 3
`

export const FUENTE_ERROR_SEMANTICO = `va ent edad = 3.5
cn dec iva = 0.19
iva = 0.2
lee iva
di "Edad: " + edad
si edad di "adulto"
`

export const FUENTE_ERROR_EJECUCION = `// division.brv : el divisor se lee al ejecutar
va ent a, b
lee a
lee b
di a / b
`

export const ENTRADAS_POTENCIA = [
  'Ana\n2\n5',
  'Ana\n3\n5',
  'Ana\n2\n0',
  'Ana\nabc\n5',
  'Ana',
] as const
export const ENTRADAS_EJECUCION = ['10\n0', '10\n4'] as const

const tac = {
  asig: (destino: string, origen: string, linea: number): InstruccionTAC => ({
    op: 'asig',
    destino,
    origen,
    linea,
  }),
  bin: (
    destino: string,
    izq: string,
    operador: string,
    der: string,
    linea: number,
  ): InstruccionTAC => ({ op: 'bin', destino, izq, operador, der, linea }),
  read: (destino: string, linea: number): InstruccionTAC => ({
    op: 'read',
    destino,
    linea,
  }),
  write: (origen: string, linea: number): InstruccionTAC => ({
    op: 'write',
    origen,
    linea,
  }),
  if: (condicion: string, salto: number, linea: number): InstruccionTAC => ({
    op: 'if',
    condicion,
    salto,
    linea,
  }),
  goto: (salto: number, linea?: number): InstruccionTAC =>
    linea === undefined ? { op: 'goto', salto } : { op: 'goto', salto, linea },
  halt: (): InstruccionTAC => ({ op: 'halt' }),
}

const T = (op: string, arg1 = '', arg2 = ''): Tripleta => ({ op, arg1, arg2 })
const C = (op: string, arg1 = '', arg2 = '', resultado = ''): Cuadrupla => ({
  op,
  arg1,
  arg2,
  resultado,
})

const TAC_POTENCIA: InstruccionTAC[] = [
  tac.asig('potencia', '1', 4),
  tac.read('nombre', 5),
  tac.read('base', 6),
  tac.read('exponente', 7),
  tac.bin('t1', '"Hola "', '+', 'nombre', 8),
  tac.write('t1', 8),
  tac.asig('_c1', '0', 9),
  tac.bin('t2', '_c1', '>=', 'exponente', 9),
  tac.if('t2', 14, 9),
  tac.bin('t3', 'potencia', '*', 'base', 9),
  tac.asig('potencia', 't3', 9),
  tac.bin('t4', '_c1', '+', '1', 9),
  tac.asig('_c1', 't4', 9),
  tac.goto(7, 9),
  tac.write('"Resultado:"', 10),
  tac.write('potencia', 11),
  tac.bin('t5', 'potencia', '>', '100', 12),
  tac.if('t5', 20, 12),
  tac.write('"Resultado pequeño"', 12),
  tac.goto(21, 12),
  tac.write('"Resultado grande"', 12),
  tac.halt(),
]

const TRIPLETAS_POTENCIA: Tripleta[] = [
  T('=', 'potencia', '1'),
  T('read', 'nombre'),
  T('read', 'base'),
  T('read', 'exponente'),
  T('+', '"Hola "', 'nombre'),
  T('write', '(4)'),
  T('=', '_c1', '0'),
  T('>=', '_c1', 'exponente'),
  T('if', '(7)', '(14)'),
  T('*', 'potencia', 'base'),
  T('=', 'potencia', '(9)'),
  T('+', '_c1', '1'),
  T('=', '_c1', '(11)'),
  T('goto', '(7)'),
  T('write', '"Resultado:"'),
  T('write', 'potencia'),
  T('>', 'potencia', '100'),
  T('if', '(16)', '(20)'),
  T('write', '"Resultado pequeño"'),
  T('goto', '(21)'),
  T('write', '"Resultado grande"'),
  T('halt'),
]

const CUADRUPLAS_POTENCIA: Cuadrupla[] = [
  C('=', '1', '', 'potencia'),
  C('read', '', '', 'nombre'),
  C('read', '', '', 'base'),
  C('read', '', '', 'exponente'),
  C('+', '"Hola "', 'nombre', 't1'),
  C('write', 't1'),
  C('=', '0', '', '_c1'),
  C('>=', '_c1', 'exponente', 't2'),
  C('if', 't2', '', '14'),
  C('*', 'potencia', 'base', 't3'),
  C('=', 't3', '', 'potencia'),
  C('+', '_c1', '1', 't4'),
  C('=', 't4', '', '_c1'),
  C('goto', '', '', '7'),
  C('write', '"Resultado:"'),
  C('write', 'potencia'),
  C('>', 'potencia', '100', 't5'),
  C('if', 't5', '', '20'),
  C('write', '"Resultado pequeño"'),
  C('goto', '', '', '21'),
  C('write', '"Resultado grande"'),
  C('halt'),
]

export interface CodigoReferencia {
  tresDirecciones: InstruccionTAC[]
  tripletas: Tripleta[]
  cuadruplas: Cuadrupla[]
  temporales: [nombre: string, tipo: TipoDato, linea: number][]
}

const CODIGO_POTENCIA: CodigoReferencia = {
  tresDirecciones: TAC_POTENCIA,
  tripletas: TRIPLETAS_POTENCIA,
  cuadruplas: CUADRUPLAS_POTENCIA,
  temporales: [
    ['t1', 'txt', 8],
    ['_c1', 'ent', 9],
    ['t2', 'bool', 9],
    ['t3', 'ent', 9],
    ['t4', 'ent', 9],
    ['t5', 'bool', 12],
  ],
}

const CODIGO_TIPOS: CodigoReferencia = {
  tresDirecciones: [
    tac.asig('edad', '20', 1),
    tac.asig('iva', '0.19', 2),
    tac.asig('nombre', '"Ana"', 3),
    tac.bin('t1', '10', '*', 'iva', 4),
    tac.asig('total', 't1', 4),
    tac.bin('t2', 'edad', '>=', '18', 6),
    tac.if('t2', 9, 6),
    tac.write('"Menor"', 6),
    tac.goto(11, 6),
    tac.bin('t3', 'nombre', '+', '" es adulta"', 6),
    tac.write('t3', 6),
    tac.asig('_c1', '0', 7),
    tac.bin('t4', '_c1', '>=', '3', 7),
    tac.if('t4', 19, 7),
    tac.bin('t5', 'edad', '+', '1', 7),
    tac.asig('edad', 't5', 7),
    tac.bin('t6', '_c1', '+', '1', 7),
    tac.asig('_c1', 't6', 7),
    tac.goto(12, 7),
    tac.write('total', 8),
    tac.write('x', 9),
    tac.halt(),
  ],
  tripletas: [
    T('=', 'edad', '20'),
    T('=', 'iva', '0.19'),
    T('=', 'nombre', '"Ana"'),
    T('*', '10', 'iva'),
    T('=', 'total', '(3)'),
    T('>=', 'edad', '18'),
    T('if', '(5)', '(9)'),
    T('write', '"Menor"'),
    T('goto', '(11)'),
    T('+', 'nombre', '" es adulta"'),
    T('write', '(9)'),
    T('=', '_c1', '0'),
    T('>=', '_c1', '3'),
    T('if', '(12)', '(19)'),
    T('+', 'edad', '1'),
    T('=', 'edad', '(14)'),
    T('+', '_c1', '1'),
    T('=', '_c1', '(16)'),
    T('goto', '(12)'),
    T('write', 'total'),
    T('write', 'x'),
    T('halt'),
  ],
  cuadruplas: [
    C('=', '20', '', 'edad'),
    C('=', '0.19', '', 'iva'),
    C('=', '"Ana"', '', 'nombre'),
    C('*', '10', 'iva', 't1'),
    C('=', 't1', '', 'total'),
    C('>=', 'edad', '18', 't2'),
    C('if', 't2', '', '9'),
    C('write', '"Menor"'),
    C('goto', '', '', '11'),
    C('+', 'nombre', '" es adulta"', 't3'),
    C('write', 't3'),
    C('=', '0', '', '_c1'),
    C('>=', '_c1', '3', 't4'),
    C('if', 't4', '', '19'),
    C('+', 'edad', '1', 't5'),
    C('=', 't5', '', 'edad'),
    C('+', '_c1', '1', 't6'),
    C('=', 't6', '', '_c1'),
    C('goto', '', '', '12'),
    C('write', 'total'),
    C('write', 'x'),
    C('halt'),
  ],
  temporales: [
    ['t1', 'dec', 4],
    ['t2', 'bool', 6],
    ['t3', 'txt', 6],
    ['_c1', 'ent', 7],
    ['t4', 'bool', 7],
    ['t5', 'ent', 7],
    ['t6', 'ent', 7],
  ],
}

const CODIGO_DIVISION: CodigoReferencia = {
  tresDirecciones: [
    tac.read('a', 3),
    tac.read('b', 4),
    tac.bin('t1', 'a', '/', 'b', 5),
    tac.write('t1', 5),
    tac.halt(),
  ],
  tripletas: [
    T('read', 'a'),
    T('read', 'b'),
    T('/', 'a', 'b'),
    T('write', '(2)'),
    T('halt'),
  ],
  cuadruplas: [
    C('read', '', '', 'a'),
    C('read', '', '', 'b'),
    C('/', 'a', 'b', 't1'),
    C('write', 't1'),
    C('halt'),
  ],
  temporales: [['t1', 'dec', 5]],
}

const CODIGOS: Record<string, CodigoReferencia> = {
  [FUENTE_POTENCIA]: CODIGO_POTENCIA,
  [FUENTE_TIPOS]: CODIGO_TIPOS,
  [FUENTE_ERROR_EJECUCION]: CODIGO_DIVISION,
}

export function codigoReferencia(fuente: string): CodigoReferencia | null {
  return CODIGOS[fuente] ?? null
}
