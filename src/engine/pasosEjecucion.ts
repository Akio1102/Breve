import { esSalto, formatTAC, formatValor, VALOR_POR_DEFECTO } from './formato'
import { crearPaso, TrazaTabla } from './traza'
import type {
  AccionTraza,
  InstruccionTAC,
  PapelPaso,
  PasoTraza,
  Programa,
  ResultadoEjecucion,
  Simbolo,
} from './types'

export interface CodigoEjecutado {
  tresDirecciones: readonly InstruccionTAC[]
  tablaSimbolos: readonly Simbolo[]
}

function accion(i: InstruccionTAC): AccionTraza {
  switch (i.op) {
    case 'asig':
      return 'copiar'
    case 'bin':
      return 'calcular'
    case 'read':
      return 'leerEntrada'
    case 'write':
      return 'escribir'
    case 'if':
    case 'ifFalse':
    case 'ifCmp':
    case 'goto':
      return 'saltar'
    case 'halt':
      return 'terminar'
  }
}

export const esContador = (nombre: string) => /^_c\d+$/.test(nombre)

export function papelDe(
  i: InstruccionTAC,
  pc: number,
  siguiente: number,
  construccion: 'Si' | 'Rep' | undefined,
): PapelPaso | undefined {
  const salta = esSalto(i) && siguiente === i.salto && i.salto !== pc + 1
  if (construccion === 'Rep') {
    if (i.op === 'asig' && esContador(i.destino))
      return i.origen === '0'
        ? { tipo: 'repInicio', contador: i.destino }
        : { tipo: 'repIncremento', contador: i.destino }
    if (i.op === 'bin' && i.operador === '+' && esContador(i.izq))
      return { tipo: 'repIncremento', contador: i.izq }
    if (i.op === 'bin' && (esContador(i.izq) || esContador(i.der)))
      return {
        tipo: 'repCondicion',
        contador: esContador(i.izq) ? i.izq : i.der,
      }
    if (i.op === 'goto' && i.salto <= pc)
      return { tipo: 'repVuelve', destino: i.salto }
    if (i.op === 'if' || i.op === 'ifFalse' || i.op === 'ifCmp')
      return i.salto <= pc
        ? { tipo: 'repSigue', sigue: salta, destino: i.salto }
        : { tipo: 'repSalida', sale: salta, destino: i.salto }
    return undefined
  }
  if (construccion === 'Si') {
    if (i.op === 'goto') return { tipo: 'siFin', destino: i.salto }
    if (i.op === 'if' || i.op === 'ifFalse' || i.op === 'ifCmp') {
      const condicion =
        i.op === 'ifCmp' ? `${i.izq} ${i.operador} ${i.der}` : i.condicion
      return {
        tipo: 'siCondicion',
        condicion,
        verdadera: i.op === 'ifFalse' ? !salta : salta,
        salta,
        destino: i.salto,
      }
    }
  }
  return undefined
}

function numerarVueltas(
  pasos: PasoTraza[],
  lineasRep: ReadonlySet<number>,
  terminoConError: boolean,
) {
  let k = 0
  while (k < pasos.length) {
    const linea = pasos[k].linea
    if (!lineasRep.has(linea) || pasos[k].accion === 'arranque') {
      k++
      continue
    }
    let fin = k
    while (fin + 1 < pasos.length && pasos[fin + 1].linea === linea) fin++
    const tramo = pasos.slice(k, fin + 1)
    const inicio = tramo.findIndex((p) =>
      p.cambios.some((c) => esContador(c.nombre) && c.valor === 0),
    )
    if (inicio >= 0) {
      let vuelta = 0
      let trasIncremento = false
      let completas = 0
      tramo.forEach((p, j) => {
        if (j > inicio && vuelta === 0) vuelta = 1
        if (trasIncremento && p.accion !== 'saltar') {
          vuelta++
          trasIncremento = false
        }
        p.vuelta = vuelta
        const c = p.cambios.find((x) => esContador(x.nombre))
        if (c && j > inicio && typeof c.valor === 'number' && c.valor > 0) {
          completas = c.valor
          trasIncremento = true
        }
      })
      const cortado = terminoConError && fin === pasos.length - 1
      if (!cortado) for (const p of tramo) p.vueltas = completas
    }
    k = fin + 1
  }
}

