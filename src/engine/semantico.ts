import { formatValor, VALOR_POR_DEFECTO } from './formato'
import { identificadorParecido, quisoDecir } from './sugerencias'
import { TablaSimbolos } from './tablaSimbolos'
import {
  asignable,
  comparacionValida,
  ENT_MAX,
  esComparacion,
  esNumero,
  motivoAritmetico,
  motivoComparacion,
  type OpAritmetico,
  tipoAritmetico,
} from './tipos'
import { crearPaso, TrazaTabla } from './traza'
import type {
  AccionTraza,
  Diagnostico,
  Expr,
  Instr,
  PasoTraza,
  Pos,
  Programa,
  Simbolo,
  TipoDato,
  Valor,
} from './types'

export interface ResultadoSemantico {
  ast: Programa
  tabla: TablaSimbolos
  errores: Diagnostico[]
  advertencias: Diagnostico[]
  traza: PasoTraza[]
}

export function analizarSemantico(ast: Programa): ResultadoSemantico {
  const a = new Analizador(ast)
  a.programa()
  const orden = (x: Diagnostico, y: Diagnostico) =>
    x.linea - y.linea || x.columna - y.columna
  return {
    ast,
    tabla: a.tabla,
    errores: a.errores.sort(orden),
    advertencias: a.advertencias.sort(orden),
    traza: a.traza,
  }
}

function largo(e: Expr): number {
  switch (e.tipo) {
    case 'Lit':
      return [...e.lexema].length
    case 'Id':
      return e.nombre.length
    case 'Unaria':
      return 1
    case 'Binaria':
      return e.op.length
  }
}

function texto(e: Expr, dentro = false): string {
  switch (e.tipo) {
    case 'Lit':
      return e.lexema
    case 'Id':
      return e.nombre
    case 'Unaria':
      return `-${texto(e.expr, true)}`
    case 'Binaria': {
      const s = `${texto(e.izq, true)} ${e.op} ${texto(e.der, true)}`
      return dentro ? `(${s})` : s
    }
  }
}

interface Fragmento {
  linea: number
  columna: number
  largo: number
}

const en = (p: Pos, largoFragmento: number): Fragmento => ({
  linea: p.linea,
  columna: p.columna,
  largo: largoFragmento,
})

function inicio(e: Expr): number {
  if (e.desde !== undefined) return e.desde
  return e.tipo === 'Binaria' ? inicio(e.izq) : e.columna
}

function fin(e: Expr): number {
  if (e.hasta !== undefined) return e.hasta
  switch (e.tipo) {
    case 'Lit':
      return e.columna + [...e.lexema].length
    case 'Id':
      return e.columna + e.nombre.length
    case 'Unaria':
      return fin(e.expr)
    case 'Binaria':
      return fin(e.der)
  }
}

function fragmento(e: Expr): Fragmento {
  const desde = inicio(e)
  return { linea: e.linea, columna: desde, largo: Math.max(1, fin(e) - desde) }
}

function codigo(e: Expr): string {
  const s = texto(e)
  return s.length > 60 ? `${s.slice(0, 59)}…` : s
}

function valorLiteral(e: Expr): Valor | undefined {
  if (e.tipo === 'Lit') return e.valor
  if (e.tipo === 'Unaria' && e.expr.tipo === 'Lit') {
    const v = e.expr.valor
    return typeof v === 'number' ? -v : undefined
  }
  return undefined
}

const plural = (n: number, palabra: string) =>
  `${n} ${palabra}${n === 1 ? '' : palabra.endsWith('r') ? 'es' : 's'}`

class Analizador {
  readonly tabla = new TablaSimbolos()
  readonly errores: Diagnostico[] = []
  readonly advertencias: Diagnostico[] = []
  readonly traza: PasoTraza[] = []
  private readonly trazaTabla = new TrazaTabla()

  private readonly ast: Programa
  private instr = 0
  private readonly declaraciones = new Map<string, number>()
  private readonly posDeclaracion = new Map<string, Pos>()
  private readonly sinValorAvisado = new Set<string>()
  private readonly definidas = new Set<string>()
  private readonly agregadas: string[] = []
  private readonly escritas = new Set<string>()
  private readonly conErrorDeDeclaracion = new Set<string>()
  private declarando: string | null = null

