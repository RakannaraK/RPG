import { useState } from 'react'
import { useMatch } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useDesafios } from '../../hooks/useDesafios'
import { registrarResultado } from '../../hooks/useMinigames'
import { useRolagem } from '../../hooks/useRolagem'
import { pendentesDoJogador, tituloDesafio } from '../../lib/minigames/desafios'
import JogoMinigame from './JogoMinigame'

/**
 * Fase 28.5 — em qualquer página de uma mesa, avisa o participante de um
 * desafio aberto que ele ainda não jogou. Montado uma vez no App.
 * "Depois" esconde o aviso só nesta visita (o desafio continua no painel).
 */
export default function OuvinteDesafios() {
  const mesaId = useMatch('/mesa/:id/*')?.params.id
  const { session } = useAuth()
  const meuId = session?.user?.id
  if (!mesaId || !meuId) return null
  return <AvisosDaMesa key={mesaId} mesaId={mesaId} meuId={meuId} />
}

function AvisosDaMesa({ mesaId, meuId }) {
  const { desafios, respondidos, marcarRespondido } = useDesafios(mesaId, meuId)
  const { registrarEvento } = useRolagem()
  const [adiados, setAdiados] = useState([])
  const [jogando, setJogando] = useState(null)

  const pendentes = pendentesDoJogador(desafios, respondidos, meuId).filter(d => !adiados.includes(d.id))

  return (
    <>
      {pendentes.length > 0 && !jogando && (
        <div className="fixed bottom-4 right-4 z-[65] w-[min(22rem,calc(100vw-2rem))] space-y-2" role="status" aria-live="polite">
          {pendentes.slice(0, 3).map(d => (
            <div key={d.id} className="rounded-xl border border-accent-500 bg-bg/95 backdrop-blur shadow-2xl p-3">
              <p className="text-dice-400 text-xs font-semibold uppercase tracking-wider">📣 Desafio para você</p>
              <p className="text-ink font-semibold">{tituloDesafio(d)}</p>
              {d.motivo && <p className="text-ink-dim text-sm">{d.motivo}</p>}
              {d.meta != null && <p className="text-ink-dim text-xs">Meta: {d.meta} pontos · uma tentativa</p>}
              <div className="flex gap-2 mt-2">
                <button onClick={() => setJogando(d)} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-accent-600 hover:bg-accent-500 text-sobre-acento">
                  Jogar agora
                </button>
                <button onClick={() => setAdiados(a => [...a, d.id])} className="px-3 py-1.5 rounded-lg text-sm bg-hover text-ink hover:bg-border">
                  Depois
                </button>
              </div>
            </div>
          ))}
        </div>
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
            await registrarResultado({ mesaId, registrarEvento, tipo: jogando.tipo, dificuldade: jogando.dificuldade, resultado, desafioId: jogando.id })
            marcarRespondido(jogando.id)
          }}
          onFechar={() => setJogando(null)}
        />
      )}
    </>
  )
}
