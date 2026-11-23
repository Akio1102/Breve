import { formatValor } from '@engine/formato'
import type {
  Anotacion,
  DeclVar,
  Diagnostico,
  Expr,
  Instr,
  OpBinario,
  Programa,
  TipoDato,
  TipoToken,
} from '@engine/types'

export interface Attr {
  name: string
  value: string
  kind: 'inh' | 'syn'
}

export type Rol = 'cond' | 'whenTrue' | 'whenFalse' | 'times' | 'body'

export interface Nodo {
  id: string
  texto: string
  clase: string
  terminal: boolean
  rol?: Rol
  linea: number
  columna: number
  desde?: number
  hasta?: number
  instr: number
  esInstruccion: boolean
  attrs: Attr[]
  hijos: Nodo[]
  descartada?: string
}

export type ModoArbol = 'abstract' | 'derivation'

const TIPO_TOKEN: Record<TipoDato, TipoToken> = {
  ent: 'T_ENT',
  dec: 'T_DEC',
  txt: 'T_TXT',
  bool: 'T_BOOL',
}

const OP_TOKEN: Record<OpBinario, TipoToken> = {
  '+': 'MAS',
  '-': 'MENOS',
  '*': 'POR',
  '/': 'ENTRE',
  '>': 'COMP',
  '<': 'COMP',
  '>=': 'COMP',
  '<=': 'COMP',
  '==': 'COMP',
  '!=': 'COMP',
}

const esComparacion = (op: OpBinario) => OP_TOKEN[op] === 'COMP'
const esSuma = (op: OpBinario) => op === '+' || op === '-'
const esProducto = (op: OpBinario) => op === '*' || op === '/'

function noTerminal(op: OpBinario): string {
  if (esSuma(op)) return 'aritm'
  if (esProducto(op)) return 'termino'
  return 'expr'
}

function tokenLiteral(e: Extract<Expr, { tipo: 'Lit' }>): TipoToken {
  switch (e.tipoDato) {
    case 'ent':
      return 'ENTERO'
    case 'dec':
      return 'DECIMAL'
    case 'txt':
      return 'CADENA'
    case 'bool':
      return e.valor ? 'VERDADERO' : 'FALSO'
  }
}

function sintetizados(anot: Anotacion | undefined): Attr[] {
  if (!anot) return []
  const out: Attr[] = [{ name: 'tipo', value: anot.tipo, kind: 'syn' }]
  if (anot.valor !== undefined)
    out.push({
      name: 'valor',
      value: formatValor(anot.valor, anot.tipo),
      kind: 'syn',
    })
  return out
}

const dtype = (t: TipoDato, kind: Attr['kind']): Attr => ({
  name: 'dtype',
  value: t,
  kind,
})

class Constructor {
  instr = -1

  nodo(
    texto: string,
    clase: string,
    pos: { linea: number; columna: number; desde?: number; hasta?: number },
    opciones: {
      terminal?: boolean
      rol?: Rol
      attrs?: Attr[]
      hijos?: Nodo[]
      esInstruccion?: boolean
    } = {},
  ): Nodo {
    return {
      id: '',
      texto,
      clase,
      terminal: opciones.terminal ?? false,
      rol: opciones.rol,
      linea: pos.linea,
      columna: pos.columna,
      desde: pos.desde,
      hasta: pos.hasta,
      instr: this.instr,
      esInstruccion: opciones.esInstruccion ?? false,
      attrs: opciones.attrs ?? [],
      hijos: opciones.hijos ?? [],
    }
  }

  token(
    texto: string,
    tipo: TipoToken,
    pos: { linea: number; columna: number },
    exacto = true,
  ) {
    return this.nodo(
      texto,
      tipo,
      exacto
        ? { ...pos, desde: pos.columna, hasta: pos.columna + [...texto].length }
        : pos,
      { terminal: true },
    )
  }
}

const esInstruccionGramatica = (n: Nodo) =>
  n.clase === 'instruccion' || n.clase === 'simple'