  constructor(ast: Programa) {
    this.ast = ast
    for (const i of ast.instrucciones) {
      const nombres =
        i.tipo === 'Va'
          ? i.vars.map((v) => v.nombre)
          : i.tipo === 'Cn'
            ? [i.nombre]
            : []
      for (const n of nombres)
        if (!this.declaraciones.has(n)) this.declaraciones.set(n, i.linea)
    }
  }

  private paso(
    donde: number | Fragmento,
    accion: AccionTraza,
    detalle: string,
    resultado = '',
  ) {
    const f = typeof donde === 'number' ? { linea: donde } : donde
    this.traza.push(
      crearPaso(
        this.trazaTabla,
        { ...f, instr: this.instr, accion, detalle, resultado },
        this.tabla.tomarCambios(),
      ),
    )
  }

  private error(
    p: Pos,
    largoFragmento: number,
    mensaje: string,
    detalle: string,
    resultado: string,
  ) {
    this.errores.push({
      fase: 'semantico',
      linea: p.linea,
      columna: p.columna,
      largo: largoFragmento,
      mensaje,
    })
    this.paso(en(p, largoFragmento), 'error', detalle, resultado)
  }

  private advertencia(
    p: Pos,
    largoFragmento: number,
    mensaje: string,
    detalle: string,
    resultado: string,
  ) {
    this.advertencias.push({
      fase: 'semantico',
      linea: p.linea,
      columna: p.columna,
      largo: largoFragmento,
      mensaje,
    })
    this.paso(en(p, largoFragmento), 'advertencia', detalle, resultado)
  }

  private definir(nombre: string) {
    if (this.definidas.has(nombre)) return
    this.definidas.add(nombre)
    this.agregadas.push(nombre)
  }

  private rama(analizar: () => void): string[] {
    const marca = this.agregadas.length
    analizar()
    const definidos = this.agregadas.splice(marca)
    for (const n of definidos) this.definidas.delete(n)
    return definidos
  }

  private buscar(
    nombre: string,
    p: Pos,
    comoUso: boolean,
  ): Simbolo | undefined {
    const s = this.tabla.buscar(nombre)
    const nuevaLinea = s && !s.lineasReferencia.includes(p.linea)
    if (s && (nuevaLinea || (comoUso && !s.usado)))
      this.tabla.actualizar(nombre, {
        usado: s.usado || comoUso,
        lineasReferencia: nuevaLinea
          ? [...s.lineasReferencia, p.linea]
          : s.lineasReferencia,
      })
    const extra = s?.categoria === 'constante' ? ', constante' : ''
    this.paso(
      en(p, nombre.length),
      'buscar',
      `buscar(${nombre})`,
      s ? `encontrado (${s.tipo}${extra})` : 'no encontrado',
    )
    if (s) return s

    const despues = this.declaraciones.get(nombre)
    if (nombre === this.declarando) {
      this.conErrorDeDeclaracion.add(nombre)
      this.error(
        p,
        nombre.length,
        `'${nombre}' se usa en su propia declaración: todavía no tiene valor`,
        nombre,
        'se usa en su propia declaración',
      )
    } else if (despues !== undefined)
      this.error(
        p,
        nombre.length,
        `'${nombre}' se usa antes de su declaración (línea ${despues})`,
        nombre,
        `se declara después, en la línea ${despues}`,
      )
    else
      this.error(
        p,
        nombre.length,
        `identificador no declarado '${nombre}'${quisoDecir(
          identificadorParecido(
            nombre,
            this.tabla.listar().map((x) => x.nombre),
          ),
        )}`,
        nombre,
        'no declarado',
      )
    return undefined
  }

  private declarar(
    nombre: string,
    tipo: TipoDato,
    categoria: Simbolo['categoria'],
    p: Pos,
    sinValor: boolean,
  ): boolean {
    const previo = this.tabla.buscar(nombre)
    if (previo) {
      this.conErrorDeDeclaracion.add(nombre)
      this.error(
        p,
        nombre.length,
        `'${nombre}' ya fue declarada en la línea ${previo.lineaDeclaracion}`,
        `insertar(${nombre}, ${tipo}, ${categoria})`,
        `ya existe: declarada en la línea ${previo.lineaDeclaracion}`,
      )
      return false
    }
    const s = this.tabla.insertar(nombre, tipo, categoria, p.linea) as Simbolo
    this.posDeclaracion.set(nombre, p)
    const nota = sinValor
      ? `, valor por defecto ${formatValor(VALOR_POR_DEFECTO[tipo], tipo)}`
      : ''
    this.paso(
      en(p, nombre.length),
      'insertar',
      `insertar(${nombre}, ${tipo}, ${categoria})`,
      `dirección ${s.direccion}${nota}`,
    )
    return true
  }

