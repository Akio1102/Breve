import { cargaDiferida } from '@/ui/cargaDiferida'

export const ArbolDelPaso = cargaDiferida(() =>
  import('./ArbolDelPaso').then((m) => m.ArbolDelPaso),
)
