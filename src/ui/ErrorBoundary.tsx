import { Component, type ErrorInfo, type ReactNode } from 'react'
import { EXAMPLE } from '@/examples'
import { mensajes } from '@/i18n'
import { useAppStore } from '@/store/appStore'
import { Button } from './Button'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  private recuperar(accion: () => void) {
    accion()
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const s = useAppStore.getState()
    const t = mensajes(s.lang).crash
    return (
      <div
        role="alert"
        className="mx-auto flex h-full max-w-xl flex-col justify-center gap-4 px-4 py-8 text-text"
      >
        <h1 className="font-semibold text-lg">{t.title}</h1>
        <p className="text-muted text-sm">{t.body}</p>
        <pre className="overflow-x-auto rounded border border-border bg-surface-2 p-2 font-mono text-xs">
          {error.message}
        </pre>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() => this.recuperar(() => s.restoreLastGood())}
          >
            {t.restore}
          </Button>
          <Button
            onClick={() =>
              this.recuperar(() =>
                s.loadFile(EXAMPLE.file, EXAMPLE.source, EXAMPLE.inputs[0]),
              )
            }
          >
            {t.example}
          </Button>
        </div>
      </div>
    )
  }
}
