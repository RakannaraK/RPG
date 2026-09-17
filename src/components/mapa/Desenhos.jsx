import { useRef, useState } from 'react'
import { encaixar, medir } from '../../lib/mapaEngine'
import CapturaMapa from './CapturaMapa'

const CORES_DESENHO = ['#FBBF24', '#F87171', '#60A5FA', '#34D399', '#FFFFFF', '#111827']
const ESPESSURAS_DESENHO = [2, 4, 8] // px de TELA no momento do traço

const caminho = pontos => (pontos?.length
  ? `M ${pontos[0][0]} ${pontos[0][1]} ` + (pontos.length > 1 ? pontos.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ') : `L ${pontos[0][0]} ${pontos[0][1]}`)
  : '')

/**
 * Fase 26.4 — traços gravados (e o rascunho de quem desenha agora).
 * Com a borracha ligada, cada traço apagável ganha uma área de clique larga.
 */
export function CamadaDesenhos({ ctx, desenhos, rascunho, borracha, podeApagar, onApagar }) {
  const px = n => n / ctx.vista.zoom
  return (
    <g>
      {desenhos.map(d => (
        <g key={d.id}>
          <path d={caminho(d.pontos)} fill="none" stroke={d.cor} strokeWidth={d.espessura} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
          {borracha && podeApagar(d) && (
            <path
              d={caminho(d.pontos)} fill="none" stroke="transparent"
              strokeWidth={Math.max(Number(d.espessura) || 0, px(16))} strokeLinecap="round"
              pointerEvents="stroke" style={{ cursor: 'pointer' }}
              onPointerDown={e => { e.stopPropagation(); onApagar(d.id) }}
            />
          )}
        </g>
      ))}
      {rascunho && (
        <path d={caminho(rascunho.pontos)} fill="none" stroke={rascunho.cor} strokeWidth={rascunho.espessura} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
      )}
    </g>
  )
}

/** Traço livre (amostrado a cada ~3 px de tela) ou linha reta. Espessura fica em px do mapa. */
export function EditorDesenho({ ctx, largura, altura, config, onRascunho, onConcluir }) {
  const atual = useRef(null)
  const montar = a => ({
    forma: config.forma,
    cor: config.cor,
    espessura: Math.round((config.espessura / ctx.vista.zoom) * 10) / 10,
    pontos: config.forma === 'linha' ? [a.inicio, a.fim] : a.pontos,
  })
  return (
    <CapturaMapa
      ctx={ctx} largura={largura} altura={altura}
      onInicio={p => {
        atual.current = { inicio: [p.x, p.y], fim: [p.x, p.y], pontos: [[p.x, p.y]] }
        onRascunho(montar(atual.current))
      }}
      onMover={p => {
        const a = atual.current
        a.fim = [p.x, p.y]
        const u = a.pontos[a.pontos.length - 1]
        if (Math.hypot(p.x - u[0], p.y - u[1]) >= 3 / ctx.vista.zoom) a.pontos = [...a.pontos, [p.x, p.y]]
        onRascunho(montar(a))
      }}
      onFim={(_, concluiu) => {
        const a = atual.current
        atual.current = null
        onRascunho(null)
        if (concluiu && a) onConcluir(montar(a))
      }}
    />
  )
}

/** Régua: arrasta de A até B; pontas no centro da célula quando há grade. */
export function EditorRegua({ ctx, largura, altura, onMedir, onFim }) {
  const inicio = useRef(null)
  const medida = useRef(0)
  const ajustar = p => (ctx.grade.ativa ? encaixar(p, ctx.grade, 1) : p)
  return (
    <CapturaMapa
      ctx={ctx} largura={largura} altura={altura}
      onInicio={p => {
        medida.current++
        inicio.current = ajustar(p)
        onMedir(inicio.current, inicio.current)
      }}
      onMover={p => onMedir(inicio.current, ajustar(p))}
      // Deixa a medida na tela um instante depois de soltar (se não começou outra)
      onFim={() => {
        const esta = medida.current
        inicio.current = null
        setTimeout(() => { if (medida.current === esta) onFim() }, 1500)
      }}
    />
  )
}

/** Toque único vira ping (ferramenta 📍). */
export function EditorPing({ ctx, largura, altura, onPing }) {
  return <CapturaMapa ctx={ctx} largura={largura} altura={altura} cursor="pointer" onInicio={p => onPing(p.x, p.y)} />
}

export function CamadaReguas({ ctx, reguas }) {
  const px = n => n / ctx.vista.zoom
  return (
    <g pointerEvents="none">
      {Object.entries(reguas).map(([autor, { a, b, cor }]) => (
        <g key={autor}>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={cor} strokeWidth={px(3)} strokeDasharray={`${px(10)} ${px(6)}`} strokeLinecap="round" />
          <circle cx={a.x} cy={a.y} r={px(5)} fill={cor} />
          <circle cx={b.x} cy={b.y} r={px(5)} fill={cor} />
          <text
            x={b.x + px(12)} y={b.y - px(12)} fontSize={px(14)} fontWeight="700" fill="#fff"
            stroke="rgba(0,0,0,.85)" strokeWidth={px(4)} paintOrder="stroke"
          >
            {medir(a, b, ctx.grade).rotulo}
          </text>
        </g>
      ))}
    </g>
  )
}

export function CamadaPings({ ctx, pings }) {
  const px = n => n / ctx.vista.zoom
  return (
    <g pointerEvents="none">
      {pings.map(p => (
        <g key={p.id} transform={`translate(${p.x} ${p.y})`}>
          <circle r={px(34)} fill="none" stroke={p.cor} strokeWidth={px(4)} className="ping-onda" />
          <circle r={px(34)} fill="none" stroke={p.cor} strokeWidth={px(3)} className="ping-onda ping-onda-2" />
          <circle r={px(6)} fill={p.cor} stroke="#000" strokeWidth={px(1.5)} />
        </g>
      ))}
    </g>
  )
}

const BTN = 'px-2.5 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap'
const ativoCls = on => (on ? 'bg-accent-600 text-white' : 'bg-hover text-ink hover:bg-border')

/** Barra flutuante do desenho. */
export function BarraDesenho({ config, onConfig, isGestor, jogadoresDesenham, onAlternarJogadores, onLimpar, onFechar }) {
  const [confirmarTudo, setConfirmarTudo] = useState(false)
  const set = patch => onConfig({ ...config, ...patch })
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 max-w-[calc(100%-1.5rem)]" onPointerDown={e => e.stopPropagation()}>
      <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-border bg-bg/95 backdrop-blur shadow-xl px-2 py-2">
        <button onClick={() => set({ forma: 'livre' })} className={`${BTN} ${ativoCls(config.forma === 'livre')}`} title="Traço livre">✏️</button>
        <button onClick={() => set({ forma: 'linha' })} className={`${BTN} ${ativoCls(config.forma === 'linha')}`} title="Linha reta">／</button>
        <button onClick={() => set({ forma: 'borracha' })} className={`${BTN} ${ativoCls(config.forma === 'borracha')}`} title="Borracha: toque num traço para apagar">🧽</button>
        <span className="w-px h-6 bg-border" />
        {CORES_DESENHO.map(c => (
          <button
            key={c}
            onClick={() => set({ cor: c, forma: config.forma === 'borracha' ? 'livre' : config.forma })}
            className={`w-6 h-6 rounded-full border-2 ${config.cor === c ? 'border-accent-300 scale-110' : 'border-border'}`}
            style={{ background: c }}
            title="Cor"
          />
        ))}
        <span className="w-px h-6 bg-border" />
        {ESPESSURAS_DESENHO.map(e => (
          <button key={e} onClick={() => set({ espessura: e })} className={`${BTN} ${ativoCls(config.espessura === e)}`} title="Espessura">
            <span className="block rounded-full bg-current" style={{ width: e + 4, height: e + 4 }} />
          </button>
        ))}
        <span className="w-px h-6 bg-border" />
        <button onClick={() => onLimpar(false)} className={`${BTN} bg-hover text-ink hover:bg-border`}>Limpar meus</button>
        {isGestor && (confirmarTudo ? (
          <>
            <button onClick={() => { setConfirmarTudo(false); onLimpar(true) }} className={`${BTN} bg-red-700 hover:bg-red-600 text-white`}>Apagar todos</button>
            <button onClick={() => setConfirmarTudo(false)} className={`${BTN} bg-hover text-ink`}>✕</button>
          </>
        ) : (
          <button onClick={() => setConfirmarTudo(true)} className={`${BTN} bg-hover text-ink hover:bg-border`}>Limpar tudo</button>
        ))}
        {isGestor && (
          <label className="flex items-center gap-1.5 text-sm text-ink px-1 cursor-pointer">
            <input type="checkbox" checked={jogadoresDesenham} onChange={onAlternarJogadores} />
            Jogadores desenham
          </label>
        )}
        <button onClick={onFechar} className={`${BTN} text-ink-dim hover:text-ink`} title="Voltar a mover">✕</button>
      </div>
    </div>
  )
}

