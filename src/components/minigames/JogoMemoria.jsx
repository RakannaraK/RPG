import { useEffect, useRef, useState } from 'react'
import { comecarResposta, iniciarMemoria, responderMemoria, resultadoMemoria, tempoExibir } from '../../lib/minigames/memoria'

const PAUSA_ERRO_MS = 1100

/**
 * Fase 28.2 — Memória jogável. Teclas 1–9 escolhem as runas da grade na ordem
 * de leitura (além de mouse/toque). Ao errar, mostra a certa antes de acabar.
 */
export default function JogoMemoria({ config, semente, onFim, onSom }) {
  const [e, setE] = useState(() => iniciarMemoria(config, semente))
  const [avisoRodada, setAvisoRodada] = useState(0) // rodada em que o aviso de sumir já apareceu
  const onFimRef = useRef(onFim)
  useEffect(() => { onFimRef.current = onFim }, [onFim])

  // Tempo de memorizar da rodada; aviso no último segundo
  useEffect(() => {
    if (e.fase !== 'memorizar') return
    const ms = tempoExibir(e) * 1000
    const rodada = e.rodada
    const aviso = setTimeout(() => setAvisoRodada(rodada), Math.max(0, ms - 1000))
    const fim = setTimeout(() => setE(x => comecarResposta(x)), ms)
    return () => { clearTimeout(aviso); clearTimeout(fim) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e.fase, e.rodada])

  // Som ao completar uma rodada (a rodada sobe) e ao errar
  const rodadaAnterior = useRef(e.rodada)
  useEffect(() => {
    if (e.rodada > rodadaAnterior.current) onSom?.('arcano')
    rodadaAnterior.current = e.rodada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e.rodada])

  useEffect(() => {
    if (e.fase !== 'fim') return
    onSom?.('falha')
    const id = setTimeout(() => onFimRef.current(resultadoMemoria(e)), PAUSA_ERRO_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e.fase])

  useEffect(() => {
    const aoTeclar = ev => {
      const n = Number(ev.key)
      if (!(n >= 1 && n <= 9)) return
      setE(x => (x.fase === 'responder' && x.grade[n - 1] ? responderMemoria(x, x.grade[n - 1]) : x))
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  const erro = e.fase === 'fim' ? e.ultimo : null
  const quaseSumindo = e.fase === 'memorizar' && avisoRodada === e.rodada

  return (
    <div className="flex flex-col items-center gap-4 select-none w-full">
      <p className="text-ink-dim text-sm">Rodada {e.rodada} · {e.sequencia.length} runas · {e.acertos} pts</p>

      {e.fase === 'memorizar' ? (
        <>
          <p className={`text-sm font-semibold ${quaseSumindo ? 'text-harm animate-pulse' : 'text-dice-400'}`}>
            {quaseSumindo ? 'Desaparecendo em breve…' : 'Memorize a ordem!'}
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-md">
            {e.sequencia.map((runa, i) => (
              <div key={i} className="relative w-14 h-14 rounded-xl bg-raised border border-accent-500 flex items-center justify-center">
                <span className="text-3xl text-ink">{runa}</span>
                <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-accent-600 text-xs text-white flex items-center justify-center">{i + 1}</span>
              </div>
            ))}
          </div>
          <div className="w-full max-w-xs h-1.5 rounded-full bg-hover overflow-hidden">
            <div
              key={e.rodada}
              className="h-full bg-dice-400"
              style={{ animation: `memoria-tempo ${tempoExibir(e)}s linear forwards` }}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-1.5" aria-label={`${e.posicao} de ${e.sequencia.length}`}>
            {e.sequencia.map((_, i) => (
              <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < e.posicao ? 'bg-ok' : erro && i === e.posicao ? 'bg-harm' : 'bg-hover'}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {e.grade.map((runa, i) => {
              const certa = erro && runa === erro.esperado
              const errada = erro && runa === erro.recebido
              return (
                <button
                  key={runa}
                  type="button"
                  disabled={e.fase !== 'responder'}
                  onPointerDown={ev => { ev.preventDefault(); setE(x => responderMemoria(x, runa)) }}
                  className={`relative w-16 h-16 rounded-xl border text-3xl transition-colors touch-none ${
                    certa ? 'bg-emerald-900/60 border-ok text-ok' : errada ? 'bg-red-900/60 border-harm text-harm' : 'bg-raised border-border text-ink hover:border-accent-500'
                  }`}
                >
                  {runa}
                  {i < 9 && <span className="absolute bottom-0.5 right-1.5 text-xs text-ink-dim">{i + 1}</span>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
