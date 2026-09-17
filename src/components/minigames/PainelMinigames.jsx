import { useState } from 'react'
import { useMinigames } from '../../hooks/useMinigames'
import { JOGOS, NOMES_DIFICULDADE, configDoJogo, estatisticasJogador, rankingMesa } from '../../lib/minigames/resultado'
import { novaSemente } from '../../lib/minigames/semente'
import JogoMinigame from './JogoMinigame'

const DIFICULDADES = ['normal', 'dificil', 'impossivel', 'personalizada']

// Parâmetros editáveis na dificuldade Personalizada (sem teto: só o mínimo que faz sentido)
const PARAMETROS = {
  roda: [
    ['vidas', 'Vidas', 1, 1], ['velocidade', 'Velocidade (°/s)', 10, 5], ['aceleracao', 'Acelera por acerto', 0, 1],
    ['largura', 'Largura da runa (°)', 2, 1], ['larguraMin', 'Largura mínima (°)', 1, 1], ['encolhe', 'Encolhe por acerto (°)', 0, 0.5],
    ['inverte', 'Inverte o giro a cada acerto', null],
  ],
  cronometro: [
    ['alvoMin', 'Alvo mínimo (s)', 0.5, 0.5], ['alvoMax', 'Alvo máximo (s)', 0.5, 0.5], ['ocultarFracao', 'Some depois de (fração do alvo, 0–1)', 0, 0.05],
  ],
  memoria: [
    ['tamanhoInicial', 'Runas na 1ª rodada', 1, 1], ['opcoes', 'Runas na grade (2–24)', 2, 1], ['exibir', 'Tempo para memorizar (s)', 0.2, 0.1],
    ['repete', 'Sequência pode repetir runas', null],
  ],
}

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

  const BTN = 'px-3 py-1.5 rounded-lg text-sm transition-colors'
  const ativo = on => (on ? 'bg-accent-600 text-white' : 'bg-hover text-ink hover:bg-border')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(JOGOS).map(([id, jogo]) => (
          <button
            key={id}
            onClick={() => setTipo(id)}
            aria-pressed={tipo === id}
            className={`rounded-xl border px-2 py-3 text-center transition-colors ${tipo === id ? 'border-accent-500 bg-raised' : 'border-border bg-void hover:bg-hover'}`}
          >
            <span className="block text-2xl">{jogo.icone}</span>
            <span className="block text-ink text-xs font-semibold mt-1">{jogo.nome}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {DIFICULDADES.map(d => (
          <button key={d} onClick={() => setDificuldade(d)} aria-pressed={dificuldade === d} className={`${BTN} ${ativo(dificuldade === d)}`}>
            {NOMES_DIFICULDADE[d]}
          </button>
        ))}
      </div>

      {dificuldade === 'personalizada' && (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-void p-3">
          {PARAMETROS[tipo].map(([chave, rotulo, minimo, passo]) => (
            minimo === null ? (
              <label key={chave} className="col-span-2 flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={!!config[chave]} onChange={e => mudarParametro(chave, e.target.checked)} />
                {rotulo}
              </label>
            ) : (
              <label key={chave} className="block">
                <span className="text-ink-dim text-xs">{rotulo}</span>
                <input
                  type="number"
                  min={minimo}
                  step={passo}
                  value={config[chave]}
                  onChange={e => mudarParametro(chave, Math.max(minimo, Number(e.target.value) || minimo))}
                  className="w-full bg-bg border border-border rounded-lg px-2 py-1 text-sm text-ink"
                />
              </label>
            )
          ))}
        </div>
      )}

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
