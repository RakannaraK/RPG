import { memo, useRef } from 'react'
import { normalizarNevoa, normalizarRet } from '../../lib/mapaEngine'
import CapturaMapa from './CapturaMapa'

const caminho = pontos => {
  if (!pontos?.length) return ''
  const [p0, ...resto] = pontos
  // Toque único vira um ponto: segmento de tamanho zero com ponta redonda.
  return `M ${p0[0]} ${p0[1]} ` + (resto.length ? resto.map(p => `L ${p[0]} ${p[1]}`).join(' ') : `L ${p0[0]} ${p0[1]}`)
}

function FormaMascara({ op, largura, altura }) {
  const cor = op.modo === 'revelar' ? 'black' : 'white'
  if (op.forma === 'tudo') return <rect width={largura} height={altura} fill={cor} />
  if (op.forma === 'ret') return <rect x={op.x} y={op.y} width={op.w} height={op.h} fill={cor} />
  if (op.forma === 'traco') {
    return <path d={caminho(op.pontos)} fill="none" stroke={cor} strokeWidth={op.raio * 2} strokeLinecap="round" strokeLinejoin="round" />
  }
  return null
}

/**
 * Fase 26.3 — névoa desenhada por máscara (branco = névoa, preto = revelado),
 * aplicando as operações em ordem. Mestre vê translúcida; jogador, opaca.
 * Só PINTA: esconder tokens de verdade é o `pontoRevelado` na MapaPage.
 */
// 26.6 — memo: pan/zoom não refaz a máscara (a MapaPage memoriza `nevoa`).
export const CamadaNevoa = memo(function CamadaNevoa({ nevoa, rascunho, largura, altura, translucida }) {
  const n = normalizarNevoa(nevoa)
  // Desligada: some — exceto enquanto o mestre desenha (a 1ª operação liga a névoa).
  if (!n.ativa && !rascunho) return null
  return (
    <g pointerEvents="none">
      <defs>
        <mask id="mascara-nevoa" maskUnits="userSpaceOnUse" x="0" y="0" width={largura} height={altura}>
          <rect width={largura} height={altura} fill="white" />
          {n.ops.map((op, i) => <FormaMascara key={i} op={op} largura={largura} altura={altura} />)}
          {rascunho && <FormaMascara op={rascunho} largura={largura} altura={altura} />}
        </mask>
      </defs>
      <rect width={largura} height={altura} fill="#05030a" opacity={translucida ? 0.55 : 1} mask="url(#mascara-nevoa)" />
    </g>
  )
})

/** Desenho da névoa pelo mestre: retângulo arrastado ou pincel. */
export function EditorNevoa({ ctx, largura, altura, config, onRascunho, onConcluir }) {
  const atual = useRef(null)
  const arred = p => ({ x: Math.round(p.x), y: Math.round(p.y) })
  const montar = a => (config.forma === 'ret'
    ? { modo: config.modo, forma: 'ret', ...normalizarRet(a.inicio, a.fim) }
    : { modo: config.modo, forma: 'traco', raio: config.raio, pontos: a.pontos })

  return (
    <CapturaMapa
      ctx={ctx}
      largura={largura}
      altura={altura}
      onInicio={p0 => {
        const p = arred(p0)
        atual.current = { inicio: p, fim: p, pontos: [[p.x, p.y]] }
        onRascunho(montar(atual.current))
      }}
      onMover={p0 => {
        const a = atual.current
        const p = arred(p0)
        a.fim = p
        const ultimo = a.pontos[a.pontos.length - 1]
        // ponytail: amostragem por distância (raio/3); simplificação de traço se o JSON crescer demais
        if (Math.hypot(p.x - ultimo[0], p.y - ultimo[1]) >= Math.max(2, config.raio / 3)) a.pontos = [...a.pontos, [p.x, p.y]]
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

const BTN = 'px-2.5 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap'
const ativoCls = on => (on ? 'bg-accent-600 text-white' : 'bg-hover text-ink hover:bg-border')

/** Barra flutuante da ferramenta de névoa (mestre). */
export function BarraNevoa({ nevoa, config, onConfig, onAlternar, onTudo, onFechar, tamanhoGrade }) {
  const n = normalizarNevoa(nevoa)
  const set = patch => onConfig({ ...config, ...patch })
  return (
    <div
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 max-w-[calc(100%-1.5rem)]"
      onPointerDown={e => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-border bg-bg/95 backdrop-blur shadow-xl px-2 py-2">
        <button onClick={onAlternar} className={`${BTN} ${n.ativa ? 'bg-emerald-900/50 text-ok' : 'bg-hover text-ink-dim'}`} title="Liga/desliga a névoa para os jogadores">
          🌫 {n.ativa ? 'Névoa ligada' : 'Névoa desligada'}
        </button>
        <span className="w-px h-6 bg-border" />
        <button onClick={() => set({ modo: 'revelar' })} className={`${BTN} ${ativoCls(config.modo === 'revelar')}`}>Revelar</button>
        <button onClick={() => set({ modo: 'cobrir' })} className={`${BTN} ${ativoCls(config.modo === 'cobrir')}`}>Cobrir</button>
        <span className="w-px h-6 bg-border" />
        <button onClick={() => set({ forma: 'ret' })} className={`${BTN} ${ativoCls(config.forma === 'ret')}`} title="Arraste um retângulo">▭</button>
        <button onClick={() => set({ forma: 'traco' })} className={`${BTN} ${ativoCls(config.forma === 'traco')}`} title="Pincel">🖌</button>
        {config.forma === 'traco' && (
          <input
            type="range"
            min={Math.max(5, Math.round(tamanhoGrade / 4))}
            max={Math.round(tamanhoGrade * 5)}
            value={config.raio}
            onChange={e => set({ raio: Number(e.target.value) })}
            className="w-24"
            title="Tamanho do pincel"
          />
        )}
        <span className="w-px h-6 bg-border" />
        <button onClick={() => onTudo('revelar')} className={`${BTN} bg-hover text-ink hover:bg-border`}>Revelar tudo</button>
        <button onClick={() => onTudo('cobrir')} className={`${BTN} bg-hover text-ink hover:bg-border`}>Cobrir tudo</button>
        <button onClick={onFechar} className={`${BTN} text-ink-dim hover:text-ink`} title="Voltar a mover">✕</button>
      </div>
    </div>
  )
}