  private asignar(
    nombre: string,
    destino: TipoDato,
    valor: Expr,
    tipoValor: TipoDato | null,
    inicial: boolean,
  ) {
    if (!tipoValor) {
      this.sinValorAvisado.add(nombre)
      return
    }

    const compat = asignable(destino, tipoValor)
    if (!compat) {
      this.sinValorAvisado.add(nombre)
      const precision = destino === 'ent' && tipoValor === 'dec'
      this.error(
        valor,
        largo(valor),
        `no se puede asignar ${tipoValor} a '${nombre}' de tipo ${destino}${precision ? ' (pérdida de precisión)' : ''}`,
        `${destino} ← ${tipoValor}`,
        precision
          ? 'pérdida de precisión: no se asigna'
          : 'tipos incompatibles: no se asigna',
      )
      return
    }

    this.tabla.actualizar(nombre, { inicializado: true })
    this.definir(nombre)
    if (!inicial) this.escritas.add(nombre)
    const literal = inicial ? valorLiteral(valor) : undefined
    if (literal !== undefined) {
      this.tabla.actualizar(nombre, { valor: literal })
      const v = formatValor(literal, destino)
      this.paso(
        fragmento(valor),
        'asignar',
        `${nombre} = ${v} : ${destino}`,
        `valor inicial ${nombre} = ${v}`,
      )
    } else
      this.paso(
        fragmento(valor),
        'asignar',
        `${nombre} = ${codigo(valor)} : ${destino} ← ${tipoValor}`,
        `tipos compatibles: ${nombre} se calcula al ejecutar`,
      )

    if (compat === 'conversion')
      this.advertencia(
        valor,
        largo(valor),
        `conversión implícita de ent a dec al asignar a '${nombre}'`,
        `dec ← ent`,
        `${nombre}: el valor ent se convierte a dec`,
      )
  }

  programa() {
    const instrucciones = this.ast.instrucciones
    this.paso(
      instrucciones[0]?.linea ?? 1,
      'inicio',
      'programa',
      'recorrido del árbol',
    )
    instrucciones.forEach((ins, i) => {
      this.instr = i
      this.instruccion(ins)
    })

    for (const s of this.tabla.listar()) {
      if (
        s.categoria !== 'variable' ||
        s.usado ||
        this.conErrorDeDeclaracion.has(s.nombre)
      )
        continue
      const p = this.posDeclaracion.get(s.nombre) as Pos
      const recibe = this.escritas.has(s.nombre)
      this.advertencia(
        p,
        s.nombre.length,
        recibe
          ? `'${s.nombre}' (línea ${s.lineaDeclaracion}) recibe valores, pero ninguno se usa`
          : `'${s.nombre}' fue declarada en la línea ${s.lineaDeclaracion} y nunca se usa`,
        `revisar tabla: ${s.nombre}`,
        recibe ? 'recibe valores que nunca se usan' : 'declarada y nunca usada',
      )
    }

    const e = this.errores.length
    const w = this.advertencias.length
    this.paso(
      instrucciones.at(-1)?.linea ?? 1,
      'fin',
      'fin del análisis',
      e > 0 && w === 0
        ? plural(e, 'error')
        : `${plural(e, 'error')}, ${plural(w, 'advertencia')}`,
    )
  }