function numerar(n: Nodo, id = '0'): Nodo {
  n.id = id
  n.hijos.forEach((h, i) => {
    numerar(h, `${id}.${i}`)
  })
  if (
    n.clase === 'programa' ||
    (n.desde !== undefined && n.hasta !== undefined)
  )
    return n
  let desde = esInstruccionGramatica(n) ? n.columna : Number.POSITIVE_INFINITY
  let hasta = Number.NEGATIVE_INFINITY
  for (const h of n.hijos)
    if (h.desde !== undefined && h.hasta !== undefined && h.linea === n.linea) {
      desde = Math.min(desde, h.desde)
      hasta = Math.max(hasta, h.hasta)
    }
  if (hasta > desde) {
    n.desde = desde
    n.hasta = hasta
  }
  return n
}

const conRol = (n: Nodo, rol: Rol): Nodo => ({ ...n, rol })

export function arbolAbstracto(programa: Programa): Nodo {
  const c = new Constructor()

  const expr = (e: Expr): Nodo => {
    const attrs = sintetizados(e.anot)
    switch (e.tipo) {
      case 'Lit':
        return c.nodo(e.lexema, tokenLiteral(e), e, { terminal: true, attrs })
      case 'Id':
        return c.nodo(e.nombre, 'ID', e, { terminal: true, attrs })
      case 'Unaria':
        return c.nodo('-', 'factor', e, { attrs, hijos: [expr(e.expr)] })
      case 'Binaria':
        return c.nodo(e.op, noTerminal(e.op), e, {
          attrs,
          hijos: [expr(e.izq), expr(e.der)],
        })
    }
  }

  const variable = (v: DeclVar, tipo: TipoDato, prefijo = ''): Nodo =>
    c.nodo(
      `${prefijo}${v.nombre}${v.valor ? ' =' : ''}`,
      'var',
      {
        ...v,
        desde: v.columna,
        hasta: v.valor?.hasta ?? v.columna + [...v.nombre].length,
      },
      {
        attrs: [dtype(tipo, 'inh')],
        hijos: v.valor ? [expr(v.valor)] : [],
      },
    )

  const instruccion = (i: Instr, clase: string): Nodo => {
    const primera = clase === 'instruccion'
    const op = { esInstruccion: primera }
    switch (i.tipo) {
      case 'Va': {
        if (i.vars.length === 1)
          return {
            ...variable(i.vars[0], i.tipoDato, `va ${i.tipoDato} `),
            clase,
            linea: i.linea,
            columna: i.columna,
            desde: i.columna,
            ...op,
          }
        return c.nodo(`va ${i.tipoDato}`, clase, i, {
          ...op,
          attrs: [dtype(i.tipoDato, 'syn')],
          hijos: i.vars.map((v) => variable(v, i.tipoDato)),
        })
      }
      case 'Cn':
        return c.nodo(`cn ${i.tipoDato} ${i.nombre} =`, clase, i, {
          ...op,
          attrs: [
            dtype(i.tipoDato, 'inh'),
            { name: 'categoria', value: 'constante', kind: 'inh' },
          ],
          hijos: [expr(i.valor)],
        })
      case 'Lee':
        return c.nodo(
          `lee ${i.nombre}`,
          clase,
          {
            ...i,
            desde: i.columna,
            hasta: i.posNombre.columna + [...i.nombre].length,
          },
          op,
        )
      case 'Asig':
        return c.nodo(`${i.nombre} =`, clase, i, {
          ...op,
          hijos: [expr(i.valor)],
        })
      case 'Di':
        return c.nodo('di', clase, i, { ...op, hijos: [expr(i.valor)] })
      case 'Si':
        return c.nodo('si', clase, i, {
          ...op,
          hijos: [
            conRol(expr(i.cond), 'cond'),
            conRol(instruccion(i.entonces, 'simple'), 'whenTrue'),
            ...(i.sino
              ? [conRol(instruccion(i.sino, 'simple'), 'whenFalse')]
              : []),
          ],
        })
      case 'Rep':
        return c.nodo('rep', clase, i, {
          ...op,
          hijos: [
            conRol(expr(i.veces), 'times'),
            conRol(instruccion(i.cuerpo, 'simple'), 'body'),
          ],
        })
    }
  }

  const hijos = programa.instrucciones.map((ins, k) => {
    c.instr = k
    return instruccion(ins, 'instruccion')
  })
  c.instr = -1
  return numerar(c.nodo('', 'programa', { linea: 1, columna: 1 }, { hijos }))
}