/** Barra vertical de ferramentas (todas as pessoas; névoa só gestor). */
export function BarraFerramentas({ ferramenta, onFerramenta, podeDesenhar, isGestor }) {
  const itens = [
    { id: 'mover', icone: '✋', nome: 'Mover (V)' },
    podeDesenhar && { id: 'desenho', icone: '✏️', nome: 'Desenhar (D)' },
    { id: 'regua', icone: '📏', nome: 'Régua (R)' },
    { id: 'ping', icone: '📍', nome: 'Ping (P) — ou segure o clique parado' },
    isGestor && { id: 'nevoa', icone: '🌫', nome: 'Névoa de guerra (N)' },
  ].filter(Boolean)
  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10" onPointerDown={e => e.stopPropagation()}>
      <div className="flex flex-col gap-1 rounded-xl border border-border bg-bg/90 backdrop-blur shadow-xl p-1">
        {itens.map(it => (
          <button
            key={it.id}
            onClick={() => onFerramenta(it.id)}
            title={it.nome}
            aria-label={it.nome}
            aria-pressed={ferramenta === it.id}
            className={`w-10 h-10 rounded-lg text-lg transition-colors ${ferramenta === it.id ? 'bg-accent-600' : 'hover:bg-hover'}`}
          >
            {it.icone}
          </button>
        ))}
      </div>
    </div>
  )
}