  private instruccion(i: Instr) {
    switch (i.tipo) {
      case 'Va':
        for (const v of i.vars) {
          this.declarando = v.nombre
          const t = v.valor ? this.expr(v.valor) : null
          this.declarando = null
          if (!this.declarar(v.nombre, i.tipoDato, 'variable', v, !v.valor))
            continue
          if (v.valor) this.asignar(v.nombre, i.tipoDato, v.valor, t, true)
        }
        return

      case 'Cn': {
        this.declarando = i.nombre
        const t = this.expr(i.valor)
        this.declarando = null
        if (
          this.declarar(i.nombre, i.tipoDato, 'constante', i.posNombre, false)
        )
          this.asignar(i.nombre, i.tipoDato, i.valor, t, true)
        return
      }

      case 'Lee': {
        const s = this.buscar(i.nombre, i.posNombre, false)
        if (!s) return
        if (s.categoria === 'constante') {
          this.error(
            i.posNombre,
            i.nombre.length,
            `no se puede leer en la constante '${i.nombre}' con lee`,
            `lee ${i.nombre}`,
            `${i.nombre} es constante: no se puede leer`,
          )
          return
        }
        this.tabla.actualizar(i.nombre, { inicializado: true })
        this.definir(i.nombre)
        this.escritas.add(i.nombre)
        this.paso(
          {
            linea: i.linea,
            columna: i.columna,
            largo: i.posNombre.columna + i.nombre.length - i.columna,
          },
          'leer',
          `lee ${i.nombre} : ${s.tipo}`,
          'variable, no constante: se leerá al ejecutar',
        )
        return
      }

      case 'Asig': {
        const t = this.expr(i.valor)
        const s = this.buscar(i.nombre, i, false)
        if (!s) return
        if (s.categoria === 'constante') {
          this.error(
            i,
            i.nombre.length,
            `no se puede modificar la constante '${i.nombre}'`,
            `${i.nombre} = ${texto(i.valor)}`,
            `${i.nombre} es constante: no se modifica`,
          )
          return
        }
        this.asignar(i.nombre, s.tipo, i.valor, t, false)
        return
      }

      case 'Di': {
        const t = this.expr(i.valor)
        if (t)
          this.paso(
            {
              linea: i.linea,
              columna: i.columna,
              largo: fin(i.valor) - i.columna,
            },
            'mostrar',
            `di ${codigo(i.valor)} : ${t}`,
            'expresión válida: se escribirá al ejecutar',
          )
        return
      }

      case 'Si': {
        const t = this.expr(i.cond)
        if (t && t !== 'bool')
          this.error(
            i.cond,
            largo(i.cond),
            `la condición de 'si' debe ser bool y es ${t}`,
            `si ${t}`,
            'la condición debe ser bool',
          )
        else if (t) {
          this.paso(
            fragmento(i.cond),
            'condicion',
            `si ${codigo(i.cond)} : bool`,
            i.sino
              ? 'condición válida: se analizan las dos ramas'
              : 'condición válida: se analiza la rama',
          )
          const v = valorLiteral(i.cond)
          if (typeof v === 'boolean')
            this.advertencia(
              i.cond,
              largo(i.cond),
              `la condición es constante: siempre es ${formatValor(v)}`,
              `si ${formatValor(v)}`,
              `siempre se ejecuta la rama ${v ? "del 'si'" : "del 'no'"}`,
            )
        }
        const enSi = this.rama(() => this.instruccion(i.entonces))
        if (i.sino) {
          const enNo = this.rama(() => this.instruccion(i.sino as Instr))
          for (const n of enSi) if (enNo.includes(n)) this.definir(n)
        }
        return
      }

      case 'Rep': {
        const t = this.expr(i.veces)
        const v = valorLiteral(i.veces)
        if (t && t !== 'ent')
          this.error(
            i.veces,
            largo(i.veces),
            `'rep' necesita un número ent de vueltas y recibe ${t}`,
            `rep ${t}`,
            'las vueltas deben ser ent',
          )
        else if (t && typeof v === 'number' && v <= 0)
          this.error(
            i.veces,
            largo(i.veces),
            `'rep' necesita un número de vueltas mayor que 0 y recibe ${v}`,
            `rep ${v} : ent`,
            'el literal debe ser mayor que 0',
          )
        else if (t && v !== undefined)
          this.paso(
            fragmento(i.veces),
            'repetir',
            `rep ${v} : ent`,
            'literal mayor que 0: correcto',
          )
        else if (t)
          this.paso(
            fragmento(i.veces),
            'repetir',
            `rep ${codigo(i.veces)} : ent`,
            'tipo correcto: las vueltas se conocen al ejecutar',
          )
        if (
          i.veces.tipo === 'Id' &&
          i.cuerpo.tipo === 'Asig' &&
          i.cuerpo.nombre === i.veces.nombre
        )
          this.error(
            i.cuerpo,
            i.cuerpo.nombre.length,
            `el cuerpo de 'rep' modifica '${i.cuerpo.nombre}', que indica el número de vueltas`,
            `rep ${i.veces.nombre}: ${i.cuerpo.nombre} = …`,
            'no se puede cambiar el número de vueltas dentro del ciclo',
          )
        const enCuerpo = this.rama(() => this.instruccion(i.cuerpo))
        if (typeof v === 'number' && v > 0)
          for (const n of enCuerpo) this.definir(n)
        return
      }
    }
  }

