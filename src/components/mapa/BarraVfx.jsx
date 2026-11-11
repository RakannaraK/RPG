const BTN = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap'
const ativoCls = on => (on ? 'bg-accent-600 text-sobre-acento' : 'bg-hover text-ink hover:bg-border')

/** Barra flutuante da ferramenta "Efeito" (mestre): um botão por efeito de ação. */
export default function BarraVfx({ efeitos = [], escolhido, onEscolher }) {
  return (
    <div
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 max-w-[calc(100%-1.5rem)]"
      onPointerDown={e => e.stopPropagation()}
    >
      <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-bg/95 backdrop-blur shadow-xl px-2 py-2">
        {/* duas linhas e um pedaço da terceira: com várias extensões a barra não cobre o mapa */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 max-h-[5.25rem] overflow-y-auto">
          {efeitos.map(e => (
            <button
              key={e.id}
              type="button"
              aria-pressed={escolhido === e.id}
              onClick={() => onEscolher(e.id)}
              className={`${BTN} ${ativoCls(escolhido === e.id)}`}
            >
              <span aria-hidden="true" className="flex">
                <i className="w-3 h-3 rounded-full border border-border" style={{ background: e.cores?.[0] }} />
                <i className="w-3 h-3 rounded-full border border-border -ml-1" style={{ background: e.cores?.[1] }} />
              </span>
              {e.nome}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-dim text-center">Clique no mapa para soltar · arraste para lançar de um ponto a outro</p>
      </div>
    </div>
  )
}
