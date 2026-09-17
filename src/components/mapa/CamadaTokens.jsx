import { useRef, useState } from 'react'
import { encaixar, mapaParaTela } from '../../lib/mapaEngine'

const TAMANHOS_TOKEN =[0.5, 1, 2, 3, 4, 5, 6, 8]

const iniciais = nome => (nome || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')
const corVida = pct => (pct > 0.5 ? 'var(--ok)' : pct > 0.25 ? 'var(--warn)' : 'var(--harm)')
const diametro = (token, grade) => (Number(grade.tamanho) > 0 ? Number(grade.tamanho) : 70) * Number(token.tamanho || 1)

/**
 * Fase 26.2 — tokens desenhados em px do mapa.
 *
 * `tokens` já chegam "visuais" (MapaPage resolve nome/imagem da ficha, vida,
 * turno e permissão). Arraste: posição local imediata + broadcast; ao soltar,
 * encaixa na grade (se ativa), prende dentro do mapa e grava.
 */
export default function CamadaTokens({ ctx, tokens, largura, altura, selecionadoId, onSelecionar, onArrastar, onSoltar }) {
  const [local, setLocal] = useState(null) // { id, x, y } do meu arraste
  const arraste = useRef(null)
  const z = ctx.vista.zoom
  const px = n => n / z // tamanho constante na TELA

  function pressionar(e, tk) {
    if (e.pointerType === 'mouse' && e.button !== 0) return // botão do meio segue p/ o pan
    e.stopPropagation()
    // Sem permissão de mover: o toque só seleciona. Com permissão, seleciona no
    // soltar SEM ter arrastado — arrastar não abre o menu (cobriria os vizinhos).
    if (!tk.podeMover) { onSelecionar(tk.id); return }
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = ctx.paraMapa(e.clientX, e.clientY)
    arraste.current = {
      id: tk.id, pointerId: e.pointerId, tamanho: tk.tamanho,
      dx: tk.x - p.x, dy: tk.y - p.y, x0: e.clientX, y0: e.clientY, pos: null,
    }
  }

  function mover(e) {
    const a = arraste.current
    if (!a || a.pointerId !== e.pointerId) return
    if (!a.pos && Math.hypot(e.clientX - a.x0, e.clientY - a.y0) < 4) return
    const p = ctx.paraMapa(e.clientX, e.clientY)
    a.pos = { x: p.x + a.dx, y: p.y + a.dy }
    setLocal({ id: a.id, ...a.pos })
    onArrastar(a.id, a.pos.x, a.pos.y)
  }

  async function soltar(e) {
    const a = arraste.current
    if (!a || a.pointerId !== e.pointerId) return
    arraste.current = null
    if (!a.pos) {
      if (e.type === 'pointerup') onSelecionar(a.id)
      return
    }
    onSelecionar(null)
    const p =ctx.grade.ativa ? encaixar(a.pos, ctx.grade, a.tamanho) : a.pos
    const final = { x: Math.min(Math.max(p.x, 0), largura), y: Math.min(Math.max(p.y, 0), altura) }
    setLocal({ id: a.id, ...final })
    try { await onSoltar(a.id, final.x, final.y) } finally { setLocal(null) }
  }

  return (
    <g>
      <defs>
        <clipPath id="token-circulo" clipPathUnits="objectBoundingBox">
          <circle cx="0.5" cy="0.5" r="0.5" />
        </clipPath>
      </defs>
      {tokens.map(tk => {
        const pos = local?.id === tk.id ? local : tk
        const d = diametro(tk, ctx.grade)
        const r = d / 2
        const borda = Math.max(d * 0.06, px(2))
        const pct = tk.vida ? Math.min(1, Math.max(0, tk.vida.atual / tk.vida.max)) : 0
        const mostrarNome = d * z >= 24
        return (
          <g
            key={tk.id}
            transform={`translate(${pos.x} ${pos.y})`}
            opacity={tk.oculto ? 0.55 : 1}
            style={{ cursor: tk.podeMover ? 'grab' : 'pointer', touchAction: 'none' }}
            onPointerDown={e => pressionar(e, tk)}
            onPointerMove={mover}
            onPointerUp={soltar}
            onPointerCancel={soltar}
          >
            {tk.daVez && (
              <circle r={r + px(7)} fill="none" stroke="var(--dice-400)" strokeWidth={px(3)} className="token-turno" />
            )}
            {selecionadoId === tk.id && (
              <circle r={r + px(3)} fill="none" stroke="var(--accent-300)" strokeWidth={px(2)} strokeDasharray={`${px(5)} ${px(3)}`} />
            )}
            <circle r={r} fill={tk.cor || '#8B5CF6'} />
            {tk.imagem ? (
              <image href={tk.imagem} x={-r} y={-r} width={d} height={d} preserveAspectRatio="xMidYMid slice" clipPath="url(#token-circulo)" />
            ) : (
              <text textAnchor="middle" dominantBaseline="central" fontSize={r * 0.8} fontWeight="700" fill="#fff" pointerEvents="none">
                {iniciais(tk.nome)}
              </text>
            )}
            <circle
              r={r - borda / 2} fill="none" stroke={tk.cor || '#8B5CF6'} strokeWidth={borda}
              strokeDasharray={tk.oculto ? `${borda * 2} ${borda * 1.5}` : undefined}
            />
            {tk.vida && (
              <g transform={`translate(${-r} ${-r - px(9)})`} pointerEvents="none">
                <rect width={d} height={px(5)} rx={px(2)} fill="rgba(0,0,0,.65)" />
                <rect width={d * pct} height={px(5)} rx={px(2)} fill={corVida(pct)} />
                {tk.vida.temp > 0 && <rect y={-px(3)} width={d * Math.min(1, tk.vida.temp / tk.vida.max)} height={px(2)} fill="var(--temp)" />}
              </g>
            )}
            {mostrarNome && (
              <text
                y={r + px(14)} textAnchor="middle" fontSize={px(12)} fontWeight="600" fill="#fff"
                stroke="rgba(0,0,0,.85)" strokeWidth={px(3)} paintOrder="stroke" pointerEvents="none"
              >
                {tk.nome}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}

/** Menu HTML do token selecionado, flutuando acima dele. */
export function MenuToken({ ctx, token, isGestor, onAtualizar, onRemover, onAbrirFicha }) {
  const [erro, setErro] = useState('')
  const d = diametro(token, ctx.grade)
  const s = mapaParaTela({ x: token.x, y: token.y - d / 2 }, ctx.vista)
  const idx = TAMANHOS_TOKEN.indexOf(Number(token.tamanho))
  const tentar = fn => async () => {
    setErro('')
    try { await fn() } catch (err) { setErro(err.message || 'Falhou.') }
  }
  const mudarTamanho = passo => {
    const atual = idx >= 0 ? idx : 1
    const novo = TAMANHOS_TOKEN[Math.min(TAMANHOS_TOKEN.length - 1, Math.max(0, atual + passo))]
    // Tamanho par encaixa no cruzamento, ímpar no centro da célula → reencaixa.
    const pos = ctx.grade.ativa ? encaixar(token, ctx.grade, novo) : {}
    return tentar(() => onAtualizar(token.id, { tamanho: novo, ...pos }))
  }
  const BTN = 'h-8 min-w-8 px-2 rounded-md text-sm text-ink hover:bg-hover transition-colors'

  return (
    <div
      className="absolute z-10 pointer-events-auto"
      style={{ left: s.x, top: s.y - 14, transform: 'translate(-50%, -100%)' }}
      onPointerDown={e => e.stopPropagation()}
    >
      <div className="rounded-xl border border-border bg-bg/95 backdrop-blur shadow-xl px-2 py-1.5 min-w-[9rem]">
        <p className="text-ink text-sm font-semibold text-center truncate max-w-[14rem] px-1">{token.nome}</p>
        {token.vida && (
          <p className="text-ink-dim text-xs text-center">
            {token.vida.atual}/{token.vida.max}{token.vida.temp > 0 ? ` (+${token.vida.temp})` : ''}
          </p>
        )}
        <div className="flex items-center justify-center gap-0.5 mt-1">
          {isGestor && (
            <>
              <button onClick={mudarTamanho(-1)} className={BTN} title="Diminuir">−</button>
              <span className="text-ink-dim text-xs w-9 text-center">{token.tamanho}×</span>
              <button onClick={mudarTamanho(+1)} className={BTN} title="Aumentar">+</button>
              <button onClick={tentar(() => onAtualizar(token.id, { oculto: !token.oculto }))} className={BTN} title={token.oculto ? 'Mostrar aos jogadores' : 'Esconder dos jogadores'}>
                {token.oculto ? '🙈' : '👁'}
              </button>
              <button onClick={tentar(() => onRemover(token.id))} className={`${BTN} hover:text-harm`} title="Tirar do mapa">🗑</button>
            </>
          )}
          {token.ficha_id && (
            <button onClick={() => onAbrirFicha(token.ficha_id)} className={BTN} title="Abrir ficha">📜</button>
          )}
        </div>
        {erro && <p className="text-harm text-xs text-center mt-1">{erro}</p>}
      </div>
    </div>
  )
}
