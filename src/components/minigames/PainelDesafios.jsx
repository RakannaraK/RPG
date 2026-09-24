import { useState } from 'react'
import { useDesafios } from '../../hooks/useDesafios'
import { useMinigames } from '../../hooks/useMinigames'
import { configDoJogo } from '../../lib/minigames/resultado'
import { situacaoDesafio, tituloDesafio } from '../../lib/minigames/desafios'
import SeletorJogo from './SeletorJogo'
import JogoMinigame from './JogoMinigame'

const BTN = 'px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
const INP = 'w-full bg-void border border-border rounded-lg px-2.5 py-1.5 text-sm text-ink'

/**
 * Fase 28.5 — desafios da mesa. Gestor lança (jogo, dificuldade, participantes,
 * meta, motivo), acompanha ao vivo e encerra publicando a classificação.
 * Participantes jogam daqui ou pelo aviso que aparece em qualquer página.
 */
export default function PainelDesafios({ mesaId, meuId, isGestor, podeJogar = true, sessaoId = null }) {
  const { desafios, respondidos, indisponivel, criar, encerrar, cancelar, marcarRespondido } = useDesafios(mesaId, meuId)
  const { resultados, membros, nomeDe, registrar } = useMinigames(mesaId)
  const [jogando, setJogando] = useState(null)
  const [erro, setErro] = useState('')

  if (indisponivel) return <p className="text-ink-dim text-sm">Desafios ainda não ativados neste banco.</p>

  const abertos = desafios.filter(d => d.status === 'aberto')
  const encerrados = desafios.filter(d => d.status === 'encerrado').slice(0, 5)

  async function tentar(fn) {
    setErro('')
    try { await fn() } catch (err) { setErro(err.message || 'Falhou.') }
  }

  return (
    <div className="space-y-4">
      {isGestor && (
        <NovoDesafio
          membros={membros}
          meuId={meuId}
          onCriar={dados => criar({ ...dados, nomeDe, sessaoId })}
        />
      )}

      {abertos.length === 0 ? (
        <p className="text-ink-dim text-sm">Nenhum desafio aberto.</p>
      ) : (
        <ul className="space-y-3">
          {abertos.map(d => (
            <CartaoDesafio
              key={d.id}
              desafio={d}
              situacao={situacaoDesafio(d, resultados, nomeDe)}
              nomeDe={nomeDe}
              isGestor={isGestor}
              possoJogar={podeJogar && d.participantes.includes(meuId) && !respondidos.includes(d.id)}
              onJogar={() => setJogando(d)}
              onEncerrar={situacao => tentar(() => encerrar(d, situacao, nomeDe, sessaoId))}
              onCancelar={() => tentar(() => cancelar(d))}
            />
          ))}
        </ul>
      )}
      {erro && <p className="text-harm text-sm">{erro}</p>}

      {encerrados.length > 0 && (
        <details>
          <summary className="cursor-pointer text-ink-dim text-xs font-semibold uppercase tracking-wider">Encerrados recentes</summary>
          <ul className="mt-2 space-y-1.5">
            {encerrados.map(d => {
              const s = situacaoDesafio(d, resultados, nomeDe)
              return (
                <li key={d.id} className="text-sm">
                  <span className="text-ink">{tituloDesafio(d)}</span>
                  {d.motivo && <span className="text-ink-dim"> · {d.motivo}</span>}
                  <span className="block text-ink-dim text-xs">
                    {s.classificados.length ? s.classificados.map(r => `${r.posicao}º ${r.nome} ${r.pontos}`).join(' · ') : 'ninguém jogou'}
                  </span>
                </li>
              )
            })}
          </ul>
        </details>
      )}

      {jogando && (
        <JogoMinigame
          key={jogando.id}
          tipo={jogando.tipo}
          dificuldade={jogando.dificuldade}
          config={jogando.config}
          semente={jogando.semente}
          titulo={jogando.motivo || 'Desafio'}
          onResultado={async resultado => {
            await registrar({ tipo: jogando.tipo, dificuldade: jogando.dificuldade, resultado, desafioId: jogando.id, sessaoId })
            marcarRespondido(jogando.id)
          }}
          onFechar={() => setJogando(null)}
        />
      )}
    </div>
  )
}

