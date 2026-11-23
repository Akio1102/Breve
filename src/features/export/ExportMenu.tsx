import { clsx } from 'clsx'
import {
  BookOpenText,
  ChevronDown,
  ClipboardCopy,
  Download,
  FileArchive,
  FileCode2,
  FileJson,
  FileText,
  GitFork,
  ListOrdered,
  ListTree,
  Network,
  Sheet,
  Table,
  TriangleAlert,
  Type,
} from 'lucide-react'
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react'
import { useT } from '@/i18n/useT'
import {
  currentExecution,
  isExecuted,
  isStale,
  useAppStore,
} from '@/store/appStore'
import type { OpcionesArbol } from './exporters'

const cargar = () => import('./acciones')

type Format =
  | 'source'
  | 'zip'
  | 'report'
  | 'output'
  | 'tokens'
  | 'symbols'
  | 'diagnostics'
  | 'trace'
  | 'treeText'
  | 'treeSvg'
  | 'intermediate'
  | 'blocks'
  | 'json'

type Copia = 'copyIntermediate' | 'copySymbols'

type Motivo = 'stale' | 'run' | 'syntax' | 'semantic' | 'compile'

const ICONS: Record<Format | Copia, typeof Download> = {
  source: FileCode2,
  zip: FileArchive,
  report: BookOpenText,
  output: FileText,
  tokens: Type,
  symbols: Table,
  diagnostics: TriangleAlert,
  trace: Sheet,
  treeText: ListTree,
  treeSvg: GitFork,
  intermediate: ListOrdered,
  blocks: Network,
  json: FileJson,
  copyIntermediate: ClipboardCopy,
  copySymbols: ClipboardCopy,
}

const EXT: Record<Format, string> = {
  source: 'brv',
  zip: 'zip',
  report: 'html',
  output: 'txt',
  tokens: 'csv',
  symbols: 'csv',
  diagnostics: 'csv',
  trace: 'csv',
  treeText: 'txt',
  treeSvg: 'svg',
  intermediate: 'txt',
  blocks: 'svg',
  json: 'json',
}

const enabledItems = (el: HTMLElement | null) => [
  ...(el?.querySelectorAll<HTMLElement>(
    '[role="menuitem"]:not([aria-disabled="true"])',
  ) ?? []),
]

interface Item<T> {
  id: T
  label: string
  motivo: Motivo | null
}

