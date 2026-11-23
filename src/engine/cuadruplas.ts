import type { Cuadrupla, InstruccionTAC } from './types'

const C = (op: string, arg1 = '', arg2 = '', resultado = ''): Cuadrupla => ({
  op,
  arg1,
  arg2,
  resultado,
})

function cuadrupla(i: InstruccionTAC): Cuadrupla {
  switch (i.op) {
    case 'bin':
      return C(i.operador, i.izq, i.der, i.destino)
    case 'asig':
      return C('=', i.origen, '', i.destino)
    case 'read':
      return C('read', '', '', i.destino)
    case 'write':
      return C('write', i.origen)
    case 'if':
    case 'ifFalse':
      return C(i.op, i.condicion, '', String(i.salto))
    case 'ifCmp':
      return C(`if${i.operador}`, i.izq, i.der, String(i.salto))
    case 'goto':
      return C('goto', '', '', String(i.salto))
    case 'halt':
      return C('halt')
  }
}

export function aCuadruplas(codigo: readonly InstruccionTAC[]): Cuadrupla[] {
  return codigo.map(cuadrupla)
}
