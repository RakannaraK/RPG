/**
 * Fase 13.3 — painel de fichas em tempo real. Renderiza os cards computados
 * (pelo motor) de useSessaoFichas. Puro de apresentação — a lógica/realtime
 * fica no hook.
 */
import { memo } from 'react'

function corVida(pct) {
  if (pct > 50) return 'bg-green-500'
  if (pct > 25) return 'bg-amber-500'
  return 'bg-red-500'
}

// 24.2 — trilha compacta (caixinhas mini) p/ card de sessão e combate
export function MiniTrilha({ trilha }) {
  const porId = Object.fromEntries((trilha.config?.tipos_marca || []).map(tm => [tm.id, tm]))
  const sevMax = Math.max(0, ...(trilha.config?.tipos_marca || []).map(tm => Number(tm.severidade) || 0))
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-purple-400 text-[10px] uppercase tracking-wide">{trilha.nome}</span>
      <div className="flex flex-wrap gap-0.5">
        {trilha.exibicao.map((m, i) => {
          const cls = m == null ? 'bg-slate-700/70'
            : (Number(porId[m]?.severidade) || 0) >= sevMax ? 'bg-red-500' : 'bg-amber-500'
          return <span key={i} className={`w-2.5 h-2.5 rounded-[3px] ${cls}`} title={m ? porId[m]?.nome : ''} />
        })}
      </div>
      <span className="text-purple-500 text-[10px] font-mono">{trilha.cont.marcadas}/{trilha.cont.total}</span>
      {trilha.cheiaDoMaior && trilha.rotuloCheia && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500 text-red-200">☠ {trilha.rotuloCheia}</span>
      )}
    </div>
  )
}

