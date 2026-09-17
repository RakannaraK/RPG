import { useState } from 'react'
import { useMinigames } from '../../hooks/useMinigames'
import { JOGOS, NOMES_DIFICULDADE, configDoJogo, estatisticasJogador, rankingMesa } from '../../lib/minigames/resultado'
import { novaSemente } from '../../lib/minigames/semente'
import JogoMinigame from './JogoMinigame'
import SeletorJogo from './SeletorJogo'

const fmtStat = (k, v) => (k === 'maiorSobrevivencia' ? `${String(v).replace('.', ',')} s` : k === 'menorErroMs' ? `${v} ms` : v)
const NOMES_STATS = { partidas: 'Partidas', melhor: 'Melhor', maiorCombo: 'Maior combo', maiorSobrevivencia: 'Maior sobrevivência', menorErroMs: 'Menor erro', maiorSequencia: 'Maior sequência' }

/**
 * Fase 28.4 — escolher jogo e dificuldade, jogar (resultado vai ao feed),
 * ranking da mesa e minhas estatísticas.
 */
export default function PainelMinigames({ mesaId, meuId, sessaoId = null, podeJogar = true }) {
  const { resultados, nomeDe, indisponivel, registrar } = useMinigames(mesaId)
  const [tipo, setTipo] = useState('roda')
  const [dificuldade, setDificuldade] = useState('normal')
  const [personalizada, setPersonalizada] = useState({})
  const [partida, setPartida] = useState(null) // { semente }

  const config = configDoJogo(tipo, dificuldade, personalizada[tipo])
  const ranking = rankingMesa(resultados, tipo, dificuldade)
  const minhas = estatisticasJogador(resultados, meuId)[tipo]

  function mudarParametro(chave, valor) {
    setPersonalizada(p => ({ ...p, [tipo]: { ...(p[tipo] || {}), [chave]: valor } }))
  }

  return (
    <div className="space-y-4">
      <SeletorJogo tipo={tipo} onTipo={setTipo} dificuldade={dificuldade} onDificuldade={setDificuldade} config={config} onParametro={mudarParametro} />

      {podeJogar ? (
        <button onClick={() => setPartida({ semente: novaSemente() })} className="w-full py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white font-semibold">
          🎮 Jogar {JOGOS[tipo].nome}
        </button>
      ) : (
        <p className="text-ink-dim text-sm">Espectadores assistem: o ranking aparece abaixo.</p>
      )}

      <section>
        <h3 className="text-ink-dim text-xs font-semibold uppercase tracking-wider mb-2">Ranking da mesa · {NOMES_DIFICULDADE[dificuldade]}</h3>
        {indisponivel ? (
          <p className="text-ink-dim text-sm">Ranking ainda não ativado neste banco.</p>
        ) : ranking.length === 0 ? (
          <p className="text-ink-dim text-sm">Ninguém jogou esta combinação ainda.</p>
        ) : (
          <ol className="space-y-1">
            {ranking.map(r => (
              <li key={r.id} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${r.usuario_id === meuId ? 'bg-raised' : ''}`}>
                <span className={`w-7 text-right font-bold ${r.posicao === 1 ? 'text-dice-400' : 'text-ink-dim'}`}>{r.posicao}º</span>
                <span className="flex-1 min-w-0 truncate text-ink">{nomeDe(r.usuario_id)}</span>
                <span className="tabular-nums text-ink font-semibold">{r.pontos}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {minhas && (
        <section>
          <h3 className="text-ink-dim text-xs font-semibold uppercase tracking-wider mb-2">Minhas estatísticas · {JOGOS[tipo].nome}</h3>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            {Object.entries(minhas).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-ink-dim">{NOMES_STATS[k] || k}</dt>
                <dd className="text-ink tabular-nums">{fmtStat(k, v)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {partida && (
        <JogoMinigame
          key={partida.semente}
          tipo={tipo}
          dificuldade={dificuldade}
          config={config}
          semente={partida.semente}
          onResultado={resultado => registrar({ tipo, dificuldade, resultado, sessaoId })}
          onJogarDeNovo={() => setPartida({ semente: novaSemente() })}
          onFechar={() => setPartida(null)}
        />
      )}
    </div>
  )
}