export function pasosDeEjecucion(
  codigo: CodigoEjecutado,
  ast: Programa | null,
  x: ResultadoEjecucion,
): PasoTraza[] {
  const { tresDirecciones: tac, tablaSimbolos } = codigo
  const traza = new TrazaTabla()
  const porNombre = new Map(tablaSimbolos.map((s) => [s.nombre, s]))
  const instrDe = new Map<number, number>()
  ast?.instrucciones.forEach((ins, k) => {
    if (!instrDe.has(ins.linea)) instrDe.set(ins.linea, k)
  })
  const construccionDe = new Map<number, 'Si' | 'Rep'>()
  for (const ins of ast?.instrucciones ?? [])
    if (ins.tipo === 'Si' || ins.tipo === 'Rep')
      construccionDe.set(ins.linea, ins.tipo)
  const ultimaLinea = ast?.instrucciones.at(-1)?.linea ?? 1
  const pasos: PasoTraza[] = []

  const inicial = tablaSimbolos.map((s) => ({
    ...s,
    valor: VALOR_POR_DEFECTO[s.tipo],
    inicializado: false,
  }))
  pasos.push(
    crearPaso(
      traza,
      {
        linea: ast?.instrucciones[0]?.linea ?? 1,
        instr: 0,
        accion: 'arranque',
        detalle: 'pc = 0',
        resultado: '',
        cuadrupla: 0,
        siguiente: 0,
        salida: 0,
      },
      inicial,
    ),
  )

  const { pc, escrituras, salida } = x.traza
  let e = 0
  let s = 0
  const n = pc.length
  for (let k = 0; k < n; k++) {
    const i = tac[pc[k]]
    const linea = i?.linea ?? ultimaLinea
    const cambios: Simbolo[] = []
    let resultado = ''
    while (e < escrituras.paso.length && escrituras.paso[e] === k) {
      const nombre = escrituras.nombre[e]
      const valor = escrituras.valor[e]
      const simbolo = porNombre.get(nombre)
      if (simbolo) {
        cambios.push({ ...simbolo, valor, inicializado: true })
        resultado = `${nombre} = ${formatValor(valor, simbolo.tipo)}`
      }
      e++
    }
    while (s < salida.length && salida[s] === k) s++
    const siguiente = k + 1 < n ? pc[k + 1] : pc[k] + 1
    const esError = k === n - 1 && x.error && !x.limiteAlcanzado
    if (i?.op === 'write' && s > 0) resultado = x.salida[s - 1]
    if (i && esSalto(i)) resultado = `pc = ${siguiente}`
    if (i?.op === 'halt') resultado = ''
    const papel =
      i && !esError
        ? papelDe(i, pc[k], siguiente, construccionDe.get(linea))
        : undefined
    pasos.push(
      crearPaso(
        traza,
        {
          linea,
          instr: instrDe.get(linea) ?? 0,
          accion: esError ? 'errorEjecucion' : i ? accion(i) : 'terminar',
          detalle: i ? formatTAC(i) : '',
          resultado: esError ? (x.error?.mensaje ?? '') : resultado,
          columna: i?.columna,
          largo: i?.largo,
          cuadrupla: pc[k],
          siguiente,
          salida: s,
          ...(papel ? { papel } : {}),
        },
        cambios,
      ),
    )
  }

  if (x.error && x.limiteAlcanzado) {
    const i = tac[x.error.cuadrupla]
    pasos.push(
      crearPaso(
        traza,
        {
          linea: x.error.linea,
          instr: instrDe.get(x.error.linea) ?? 0,
          accion: 'errorEjecucion',
          detalle: i ? formatTAC(i) : '',
          resultado: x.error.mensaje,
          columna: x.error.columna,
          largo: x.error.largo,
          cuadrupla: x.error.cuadrupla,
          siguiente: x.error.cuadrupla,
          salida: s,
        },
        [],
      ),
    )
  }
  const lineasRep = new Set(
    [...construccionDe].filter(([, c]) => c === 'Rep').map(([l]) => l),
  )
  numerarVueltas(pasos, lineasRep, x.error !== null)
  return pasos
}