export function arbolDerivacion(programa: Programa): Nodo {
  const c = new Constructor()

  const sinParentesis = (e: Expr): Expr => ({
    ...e,
    parentesis: (e.parentesis ?? 1) - 1,
  })
  const libre = (e: Expr) => !e.parentesis

  const paso = (clase: string, e: Expr, hijos: Nodo[], conAttrs: boolean) =>
    c.nodo('', clase, e, {
      attrs: conAttrs ? sintetizados(e.anot) : [],
      hijos,
    })

  const binaria = (
    e: Extract<Expr, { tipo: 'Binaria' }>,
    izq: Nodo,
    der: Nodo,
  ): Nodo[] => [izq, c.token(e.op, OP_TOKEN[e.op], e), der]

  const exprD = (e: Expr): Nodo =>
    e.tipo === 'Binaria' && libre(e) && esComparacion(e.op)
      ? paso('expr', e, binaria(e, aritm(e.izq), aritm(e.der)), true)
      : paso('expr', e, [aritm(e)], true)

  const aritm = (e: Expr): Nodo =>
    e.tipo === 'Binaria' && libre(e) && esSuma(e.op)
      ? paso('aritm', e, binaria(e, aritm(e.izq), termino(e.der)), true)
      : paso('aritm', e, [termino(e)], false)

  const termino = (e: Expr): Nodo =>
    e.tipo === 'Binaria' && libre(e) && esProducto(e.op)
      ? paso('termino', e, binaria(e, termino(e.izq), factor(e.der)), true)
      : paso('termino', e, [factor(e)], false)

  const factor = (e: Expr): Nodo => {
    if (!libre(e)) {
      const abre = { linea: e.linea, columna: e.desde ?? e.columna }
      const cierra = { linea: e.linea, columna: (e.hasta ?? e.columna) - 1 }
      return paso(
        'factor',
        e,
        [
          c.token('(', 'PAR_ABRE', abre, false),
          exprD(sinParentesis(e)),
          c.token(')', 'PAR_CIERRA', cierra, false),
        ],
        true,
      )
    }
    switch (e.tipo) {
      case 'Unaria':
        return paso(
          'factor',
          e,
          [c.token('-', 'MENOS', e), factor(e.expr)],
          true,
        )
      case 'Lit':
        return paso('factor', e, [c.token(e.lexema, tokenLiteral(e), e)], true)
      case 'Id':
        return paso('factor', e, [c.token(e.nombre, 'ID', e)], true)
      case 'Binaria':
        return paso('factor', e, [exprD(e)], true)
    }
  }

  const tipo = (t: TipoDato, pos: Instr) =>
    c.nodo('', 'tipo', pos, {
      attrs: [dtype(t, 'syn')],
      hijos: [c.token(t, TIPO_TOKEN[t], pos, false)],
    })

  const listaVars = (vars: DeclVar[], t: TipoDato, pos: Instr): Nodo => {
    const [v, ...resto] = vars
    const decl = c.nodo('', 'var', v, {
      attrs: [dtype(t, 'inh')],
      hijos: [
        c.token(v.nombre, 'ID', v),
        ...(v.valor ? [c.token('=', 'IGUAL', v, false), exprD(v.valor)] : []),
      ],
    })
    return c.nodo('', 'listaVars', pos, {
      hijos:
        resto.length > 0
          ? [
              decl,
              c.token(',', 'COMA', resto[0], false),
              listaVars(resto, t, pos),
            ]
          : [decl],
    })
  }

  const instruccion = (i: Instr, clase: 'instruccion' | 'simple'): Nodo => {
    const op = { esInstruccion: clase === 'instruccion' }
    const kw = (texto: string, tipoToken: TipoToken) =>
      c.token(texto, tipoToken, i)
    const asignacion = (nombre: string, valor: Expr) => [
      c.token(nombre, 'ID', i),
      c.token('=', 'IGUAL', i, false),
      exprD(valor),
    ]
    switch (i.tipo) {
      case 'Va':
        return c.nodo('', clase, i, {
          ...op,
          hijos: [
            kw('va', 'VA'),
            tipo(i.tipoDato, i),
            listaVars(i.vars, i.tipoDato, i),
          ],
        })
      case 'Cn':
        return c.nodo('', clase, i, {
          ...op,
          hijos: [
            kw('cn', 'CN'),
            tipo(i.tipoDato, i),
            {
              ...c.token(i.nombre, 'ID', i.posNombre),
              attrs: [
                dtype(i.tipoDato, 'inh'),
                { name: 'categoria', value: 'constante', kind: 'inh' },
              ],
            },
            c.token('=', 'IGUAL', i, false),
            exprD(i.valor),
          ],
        })
      case 'Lee':
        return c.nodo('', clase, i, {
          ...op,
          hijos: [kw('lee', 'LEE'), c.token(i.nombre, 'ID', i.posNombre)],
        })
      case 'Asig':
        return c.nodo('', clase, i, {
          ...op,
          hijos: asignacion(i.nombre, i.valor),
        })
      case 'Di':
        return c.nodo('', clase, i, {
          ...op,
          hijos: [kw('di', 'DI'), exprD(i.valor)],
        })
      case 'Si':
        return c.nodo('', clase, i, {
          ...op,
          hijos: [
            kw('si', 'SI'),
            exprD(i.cond),
            instruccion(i.entonces, 'simple'),
            ...(i.sino
              ? [
                  c.token('no', 'NO', i.sino, false),
                  instruccion(i.sino, 'simple'),
                ]
              : []),
          ],
        })
      case 'Rep':
        return c.nodo('', clase, i, {
          ...op,
          hijos: [
            kw('rep', 'REP'),
            exprD(i.veces),
            instruccion(i.cuerpo, 'simple'),
          ],
        })
    }
  }

  const hijos = programa.instrucciones.flatMap((ins, k) => {
    c.instr = k
    const nodo = instruccion(ins, 'instruccion')
    return [nodo, c.token('↵', 'SALTO', ins, false)]
  })
  c.instr = -1
  return numerar(c.nodo('', 'programa', { linea: 1, columna: 1 }, { hijos }))
}

