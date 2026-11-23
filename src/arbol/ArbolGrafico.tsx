import { clsx } from 'clsx'
import { memo, useId, useMemo } from 'react'
import { useT } from '@/i18n/useT'
import type { NivelMarca, Nodo } from './arbol'
import { dibujarArbol } from './layout'

export const ArbolGrafico = memo(function ArbolGrafico({
  raiz,
  conAttrs,
  seleccionado,
  actual,
  onSelect,
  onHover,
  ajustar = false,
  marcas,
}: {
  marcas?: ReadonlyMap<string, NivelMarca>
  raiz: Nodo
  conAttrs: boolean
  ajustar?: boolean
  seleccionado?: string | null
  actual?: string | null
  onSelect?(n: Nodo): void
  onHover?(n: Nodo | null): void
}) {
  const t = useT()
  const roles = t.ast.rolesShort
  const d = useMemo(
    () => dibujarArbol(raiz, conAttrs, (n) => (n.rol ? roles[n.rol] : '')),
    [raiz, conAttrs, roles],
  )
  const id = useId().replace(/:/g, '')
  const sube = `${id}-sube`
  const baja = `${id}-baja`
  return (
    <svg
      aria-hidden
      width={d.ancho}
      height={d.alto}
      viewBox={`0 0 ${d.ancho} ${d.alto}`}
      className={clsx('block font-mono', ajustar && 'max-h-full max-w-full')}
    >
      <defs>
        <marker
          id={sube}
          viewBox="0 0 8 8"
          refX="8"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L8,4 L0,8 z" className="fill-val" />
        </marker>
        <marker
          id={baja}
          viewBox="0 0 8 8"
          refX="8"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 z" className="fill-h3" />
        </marker>
      </defs>
      {d.aristas.map(({ padre, hijo, flecha }) => (
        <g key={hijo.nodo.id}>
          <line
            x1={padre.x}
            y1={padre.y + padre.alto}
            x2={hijo.x}
            y2={hijo.y}
            className={clsx(
              flecha === 'sube'
                ? 'stroke-val/70'
                : flecha === 'baja'
                  ? 'stroke-h3/70'
                  : 'stroke-border',
            )}
            strokeWidth={1.25}
            markerStart={flecha === 'sube' ? `url(#${sube})` : undefined}
            markerEnd={flecha === 'baja' ? `url(#${baja})` : undefined}
          />
          {hijo.rol && (
            <text
              x={hijo.x}
              y={hijo.y - 4}
              textAnchor="middle"
              className="fill-muted text-[10px] italic"
            >
              {hijo.rol}
            </text>
          )}
        </g>
      ))}
      {d.nodos.map((n) => {
        const elegido = n.nodo.id === seleccionado
        const enPaso = n.nodo.id === actual
        const marca = marcas?.get(n.nodo.id)
        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: el dibujo es una ayuda visual; la lista es la versión accesible
          <g
            key={n.nodo.id}
            transform={`translate(${n.x - n.ancho / 2}, ${n.y})`}
            onClick={() => onSelect?.(n.nodo)}
            onMouseEnter={() => onHover?.(n.nodo)}
            onMouseLeave={() => onHover?.(null)}
            className="cursor-pointer"
          >
            <title>
              {n.nodo.texto && n.nodo.clase
                ? `${n.nodo.texto} (${n.nodo.clase})`
                : n.etiqueta}
            </title>
            <rect
              width={n.ancho}
              height={n.alto}
              rx={n.nodo.terminal ? 3 : 7}
              className={clsx(
                n.nodo.terminal ? 'fill-editor' : 'fill-surface-2',
                enPaso
                  ? 'stroke-accent'
                  : marca === 'error'
                    ? 'stroke-danger'
                    : marca === 'advertencia'
                      ? 'stroke-warn'
                      : elegido
                        ? 'stroke-fn'
                        : n.nodo.terminal
                          ? 'stroke-border'
                          : 'stroke-muted/50',
              )}
              strokeWidth={enPaso || elegido || marca ? 2 : 1}
            />
            <text
              x={n.ancho / 2}
              y={15}
              textAnchor="middle"
              className={clsx(
                'text-[12px]',
                n.nodo.texto ? 'fill-text' : 'fill-fn italic',
                n.nodo.esInstruccion && 'font-semibold',
              )}
            >
              {n.etiqueta}
            </text>
            {n.atributos && (
              <text
                x={n.ancho / 2}
                y={30}
                textAnchor="middle"
                className="text-[10px]"
              >
                {n.atributos.split(' ').map((a, i) => (
                  <tspan
                    // biome-ignore lint/suspicious/noArrayIndexKey: partes fijas del texto
                    key={i}
                    className={a.startsWith('↓') ? 'fill-h3' : 'fill-val'}
                  >
                    {i > 0 ? ' ' : ''}
                    {a}
                  </tspan>
                ))}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
})
