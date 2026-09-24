import { Component } from 'react'

// Rede de segurança: captura exceções de render/lifecycle da árvore abaixo e
// mostra uma tela legível em vez da tela branca. O detalhe técnico fica
// disponível para o jogador copiar e reportar.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { erro: null, detalhe: '' }
  }

  static getDerivedStateFromError(erro) {
    return { erro }
  }

  componentDidCatch(erro, info) {
    // Visibilidade: loga com a pilha de componentes (aparece no DevTools e em
    // qualquer coletor de log que venha a ser plugado depois).
    console.error('[ErrorBoundary]', erro, info?.componentStack)
    this.setState({
      detalhe: `${erro?.stack || erro?.message || erro}\n\nComponentes:${info?.componentStack || ''}`,
    })
  }

  render() {
    if (!this.state.erro) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-bg">
        <div className="w-full max-w-lg bg-raised border border-border rounded-2xl p-6 space-y-4">
          <div>
            <h1 className="text-ink font-bold text-lg">Algo quebrou por aqui</h1>
            <p className="text-ink-dim text-sm mt-1">
              A página encontrou um erro inesperado. Seus dados não foram perdidos — recarregar costuma resolver.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-accent-600 hover:bg-accent-500 text-sobre-acento font-semibold rounded-lg text-sm transition-colors"
            >
              Recarregar
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = '/' }}
              className="px-4 py-2 border border-border text-ink-dim hover:text-ink rounded-lg text-sm transition-colors"
            >
              Voltar ao início
            </button>
          </div>

          {this.state.detalhe && (
            <details className="text-xs">
              <summary className="text-ink-dim cursor-pointer hover:text-ink">Detalhes técnicos (para reportar)</summary>
              <pre className="mt-2 p-3 bg-void border border-border rounded-lg text-ink-dim overflow-auto max-h-60 whitespace-pre-wrap">
                {this.state.detalhe}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}