export function construirArbol(programa: Programa, modo: ModoArbol): Nodo {
  return modo === 'abstract'
    ? arbolAbstracto(programa)
    : arbolDerivacion(programa)
}

export interface FilaArbol {
  nodo: Nodo
  nivel: number
  guias: boolean[]
  ultimo: boolean
  expandido: boolean | null
  posicion: number
  hermanos: number
  padre: number
}

export function aplanar(
  raiz: Nodo,
  expandido: (n: Nodo) => boolean,
): FilaArbol[] {
  const filas: FilaArbol[] = []
  const visitar = (
    n: Nodo,
    nivel: number,
    guias: boolean[],
    ultimo: boolean,
    posicion: number,
    hermanos: number,
    padre: number,
  ) => {
    const abierto = n.hijos.length > 0 ? expandido(n) : null
    const yo = filas.length
    filas.push({
      nodo: n,
      nivel,
      guias,
      ultimo,
      expandido: abierto,
      posicion,
      hermanos,
      padre,
    })
    if (!abierto) return
    const guiasHijos = nivel === 0 ? [] : [...guias, !ultimo]
    n.hijos.forEach((h, i) => {
      visitar(
        h,
        nivel + 1,
        guiasHijos,
        i === n.hijos.length - 1,
        i + 1,
        n.hijos.length,
        yo,
      )
    })
  }
  visitar(raiz, 0, [], true, 1, 1, -1)
  return filas
}