function NovoDesafio({ membros, meuId, onCriar }) {
  const podemJogar = membros.filter(m => m.role !== 'espectador')
  const [tipo, setTipo] = useState('roda')
  const [dificuldade, setDificuldade] = useState('normal')
  const [personalizada, setPersonalizada] = useState({})
  const [escolhidos, setEscolhidos] = useState(null) // null = padrão (todos menos eu)
  const [meta, setMeta] = useState('')
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  const config = configDoJogo(tipo, dificuldade, personalizada[tipo])
  const participantes = escolhidos ?? podemJogar.filter(m => m.usuario_id !== meuId).map(m => m.usuario_id)

  function alternar(id) {
    setEscolhidos(participantes.includes(id) ? participantes.filter(x => x !== id) : [...participantes, id])
  }

  async function lancar() {
    setOcupado(true)
    setErro('')
    try {
      await onCriar({ tipo, dificuldade, config, participantes, meta: meta === '' ? null : Math.max(0, Number(meta) || 0), motivo })
      setMotivo('')
      setMeta('')
    } catch (err) {
      setErro(err.message || 'Não foi possível lançar.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <details className="rounded-xl border border-border bg-void">
      <summary className="cursor-pointer px-3 py-2 text-ink text-sm font-semibold">📣 Lançar desafio</summary>
      <div className="p-3 pt-1 space-y-3">
        <input className={INP} placeholder="Motivo (ex: quem alcança a corda primeiro?)" value={motivo} onChange={e => setMotivo(e.target.value)} />
        <SeletorJogo
          tipo={tipo} onTipo={setTipo}
          dificuldade={dificuldade} onDificuldade={setDificuldade}
          config={config}
          onParametro={(chave, valor) => setPersonalizada(p => ({ ...p, [tipo]: { ...(p[tipo] || {}), [chave]: valor } }))}
        />
        <fieldset>
          <legend className="text-ink-dim text-xs mb-1">Participantes ({participantes.length})</legend>
          <div className="flex flex-wrap gap-1.5">
            {podemJogar.map(m => (
              <label key={m.usuario_id} className={`${BTN} cursor-pointer ${participantes.includes(m.usuario_id) ? 'bg-accent-700 text-white' : 'bg-hover text-ink'}`}>
                <input type="checkbox" className="sr-only" checked={participantes.includes(m.usuario_id)} onChange={() => alternar(m.usuario_id)} />
                {m.nome}{m.usuario_id === meuId ? ' (você)' : ''}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="text-ink-dim text-xs">Meta de pontos (opcional)</span>
          <input type="number" min="0" className={INP} value={meta} onChange={e => setMeta(e.target.value)} placeholder="sem meta" />
        </label>
        <button onClick={lancar} disabled={ocupado || participantes.length === 0} className={`${BTN} w-full bg-accent-600 hover:bg-accent-500 text-white font-semibold`}>
          {ocupado ? 'Lançando…' : `Lançar para ${participantes.length} ${participantes.length === 1 ? 'pessoa' : 'pessoas'}`}
        </button>
        {erro && <p className="text-harm text-sm">{erro}</p>}
      </div>
    </details>
  )
}

function CartaoDesafio({ desafio, situacao, nomeDe, isGestor, possoJogar, onJogar, onEncerrar, onCancelar }) {
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  return (
    <li className="rounded-xl border border-accent-700 bg-raised p-3 space-y-2">
      <div>
        <p className="text-ink font-semibold">{tituloDesafio(desafio)}</p>
        {desafio.motivo && <p className="text-ink-dim text-sm">{desafio.motivo}</p>}
        {desafio.meta != null && <p className="text-dice-400 text-xs">Meta: {desafio.meta} pontos</p>}
      </div>
      <ol className="space-y-1">
        {situacao.classificados.map(r => (
          <li key={r.usuario_id} className="flex items-center gap-2 text-sm">
            <span className="w-7 text-right font-bold text-ink-dim">{r.posicao}º</span>
            <span className="flex-1 min-w-0 truncate text-ink">{r.nome}</span>
            <span className="tabular-nums text-ink">{r.pontos}</span>
            {r.bateuMeta != null && <span className={r.bateuMeta ? 'text-ok' : 'text-harm'}>{r.bateuMeta ? '✓' : '✗'}</span>}
          </li>
        ))}
        {situacao.faltam.map(id => (
          <li key={id} className="flex items-center gap-2 text-sm text-ink-dim">
            <span className="w-7 text-right">⏳</span>
            <span className="flex-1 min-w-0 truncate">{nomeDe(id)}</span>
            <span className="text-xs">aguardando</span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-1.5">
        {possoJogar && (
          <button onClick={onJogar} className={`${BTN} bg-accent-600 hover:bg-accent-500 text-white font-semibold`}>🎮 Jogar agora</button>
        )}
        {isGestor && (
          <button onClick={() => onEncerrar(situacao)} className={`${BTN} bg-hover text-ink hover:bg-border`}>
            {situacao.completo ? 'Encerrar e publicar' : 'Encerrar assim mesmo'}
          </button>
        )}
        {isGestor && (confirmarCancelar ? (
          <>
            <button onClick={onCancelar} className={`${BTN} bg-red-700 hover:bg-red-600 text-white`}>Cancelar desafio</button>
            <button onClick={() => setConfirmarCancelar(false)} className={`${BTN} bg-hover text-ink`}>Não</button>
          </>
        ) : (
          <button onClick={() => setConfirmarCancelar(true)} className={`${BTN} text-ink-dim hover:text-harm`} title="Apaga o desafio e as respostas">✕</button>
        ))}
      </div>
    </li>
  )
}
