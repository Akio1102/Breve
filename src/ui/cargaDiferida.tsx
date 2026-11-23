import { type ComponentType, lazy } from 'react'

export type ComponenteDiferido<P> = ComponentType<P> & {
  precargar(): Promise<unknown>
}

export function cargaDiferida<P extends object>(
  cargar: () => Promise<ComponentType<P>>,
): ComponenteDiferido<P> {
  let cargado: ComponentType<P> | null = null
  let promesa: Promise<ComponentType<P>> | null = null
  const precargar = () => {
    promesa ??= cargar().then((c) => {
      cargado = c
      return c
    })
    return promesa
  }
  const Diferido = lazy(() => precargar().then((c) => ({ default: c })))
  function Componente(props: P) {
    const C = cargado ?? Diferido
    return <C {...props} />
  }
  Componente.precargar = precargar
  return Componente
}