function ChipEstado({ chip }) {
  const cls = {
    habilidade: 'bg-purple-900/60 border-purple-600/60 text-purple-200',
    condicao:   'bg-amber-900/50 border-amber-600/60 text-amber-200',
    vantagem:   'bg-green-900/50 border-green-700/60 text-green-300',
    desvantagem:'bg-red-900/50 border-red-700/60 text-red-300',
  }[chip.tipo] || 'bg-slate-700 border-slate-600 text-slate-200'
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${cls}`}>
      {chip.label}
    </span>
  )
}

const FichaCard = memo(function FichaCard({ card, camposCombate, souDono = false, onToggleCondicao }) {
  const hpMax = card.hpMax || card.hpMaxBase || 0
  const pct = hpMax > 0 ? Math.min(100, Math.max(0, (card.hpAtual / hpMax) * 100)) : 0
  const subtitulo = [card.racaNome, card.classeNome, card.nivel ? `Nível ${card.nivel}` : null]
    .filter(Boolean)
    .join(' · ')
  const temModVida = card.hpMax !== card.hpMaxBase

  return (
    <div className="bg-slate-800 border border-purple-800/70 rounded-2xl p-4 space-y-3">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        {card.imagem ? (
          <img src={card.imagem} alt={card.nome} className="w-11 h-11 rounded-lg object-cover border border-purple-700 shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-lg bg-purple-950 border border-purple-800 flex items-center justify-center shrink-0">
            <span className="text-purple-300 font-bold text-sm">
              {(card.nome || '?').slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-sm leading-tight truncate">{card.nome}</p>
          {subtitulo && <p className="text-purple-400 text-xs truncate">{subtitulo}</p>}
        </div>
      </div>

      {/* Vida — trilha substitui a barra quando configurada (24.2) */}
      {card.trilhaVida ? (
        <MiniTrilha trilha={card.trilhaVida} />
      ) : (
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-purple-400 text-[11px] uppercase tracking-wider">Vida</span>
            <span className="text-white text-sm font-semibold">
              {card.hpAtual}
              <span className="text-purple-500 font-normal"> / {hpMax || '?'}</span>
              {temModVida && card.hpMax > card.hpMaxBase && (
                <span className="text-green-400 text-[10px] font-mono ml-1">(+{card.hpMax - card.hpMaxBase})</span>
              )}
            </span>
          </div>
          <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${corVida(pct)}`} style={{ width: `${pct}%` }} />
          </div>
          {card.vidaTemp > 0 && (
            <p className="text-sky-400 text-[11px] mt-1 font-medium">+{card.vidaTemp} vida temporária</p>
          )}
        </div>
      )}

      {/* Demais trilhas (24.2) — ao vivo */}
      {(card.trilhas || []).filter(t => !t.substitui_vida).map(t => (
        <MiniTrilha key={t.id} trilha={t} />
      ))}

      {/* Campos de combate */}
      {camposCombate.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {camposCombate.map(campo => {
            const v = card.combate?.[campo.id]
            return (
              <div key={campo.id} className="flex items-center gap-1.5 bg-slate-900/60 border border-purple-900/50 rounded-lg px-2 py-1">
                <span className="text-purple-400 text-[10px] uppercase tracking-wide">{campo.nome}</span>
                <span className="text-white text-sm font-bold leading-none">{v !== undefined ? v : '—'}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* 22.7 — interruptores situacionais do dono (ex: CA 17/19/21), ao vivo */}
      {souDono && (card.togglesManuais || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {card.togglesManuais.map(t => (
            <button
              key={t.id}
              onClick={() => onToggleCondicao?.(card.id, t.id, !t.ativo)}
              className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                t.ativo
                  ? 'bg-amber-800/70 border-amber-500/70 text-amber-100'
                  : 'bg-slate-900/60 border-slate-600/50 text-slate-400 hover:border-amber-600/60 hover:text-amber-200'
              }`}
              title={t.ativo ? 'Ligado — clique p/ desligar' : 'Desligado — clique p/ ligar'}
            >
              {t.ativo ? '◉' : '○'} {t.rotulo}
              {t.caDelta != null && <span className="ml-1 font-mono">{t.caDelta >= 0 ? `+${t.caDelta}` : t.caDelta} CA</span>}
            </button>
          ))}
        </div>
      )}

      {/* Pools (20.1) — recursos visíveis ao mestre, ao vivo */}
      {(card.pools || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {card.pools.map(p => {
            const vazio = p.atual === 0
            return (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 border ${
                  vazio ? 'bg-red-950/40 border-red-900/60' : 'bg-slate-900/60 border-sky-900/50'
                }`}
                title={p.tipo === 'dados' ? 'Reserva de dados' : 'Pontos'}
              >
                <span className="text-sky-400 text-[10px] uppercase tracking-wide">{p.nome}</span>
                <span className={`text-sm font-bold leading-none ${vazio ? 'text-red-400' : 'text-white'}`}>
                  {p.atual}
                  <span className="text-purple-600 font-normal">/{p.maximo}</span>
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Slots por círculo (20.6) — ao vivo */}
      {(card.slots || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {card.slots.map(s => {
            const esgotado = s.disponivel === 0
            return (
              <div key={s.circulo}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 border ${
                  esgotado ? 'bg-red-950/40 border-red-900/60' : 'bg-slate-900/60 border-amber-900/50'
                }`}
                title={`Slots de ${s.circulo}º círculo`}>
                <span className="text-amber-400 text-[10px] font-mono">{s.circulo}º</span>
                <span className={`text-sm font-bold leading-none ${esgotado ? 'text-red-400' : 'text-white'}`}>
                  {s.disponivel}<span className="text-purple-600 font-normal">/{s.total}</span>
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Chips de estado */}
      {card.chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-purple-900/40">
          {card.chips.map(chip => <ChipEstado key={chip.key} chip={chip} />)}
        </div>
      ) : (
        <p className="text-purple-700 text-[11px] pt-1 border-t border-purple-900/40">Sem estados ativos</p>
      )}
    </div>
  )
})

export default function PainelFichas({ cards = [], camposCombate = [], loading, error, meuUserId = null, onToggleCondicao }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="h-40 bg-slate-800/60 rounded-2xl border border-purple-900 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-4 px-3 bg-red-950/50 border border-red-800/50 rounded-xl text-red-400 text-sm">
        {error}
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-purple-800/60 bg-slate-900/30 py-14 text-center">
        <div className="text-3xl mb-2">🛡️</div>
        <p className="text-purple-400 text-sm">Nenhuma ficha nesta mesa ainda.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {cards.map(card => (
        <FichaCard
          key={card.id}
          card={card}
          camposCombate={camposCombate}
          souDono={!!meuUserId && card.ficha?.dono_id === meuUserId}
          onToggleCondicao={onToggleCondicao}
        />
      ))}
    </div>
  )
}
