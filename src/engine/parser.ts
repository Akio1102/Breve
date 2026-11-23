import { instruccionParecida, quisoDecir, tipoParecido } from './sugerencias'
import type {
  DeclVar,
  Diagnostico,
  Expr,
  Instr,
  OpBinario,
  Programa,
  TipoDato,
  TipoToken,
  Token,
} from './types'

export interface ResultadoSintactico {
  ast: Programa
  errores: Diagnostico[]
}

export function analizarSintactico(
  tokens: readonly Token[],
): ResultadoSintactico {
  const p = new Parser(tokens)
  const ast = p.programa()
  return { ast, errores: p.errores }
}

class ErrorSintactico extends Error {
  readonly diagnostico: Diagnostico
  constructor(diagnostico: Diagnostico) {
    super(diagnostico.mensaje)
    this.diagnostico = diagnostico
  }
}

const TIPOS: Partial<Record<TipoToken, TipoDato>> = {
  T_ENT: 'ent',
  T_DEC: 'dec',
  T_TXT: 'txt',
  T_BOOL: 'bool',
}

const LITERALES: Partial<Record<TipoToken, TipoDato>> = {
  ENTERO: 'ent',
  DECIMAL: 'dec',
  CADENA: 'txt',
  VERDADERO: 'bool',
  FALSO: 'bool',
}

const pos = (t: Token) => ({ linea: t.linea, columna: t.columna })

const ancho = (t: Token) => [...t.lexema].length

export const MAX_PROFUNDIDAD = 256

class Parser {
  private i = 0
  readonly errores: Diagnostico[] = []
  private anidamiento = 0
  private readonly altura = new WeakMap<Expr, number>()

  private readonly tokens: readonly Token[]

  constructor(tokens: readonly Token[]) {
    this.tokens = tokens
  }

  private get actual(): Token | undefined {
    return this.tokens[this.i]
  }

  private get anterior(): Token | undefined {
    return this.tokens[this.i - 1]
  }

  private ver(...tipos: TipoToken[]): boolean {
    const t = this.actual
    return !!t && tipos.includes(t.tipo)
  }

  private avanzar(): Token {
    const t = this.tokens[this.i]
    this.i++
    return t
  }

  private finDeLinea(): boolean {
    return !this.actual || this.actual.tipo === 'SALTO'
  }

  private despues(): string {
    const t = this.anterior
    return t ? ` después de '${t.lexema}'` : ''
  }

  private encontrado(): string {
    return this.finDeLinea() ? '' : ` y se encontró '${this.actual?.lexema}'`
  }

  private fallar(mensaje: string, en?: Token): never {
    let t = en ?? this.actual
    if (!en && this.finDeLinea()) t = this.anterior
    throw new ErrorSintactico({
      fase: 'sintactico',
      linea: t?.linea ?? 1,
      columna: t?.columna ?? 1,
      largo: Math.max(1, [...(t?.lexema ?? ' ')].length),
      mensaje,
    })
  }

  private esperarId(): Token {
    if (this.ver('ID')) return this.avanzar()
    return this.fallar(
      `se esperaba un identificador${this.despues()}${this.encontrado()}`,
    )
  }

  private sincronizar() {
    while (!this.finDeLinea()) this.i++
  }

  programa(): Programa {
    const instrucciones: Instr[] = []
    while (this.actual) {
      if (this.ver('SALTO')) {
        this.avanzar()
        continue
      }
      try {
        const instr = this.instruccion()
        if (!this.finDeLinea())
          this.fallar(
            `se esperaba el fin de la línea${this.despues()}${this.encontrado()}`,
          )
        instrucciones.push(instr)
      } catch (e) {
        if (!(e instanceof ErrorSintactico)) throw e
        this.errores.push(e.diagnostico)
        this.anidamiento = 0
        this.sincronizar()
      }
    }
    return { instrucciones }
  }

  private instruccion(): Instr {
    const t = this.actual as Token
    switch (t.tipo) {
      case 'VA': {
        this.avanzar()
        const tipoDato = this.tipo()
        const vars = [this.variable()]
        while (this.ver('COMA')) {
          this.avanzar()
          vars.push(this.variable())
        }
        return { tipo: 'Va', tipoDato, vars, ...pos(t) }
      }
      case 'CN': {
        this.avanzar()
        const tipoDato = this.tipo()
        const id = this.esperarId()
        const nombre = id.lexema
        if (!this.ver('IGUAL'))
          this.fallar(
            `la constante '${nombre}' debe inicializarse (falta '= expr')`,
          )
        this.avanzar()
        return {
          tipo: 'Cn',
          tipoDato,
          nombre,
          posNombre: pos(id),
          valor: this.expr(),
          ...pos(t),
        }
      }
      case 'LEE': {
        this.avanzar()
        const id = this.esperarId()
        return { tipo: 'Lee', nombre: id.lexema, posNombre: pos(id), ...pos(t) }
      }
      case 'DI':
      case 'ID':
        return this.simple('')
      case 'SI': {
        this.avanzar()
        const cond = this.expr()
        const entonces = this.simple(' después de la condición')
        if (!this.ver('NO')) return { tipo: 'Si', cond, entonces, ...pos(t) }
        this.avanzar()
        const sino = this.simple(" después de 'no'")
        return { tipo: 'Si', cond, entonces, sino, ...pos(t) }
      }
      case 'REP': {
        this.avanzar()
        const veces = this.expr()
        const cuerpo = this.simple(' después del número de repeticiones')
        return { tipo: 'Rep', veces, cuerpo, ...pos(t) }
      }
      case 'NO':
        return this.fallar(
          "'no' solo puede ir en la misma línea de un 'si', después de su instrucción",
        )
      default:
        return this.fallar(
          `se esperaba una instrucción (va, cn, lee, di, si, rep o una asignación) y se encontró '${t.lexema}'`,
        )
    }
  }