export function ExportMenu({ compact }: { compact?: boolean }) {
  const file = useAppStore((s) => s.file)
  const source = useAppStore((s) => s.source)
  const stale = useAppStore(isStale)
  const result = useAppStore((s) => (isStale(s) ? null : s.result))
  const execution = useAppStore(currentExecution)
  const input = useAppStore((s) => s.input)
  const executed = useAppStore(isExecuted)
  const optimized = useAppStore((s) => s.optimized)
  const astMode = useAppStore((s) => s.astMode)
  const showAttrs = useAppStore((s) => s.showAttrs)
  const lang = useAppStore((s) => s.lang)
  const [open, setOpen] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const t = useT()
  const tm = t.exportMenu
  const traceReady = !!result && result.traza.length > 0

  const motivo = (listo: boolean, falta: Motivo): Motivo | null =>
    listo ? null : stale ? 'stale' : falta
  const astReady = !!result?.ast && result.ast.instrucciones.length > 0
  const grupos: { id: string; label: string; items: Item<Format>[] }[] = [
    {
      id: 'documents',
      label: tm.documentsGroup,
      items: [
        { id: 'source', label: tm.source, motivo: null },
        { id: 'zip', label: tm.zip, motivo: motivo(!!result, 'stale') },
        { id: 'report', label: tm.report, motivo: motivo(!!result, 'stale') },
        { id: 'output', label: tm.output, motivo: motivo(!!execution, 'run') },
      ],
    },
    {
      id: 'sheets',
      label: tm.sheetsGroup,
      items: [
        { id: 'tokens', label: tm.tokens, motivo: motivo(!!result, 'stale') },
        {
          id: 'symbols',
          label: tm.symbols,
          motivo: motivo(traceReady, 'semantic'),
        },
        {
          id: 'diagnostics',
          label: tm.diagnostics,
          motivo: motivo(!!result, 'stale'),
        },
        {
          id: 'trace',
          label: tm.traceCsv,
          motivo: motivo(traceReady, 'semantic'),
        },
      ],
    },
    {
      id: 'code',
      label: tm.codeGroup,
      items: [
        {
          id: 'treeText',
          label: tm.treeText,
          motivo: motivo(astReady, 'syntax'),
        },
        {
          id: 'treeSvg',
          label: tm.treeSvg,
          motivo: motivo(astReady, 'syntax'),
        },
        {
          id: 'intermediate',
          label: tm.intermediate,
          motivo: motivo(!!result?.ok, 'compile'),
        },
        {
          id: 'blocks',
          label: tm.blocks,
          motivo: motivo(!!result?.ok, 'compile'),
        },
        {
          id: 'json',
          label: tm.traceJson,
          motivo: motivo(traceReady, 'semantic'),
        },
      ],
    },
  ]
  const copias: Item<Copia>[] = [
    {
      id: 'copyIntermediate',
      label: tm.copyIntermediate,
      motivo: motivo(!!result?.ok, 'compile'),
    },
    {
      id: 'copySymbols',
      label: tm.copySymbols,
      motivo: motivo(traceReady, 'semantic'),
    },
  ]

  useEffect(() => {
    if (!open) return
    enabledItems(root.current)[0]?.focus()
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  useEffect(() => {
    if (open) void cargar()
  }, [open])

  useEffect(() => {
    if (!aviso) return
    const id = setTimeout(() => setAviso(null), 2500)
    return () => clearTimeout(id)
  }, [aviso])

  const close = () => {
    setOpen(false)
    trigger.current?.focus()
  }

  const save = async (format: Format) => {
    close()
    const {
      download,
      exportBlocksSvg,
      exportDiagnosticsCsv,
      exportIntermediate,
      exportOutput,
      exportReport,
      exportResultJson,
      exportSource,
      exportSymbolsCsv,
      exportTokensCsv,
      exportTraceCsv,
      exportTreeSvg,
      exportTreeText,
      exportZip,
    } = await cargar()
    if (format === 'source') return download(exportSource(file, source))
    if (!result) return
    const arbol: OpcionesArbol = {
      modo: astMode,
      atributos: showAttrs,
      rol: (n) => (n.rol ? t.ast.rolesShort[n.rol] : ''),
    }
    const ejecucionActual =
      executed && execution ? { entrada: input, resultado: execution } : null
    if (format === 'zip')
      void exportZip(
        {
          file,
          source,
          result,
          execution: ejecucionActual,
          optimizado: optimized,
          arbol,
          lang,
        },
        t,
      ).then(download)
    if (format === 'report')
      download(
        exportReport(
          {
            file,
            source,
            result,
            execution:
              executed && execution
                ? { entrada: input, resultado: execution }
                : null,
            optimizado: optimized,
            arbol,
          },
          t,
          lang,
        ),
      )
    if (format === 'tokens') download(exportTokensCsv(file, result, t.export))
    if (format === 'diagnostics')
      download(
        exportDiagnosticsCsv(file, result, t.export, t.phases.names, execution),
      )
    if (result.ast && format === 'treeText')
      download(exportTreeText(file, result.ast, t.export, arbol))
    if (result.ast && format === 'treeSvg')
      download(exportTreeSvg(file, result.ast, t.export, arbol))
    if (format === 'blocks')
      download(
        exportBlocksSvg(file, result, t.export, { optimizado: optimized }),
      )
    if (format === 'output' && execution)
      download(exportOutput(file, execution, t.export, input))
    if (format === 'intermediate')
      download(
        exportIntermediate(file, result, t.export, {
          optimizado: optimized,
          pasadas: t.intermediate.passes,
        }),
      )
    if (format === 'symbols')
      download(exportSymbolsCsv(file, result, t.export, execution?.memoria))
    if (format === 'json')
      download(
        exportResultJson(
          file,
          source,
          result,
          t.export,
          executed ? { entrada: input, resultado: execution } : undefined,
        ),
      )
    if (format === 'trace')
      download(exportTraceCsv(file, result, t.export, t.stepCard.actions))
  }

  const copy = async (que: Copia) => {
    close()
    if (!result) return
    const { markdownIntermediate, markdownSymbols } = await cargar()
    const texto =
      que === 'copyIntermediate'
        ? markdownIntermediate(result, t.export, { optimizado: optimized })
        : markdownSymbols(result, t.export, execution?.memoria)
    try {
      await navigator.clipboard.writeText(texto)
      setAviso(tm.copied)
    } catch {
      setAviso(tm.copyFailed)
    }
  }

  const onMenuKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (e.key === 'Tab') return setOpen(false)
    const list = enabledItems(root.current)
    const i = list.indexOf(document.activeElement as HTMLElement)
    const next: Record<string, number> = {
      ArrowDown: (i + 1) % list.length,
      ArrowUp: (i - 1 + list.length) % list.length,
      Home: 0,
      End: list.length - 1,
    }
    if (!(e.key in next)) return
    e.preventDefault()
    list[next[e.key]]?.focus()
  }

  const opcion = <T extends Format | Copia>(
    { id, label, motivo: m }: Item<T>,
    accion: (id: T) => void,
    extension?: string,
  ) => {
    const Icon: typeof Download = ICONS[id as Format | Copia]
    const disabled = m !== null
    return (
      <button
        key={id}
        type="button"
        role="menuitem"
        tabIndex={-1}
        aria-disabled={disabled}
        aria-description={m ? tm.reasons[m] : undefined}
        title={m ? tm.reasons[m] : undefined}
        onClick={() => !disabled && accion(id)}
        className={clsx(
          'flex w-full items-start gap-2.5 rounded px-2 py-1.5 text-left text-[13px] outline-none max-md:min-h-11',
          disabled
            ? 'cursor-not-allowed'
            : 'hover:bg-surface-2 focus-visible:bg-surface-2',
        )}
      >
        <Icon
          size={16}
          className={clsx(
            'mt-0.5 shrink-0 text-muted',
            disabled && 'opacity-40',
          )}
          aria-hidden
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={clsx(disabled && 'opacity-40')}>{label}</span>
          {m && (
            <span aria-hidden className="text-[11px] text-muted">
              {tm.reasons[m]}
            </span>
          )}
        </span>
        {extension && (
          <span
            className={clsx(
              'mt-0.5 font-mono text-[11px] text-muted',
              disabled && 'opacity-40',
            )}
          >
            .{extension}
          </span>
        )}
      </button>
    )
  }

  return (
    <div ref={root} className="relative" data-tour="exportar">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={compact ? t.header.export : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className={clsx(
          'inline-flex items-center justify-center gap-1.5 rounded text-[13px] transition-colors hover:bg-surface-2',
          compact ? 'size-11' : 'h-8 border border-border pr-1.5 pl-2.5',
          open && 'bg-surface-2',
        )}
      >
        <Download size={compact ? 20 : 15} aria-hidden />
        {!compact && (
          <>
            {t.header.export}
            <ChevronDown
              size={14}
              aria-hidden
              className={clsx(
                'text-muted transition-transform',
                open && 'rotate-180',
              )}
            />
          </>
        )}
      </button>
      <span
        role="status"
        className={clsx(
          'absolute top-full right-0 z-50 mt-1.5 w-max rounded bg-raised px-2 py-1 text-xs shadow-lg',
          !aviso && 'sr-only',
        )}
      >
        {aviso}
      </span>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t.header.export}
          onKeyDown={onMenuKey}
          className="absolute top-full right-0 z-50 mt-1.5 max-h-[75vh] w-72 overflow-y-auto rounded-md border border-muted/40 bg-raised p-1 shadow-xl shadow-black/20"
        >
          {grupos.map((g) => (
            <div key={g.id}>
              {/* biome-ignore lint/a11y/useSemanticElements: en un menú ARIA, los grupos son role="group" (fieldset es para formularios) */}
              <div role="group" aria-label={g.label}>
                <p
                  aria-hidden
                  className="px-2 pt-0.5 pb-1 text-[11px] font-medium text-muted"
                >
                  {g.label}
                </p>
                {g.items.map((item) =>
                  opcion(item, (id) => void save(id), EXT[item.id]),
                )}
              </div>
              <hr className="my-1 border-border" />
            </div>
          ))}
          {/* biome-ignore lint/a11y/useSemanticElements: en un menú ARIA, los grupos son role="group" (fieldset es para formularios) */}
          <div role="group" aria-label={tm.copyGroup}>
            <p
              aria-hidden
              className="px-2 pt-0.5 pb-1 text-[11px] font-medium text-muted"
            >
              {tm.copyGroup}
            </p>
            {copias.map((item) => opcion(item, (id) => void copy(id)))}
          </div>
        </div>
      )}
    </div>
  )
}