  private expr(e: Expr, negado = false): TipoDato | null {
    switch (e.tipo) {
      case 'Lit': {
        const limite = negado ? ENT_MAX + 1 : ENT_MAX
        if (e.tipoDato === 'ent' && (e.valor as number) > limite) {
          this.error(
            e,
            largo(e),
            (e.valor as number) === ENT_MAX + 1 && !negado
              ? `el literal ${e.lexema} está fuera del rango de ent (máximo ${ENT_MAX}); solo cabe negativo, como -${e.lexema}`
              : `el literal ${e.lexema} está fuera del rango de ent (máximo ${ENT_MAX})`,
            `${e.lexema} : ent`,
            'fuera de rango',
          )
          return null
        }
        if (e.tipoDato === 'dec' && !Number.isFinite(e.valor as number)) {
          this.error(
            e,
            largo(e),
            `el literal ${e.lexema.length > 20 ? `${e.lexema.slice(0, 20)}…` : e.lexema} está fuera del rango de dec`,
            'literal dec',
            'fuera de rango',
          )
          return null
        }
        e.anot = { tipo: e.tipoDato, valor: e.valor }
        return e.tipoDato
      }

      case 'Id': {
        const s = this.buscar(e.nombre, e, true)
        if (!s) return null
        e.anot = { tipo: s.tipo }
        if (
          s.categoria === 'variable' &&
          !this.definidas.has(s.nombre) &&
          !this.sinValorAvisado.has(s.nombre)
        ) {
          this.sinValorAvisado.add(s.nombre)
          const v = formatValor(VALOR_POR_DEFECTO[s.tipo], s.tipo)
          if (s.inicializado)
            this.advertencia(
              e,
              e.nombre.length,
              `'${s.nombre}' puede no tener valor aquí: solo lo recibe dentro de un 'si' o un 'rep' (si no, vale ${v})`,
              `${s.nombre} sin valor en todos los caminos`,
              `puede valer ${v} (valor por defecto)`,
            )
          else
            this.advertencia(
              e,
              e.nombre.length,
              `'${s.nombre}' se usa sin valor explícito ni lee: vale ${v} (valor por defecto)`,
              `${s.nombre} sin valor explícito ni lee`,
              `se usará el valor por defecto ${v}`,
            )
        }
        return s.tipo
      }

      case 'Unaria': {
        const t = this.expr(e.expr, true)
        if (!t) return null
        if (!esNumero(t)) {
          this.error(
            e,
            1,
            `el menos unario necesita un número y recibe ${t}`,
            `${codigo(e)} : -${t}`,
            'tipos incompatibles',
          )
          return null
        }
        this.paso(fragmento(e), 'operacion', `${codigo(e)} : -${t}`, t)
        e.anot = { tipo: t }
        return t
      }

      case 'Binaria': {
        const izq = this.expr(e.izq)
        const der = this.expr(e.der)
        if (!izq || !der) return null
        const detalle = `${izq} ${e.op} ${der}`
        const conCodigo = `${codigo(e)} : ${detalle}`

        if (esComparacion(e.op)) {
          if (!comparacionValida(e.op, izq, der)) {
            this.error(
              e,
              e.op.length,
              `comparación inválida ${detalle}: ${motivoComparacion(e.op)}`,
              conCodigo,
              'comparación inválida',
            )
            return null
          }
          this.paso(fragmento(e), 'operacion', conCodigo, 'bool')
          e.anot = { tipo: 'bool' }
          return 'bool'
        }

        const op = e.op as OpAritmetico
        const t = tipoAritmetico(op, izq, der)
        if (!t) {
          this.error(
            e,
            op.length,
            `tipos incompatibles ${detalle}: ${motivoAritmetico(op, izq, der)}`,
            conCodigo,
            'tipos incompatibles',
          )
          return null
        }
        if (op === '/' && valorLiteral(e.der) === 0) {
          this.error(
            e.der,
            largo(e.der),
            'división entre el literal 0',
            conCodigo,
            'el divisor es el literal 0',
          )
          return null
        }

        const sobrecarga =
          op === '+' ? (t === 'txt' ? ' (concatenación)' : ' (suma)') : ''
        const nota =
          op === '/' && valorLiteral(e.der) === undefined
            ? ' (el divisor no es un literal: se revisa al ejecutar)'
            : ''
        this.paso(
          fragmento(e),
          'operacion',
          `${conCodigo}${sobrecarga}`,
          `${t}${nota}`,
        )
        e.anot = { tipo: t }
        return t
      }
    }
  }
}