  private simple(contexto: string): Instr {
    const t = this.actual
    if (t?.tipo === 'DI') {
      this.avanzar()
      return { tipo: 'Di', valor: this.expr(), ...pos(t) }
    }
    if (t?.tipo === 'ID') {
      this.avanzar()
      if (!this.ver('IGUAL')) {
        const reservada = instruccionParecida(t.lexema)
        if (reservada)
          this.fallar(
            `'${t.lexema}' no es una instrucción${quisoDecir(reservada)} (las palabras reservadas van en minúsculas)`,
            t,
          )
        this.fallar(
          `se esperaba '=' después de '${t.lexema}'${this.encontrado()}`,
        )
      }
      this.avanzar()
      return { tipo: 'Asig', nombre: t.lexema, valor: this.expr(), ...pos(t) }
    }
    return this.fallar(
      `se esperaba una instrucción simple (di o asignación)${contexto}${this.encontrado()}`,
    )
  }

  private tipo(): TipoDato {
    const tipo = this.actual && TIPOS[this.actual.tipo]
    if (tipo) {
      this.avanzar()
      return tipo
    }
    const parecido =
      this.actual?.tipo === 'ID' ? tipoParecido(this.actual.lexema) : null
    return this.fallar(
      `se esperaba un tipo de dato (ent, dec, txt, bool)${this.despues()}${this.encontrado()}${quisoDecir(parecido)}`,
    )
  }

  private variable(): DeclVar {
    const id = this.esperarId()
    const decl: DeclVar = { nombre: id.lexema, ...pos(id) }
    if (this.ver('IGUAL')) {
      this.avanzar()
      decl.valor = this.expr()
    }
    return decl
  }

  private expr(): Expr {
    const izq = this.aritm()
    if (!this.ver('COMP')) return izq
    const op = this.avanzar()
    const der = this.aritm()
    if (this.ver('COMP'))
      this.fallar(
        `no se pueden encadenar comparaciones: sobra '${this.actual?.lexema}'`,
      )
    return this.binaria(op, izq, der)
  }

  private aritm(): Expr {
    let e = this.termino()
    while (this.ver('MAS', 'MENOS')) {
      const op = this.avanzar()
      e = this.binaria(op, e, this.termino())
    }
    return e
  }

  private termino(): Expr {
    let e = this.factor()
    while (this.ver('POR', 'ENTRE')) {
      const op = this.avanzar()
      e = this.binaria(op, e, this.factor())
    }
    return e
  }

  private anidar(t: Token) {
    if (++this.anidamiento > MAX_PROFUNDIDAD)
      this.fallar(
        `expresión demasiado anidada: el máximo es ${MAX_PROFUNDIDAD} niveles de paréntesis o signos '-'`,
        t,
      )
  }

  private factor(): Expr {
    const t = this.actual
    if (t?.tipo === 'MENOS') {
      this.avanzar()
      this.anidar(t)
      const expr = this.factor()
      this.anidamiento--
      return this.medir(
        {
          tipo: 'Unaria',
          op: '-',
          expr,
          ...pos(t),
          desde: t.columna,
          hasta: expr.hasta,
        },
        t,
        expr,
      )
    }
    if (t?.tipo === 'PAR_ABRE') {
      this.avanzar()
      this.anidar(t)
      const e = this.expr()
      if (this.ver('PAR_CIERRA')) {
        const cierra = this.avanzar()
        this.anidamiento--
        e.desde = t.columna
        e.hasta = cierra.columna + 1
        e.parentesis = (e.parentesis ?? 0) + 1
        return e
      }
      if (this.finDeLinea())
        this.fallar(
          "paréntesis sin cerrar: se esperaba ')' antes del fin de línea",
          t,
        )
      return this.fallar(`se esperaba ')'${this.encontrado()}`)
    }
    const tipoDato = t && LITERALES[t.tipo]
    if (t && tipoDato) {
      this.avanzar()
      return {
        tipo: 'Lit',
        tipoDato,
        valor: t.valor ?? t.lexema,
        lexema: t.lexema,
        ...pos(t),
        desde: t.columna,
        hasta: t.columna + ancho(t),
      }
    }
    if (t?.tipo === 'ID') {
      this.avanzar()
      return {
        tipo: 'Id',
        nombre: t.lexema,
        ...pos(t),
        desde: t.columna,
        hasta: t.columna + ancho(t),
      }
    }
    return this.fallar(
      `se esperaba una expresión${this.despues()}${this.encontrado()}`,
    )
  }

  private binaria(op: Token, izq: Expr, der: Expr): Expr {
    const e: Expr = {
      tipo: 'Binaria',
      op: op.lexema as OpBinario,
      izq,
      der,
      ...pos(op),
      desde: izq.desde,
      hasta: der.hasta,
    }
    return this.medir(e, op, izq, der)
  }

  private medir(e: Expr, t: Token, a: Expr, b?: Expr): Expr {
    const ha = this.altura.get(a) ?? 1
    const hb = b ? (this.altura.get(b) ?? 1) : 0
    const h = 1 + (ha > hb ? ha : hb)
    if (h > MAX_PROFUNDIDAD)
      this.fallar(
        `expresión demasiado larga: el máximo es ${MAX_PROFUNDIDAD} operaciones encadenadas; divídela en varias instrucciones`,
        t,
      )
    this.altura.set(e, h)
    return e
  }
}