export function carpetas(raiz: Nodo): string[] {
  const out: string[] = []
  const visitar = (n: Nodo) => {
    if (n.hijos.length === 0) return
    out.push(n.id)
    for (const h of n.hijos) visitar(h)
  }
  visitar(raiz)
  return out
}

export const PLEGAR_DESDE = 50

export function expandidoPorDefecto(n: Nodo, instrucciones: number): boolean {
  return instrucciones <= PLEGAR_DESDE || !n.esInstruccion
}

export function arbolComoTexto(
  raiz: Nodo,
  conAttrs = false,
  rotulo: (n: Nodo) => string = etiqueta,
): string {
  const lineas: string[] = []
  const visitar = (n: Nodo, prefijo: string, hijoPrefijo: string) => {
    const attrs = conAttrs
      ? n.attrs
          .map((a) => ` ${a.kind === 'inh' ? '↓' : '↑'}${a.name}=${a.value}`)
          .join('')
      : ''
    lineas.push(`${prefijo}${rotulo(n)}${attrs}`)
    n.hijos.forEach((h, i) => {
      const ultimo = i === n.hijos.length - 1
      visitar(
        h,
        `${hijoPrefijo}${ultimo ? '└─ ' : '├─ '}`,
        `${hijoPrefijo}${ultimo ? '   ' : '│  '}`,
      )
    })
  }
  visitar(raiz, '', '')
  return `${lineas.join('\n')}\n`
}

export function etiqueta(n: Nodo): string {
  return n.texto ? (n.clase ? `${n.texto}  ${n.clase}` : n.texto) : n.clase
}

export function conLineasDescartadas(
  raiz: Nodo,
  errores: readonly Diagnostico[],
): Nodo {
  if (errores.length === 0) return raiz
  const marcas: Nodo[] = errores.map((e) => ({
    id: '',
    texto: `✕ L${e.linea}`,
    clase: e.mensaje,
    terminal: true,
    linea: e.linea,
    columna: e.columna,
    desde: e.columna,
    hasta: e.columna + (e.largo ?? 1),
    instr: -1,
    esInstruccion: false,
    attrs: [],
    hijos: [],
    descartada: e.mensaje,
  }))
  const hijos = [...raiz.hijos, ...marcas].sort((a, b) => a.linea - b.linea)
  return numerar({ ...raiz, hijos })
}

export type NivelMarca = 'error' | 'advertencia'

export interface Marca {
  nivel: NivelMarca
  mensajes: string[]
}

export function marcarDiagnosticos(
  raiz: Nodo,
  errores: readonly Diagnostico[],
  advertencias: readonly Diagnostico[],
): Map<string, Marca> {
  const marcas = new Map<string, Marca>()
  const marcar = (d: Diagnostico, nivel: NivelMarca) => {
    const n =
      nodoQueContiene(raiz, d.linea, d.columna) ??
      raiz.hijos.find((h) => h.esInstruccion && h.linea === d.linea)
    if (!n) return
    const m = marcas.get(n.id)
    if (m) {
      m.mensajes.push(d.mensaje)
      if (nivel === 'error') m.nivel = 'error'
    } else marcas.set(n.id, { nivel, mensajes: [d.mensaje] })
  }
  for (const d of errores) marcar(d, 'error')
  for (const d of advertencias) marcar(d, 'advertencia')
  return marcas
}

function nodoQueContiene(
  raiz: Nodo,
  linea: number,
  columna: number,
): Nodo | null {
  let actual: Nodo | null = null
  let nivel: readonly Nodo[] = raiz.hijos
  for (;;) {
    const hijo = nivel.find(
      (n) =>
        n.linea === linea &&
        n.desde !== undefined &&
        n.hasta !== undefined &&
        columna >= n.desde &&
        columna < n.hasta,
    )
    if (!hijo) return actual
    actual = hijo
    nivel = hijo.hijos
  }
}
