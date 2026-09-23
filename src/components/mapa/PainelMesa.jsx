import { useState } from 'react'
import FeedRolagens from '../dados/FeedRolagens'
import RoladorGenerico from '../dados/RoladorGenerico'
import PainelMinigames from '../minigames/PainelMinigames'
import { ordenarPorIniciativa } from '../../lib/iniciativa'

const BTN = 'px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
const COR_TIPO = { jogador: 'text-accent-300', aliado: 'text-emerald-300', npc: 'text-amber-300', inimigo: 'text-red-300' }

/** Fase 26.5 — rolar e ver o feed sem sair do mapa. */
export function PainelRolagens({ mesaId, podeRolar, meuId, sessaoId }) {
  return (
    <div className="p-4 space-y-5">
      {podeRolar && (
        <section>
          <h2 className="text-ink-dim text-xs font-semibold uppercase tracking-wider mb-2">Rolar dados</h2>
          <RoladorGenerico mesaId={mesaId} />
        </section>
      )}
      {/* F28 — minigames sem sair do mapa */}
      <details className="rounded-xl border border-border bg-void">
        <summary className="cursor-pointer px-3 py-2 text-ink text-sm font-semibold">🎮 Minigames</summary>
        <div className="p-3 pt-1">
          <PainelMinigames mesaId={mesaId} meuId={meuId} sessaoId={sessaoId} podeJogar={podeRolar} />
        </div>
      </details>
      <section>
        <h2 className="text-ink-dim text-xs font-semibold uppercase tracking-wider mb-2">Rolagens da mesa</h2>
        <FeedRolagens mesaId={mesaId} />
      </section>
    </div>
  )
}

/**
 * Ordem de iniciativa compacta. "Próximo turno" usa o mesmo fluxo da sessão
 * (expiração de condições + custo por turno). Clicar num nome centraliza o token.
 */
export function PainelCombateMapa({ encontro, combatentes, isGestor, onProximo, onAnterior, onFocar, onAbrirSessao }) {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const executar = fn => async () => {
    setOcupado(true)
    setErro('')
    try { await fn() } catch (err) { setErro(err.message || 'Falhou.') } finally { setOcupado(false) }
  }

  if (!encontro) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-ink-dim text-sm">Nenhum combate em andamento.</p>
        {onAbrirSessao && isGestor && (
          <button onClick={onAbrirSessao} className={`${BTN} w-full bg-hover text-ink hover:bg-border`}>Abrir a sessão para iniciar um combate</button>
        )}
      </div>
    )
  }

  const ordem = ordenarPorIniciativa(combatentes)
  const vez = encontro.turno_atual ?? 0
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-ink font-semibold">{encontro.titulo || 'Combate'}</h2>
        <span className="text-dice-400 text-sm font-semibold">Rodada {encontro.rodada ?? 1}</span>
      </div>
      {isGestor && (
        <div className="flex gap-2">
          <button onClick={executar(onAnterior)} disabled={ocupado} className={`${BTN} bg-hover text-ink hover:bg-border`}>◀</button>
          <button onClick={executar(onProximo)} disabled={ocupado || ordem.length === 0} className={`${BTN} flex-1 bg-accent-600 hover:bg-accent-500 text-white`}>
            Próximo turno ▶
          </button>
        </div>
      )}
      <ol className="space-y-1">
        {ordem.map((c, i) => (
          <li key={c.id}>
            <button
              onClick={() => onFocar(c)}
              className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left border transition-colors ${
                i === vez ? 'border-dice-400 bg-raised' : 'border-border bg-void hover:bg-hover'
              }`}
              title="Centralizar no mapa"
            >
              <span className={`w-6 text-center text-xs font-mono ${i === vez ? 'text-dice-400' : 'text-ink-dim'}`}>{i === vez ? '▶' : c.iniciativa ?? '–'}</span>
              <span className={`flex-1 min-w-0 truncate text-sm ${COR_TIPO[c.tipo] || 'text-ink'}`}>{c.nome}</span>
              {i === vez && <span className="text-xs text-dice-400 uppercase tracking-wider">vez</span>}
            </button>
          </li>
        ))}
      </ol>
      {onAbrirSessao && (
        <button onClick={onAbrirSessao} className={`${BTN} w-full bg-hover text-ink-dim hover:text-ink`}>Combate completo na sessão ↗</button>
      )}
      {erro && <p className="text-harm text-sm">{erro}</p>}
    </div>
  )
}

/**
 * A ficha completa dentro da gaveta: a própria página da ficha num iframe do
 * mesmo site (mesma sessão de login). Se o navegador bloquear, "nova aba".
 */
export function GavetaFicha({ mesaId, fichaId, fichas, onEscolher }) {
  const url = fichaId ? `/mesa/${mesaId}/ficha/${fichaId}` : null
  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center gap-2 p-2 border-b border-border">
        <select
          value={fichaId || ''}
          onChange={e => onEscolher(e.target.value || null)}
          className="flex-1 min-w-0 bg-void border border-border rounded-lg px-2 py-1.5 text-sm text-ink"
        >
          <option value="">Escolha uma ficha…</option>
          {fichas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className={`${BTN} bg-hover text-ink hover:bg-border shrink-0`} title="Abrir em nova aba">↗</a>
        )}
      </div>
      {url ? (
        <iframe key={url} src={url} title="Ficha" className="flex-1 w-full bg-bg" />
      ) : (
        <p className="p-4 text-ink-dim text-sm">{fichas.length ? 'Escolha a ficha acima.' : 'Nenhuma ficha disponível.'}</p>
      )}
    </div>
  )
}

/** Camadas visíveis — preferência de cada pessoa, não afeta ninguém mais. */
export function MenuCamadas({ camadas, onCamadas, isGestor }) {
  const item = (chave, rotulo) => (
    <label key={chave} className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-hover cursor-pointer">
      <input type="checkbox" checked={!!camadas[chave]} onChange={e => onCamadas({ ...camadas, [chave]: e.target.checked })} />
      {rotulo}
    </label>
  )
  return (
    <div className="absolute right-2 top-12 z-30 w-56 rounded-xl border border-border bg-bg/95 backdrop-blur shadow-xl py-1.5">
      <p className="px-3 pb-1 text-ink-dim text-xs uppercase tracking-wider">Camadas (só para você)</p>
      {item('grade', 'Grade')}
      {item('desenhos', 'Desenhos')}
      {item('tokens', 'Tokens')}
      {isGestor && item('comoJogador', 'Ver como jogador')}
    </div>
  )
}
