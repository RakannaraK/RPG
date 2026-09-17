import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { JOGOS, NOMES_DIFICULDADE, resumoResultado } from '../../lib/minigames/resultado'
import JogoRodaRunica from './JogoRodaRunica'
import JogoCronometro from './JogoCronometro'
import JogoMemoria from './JogoMemoria'
import { usePreferencias } from '../../context/PreferenciasContext'
import { tocarPresetAcao } from '../../audio/actionSynth'

const COMPONENTE = { roda: JogoRodaRunica, cronometro: JogoCronometro, memoria: JogoMemoria }

const INSTRUCOES = {
  roda: 'Toque na roda (ou aperte espaço) quando o ponteiro estiver dentro da runa acesa. Acertos seguidos formam combos que multiplicam os pontos. Tocar fora ou deixar a runa passar custa uma vida.',
  cronometro: 'Pare o cronômetro o mais perto possível do tempo alvo. Ele some no meio do caminho: conte de cabeça. Botão PARAR ou espaço.',
  memoria: 'Memorize a ordem das runas antes que desapareçam e repita tocando nelas (ou nas teclas 1–9). Cada rodada tem uma runa a mais. Errou, acabou.',
}

/**
 * Fase 28.2 — tela cheia de uma partida: instruções → 3, 2, 1 → jogo → resultado.
 * `onResultado(resultado)` é chamado UMA vez ao terminar (envio ao feed/banco);
 * o estado do envio aparece na tela de resultado.
 * `onJogarDeNovo` ausente (ex.: desafio, uma tentativa só) esconde o botão.
 */
export default function JogoMinigame({ tipo, dificuldade, config, semente, titulo, onResultado, onJogarDeNovo, onFechar }) {
  const [fase, setFase] = useState('instrucoes') // instrucoes | contagem | jogando | resultado
  const [contagem, setContagem] = useState(3)
  const [resultado, setResultado] = useState(null)
  const [envio, setEnvio] = useState({ estado: 'parado', erro: '' })
  const enviouRef = useRef(false)
  const Jogo = COMPONENTE[tipo]
  const { preferencias } = usePreferencias()
  // Sons dos jogos seguem a preferência de "sons de ação"
  const onSom = preset => tocarPresetAcao(preset, { ativo: preferencias.som_acao_ativo, volume: preferencias.som_acao_volume })

  useEffect(() => {
    if (fase !== 'contagem') return
    // 3, 2, 1 a cada 0,7 s; o 'Já!' fica 0,4 s antes do jogo
    const id = setTimeout(() => (contagem <= 0 ? setFase('jogando') : setContagem(n => n - 1)), contagem <= 0 ? 400 : 700)
    return () => clearTimeout(id)
  }, [fase, contagem])

  // Esc fecha fora da partida (no meio do jogo não, para não perder sem querer)
  useEffect(() => {
    const aoTeclar = e => { if (e.key === 'Escape' && fase !== 'jogando') onFechar() }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [fase, onFechar])

  async function terminar(r) {
    setResultado(r)
    setFase('resultado')
    if (!onResultado || enviouRef.current) return
    enviouRef.current = true
    setEnvio({ estado: 'enviando', erro: '' })
    try {
      await onResultado(r)
      setEnvio({ estado: 'enviado', erro: '' })
    } catch (err) {
      setEnvio({ estado: 'erro', erro: err.message || 'Não foi possível enviar.' })
    }
  }

  const nomeJogo = `${JOGOS[tipo]?.icone || '🎮'} ${JOGOS[tipo]?.nome || tipo}`
  const BTN = 'px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors'

  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={nomeJogo}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-bg shadow-2xl p-5 sm:p-6 flex flex-col items-center gap-4 max-h-full overflow-y-auto overflow-x-hidden">
        <div className="text-center">
          <h2 className="text-ink text-xl font-bold">{nomeJogo}</h2>
          <p className="text-ink-dim text-sm">{NOMES_DIFICULDADE[dificuldade] || dificuldade}{titulo ? ` · ${titulo}` : ''}</p>
        </div>

        {fase === 'instrucoes' && (
          <>
            <p className="text-ink text-sm leading-relaxed text-center">{INSTRUCOES[tipo]}</p>
            <div className="flex gap-2">
              <button onClick={() => setFase('contagem')} className={`${BTN} bg-accent-600 hover:bg-accent-500 text-white`} autoFocus>Começar</button>
              <button onClick={onFechar} className={`${BTN} bg-hover text-ink hover:bg-border`}>Agora não</button>
            </div>
          </>
        )}

        {fase === 'contagem' && (
          <p key={contagem} className="text-dice-400 text-7xl font-bold tabular-nums py-10" aria-live="assertive">{contagem || 'Já!'}</p>
        )}

        {fase === 'jogando' && <Jogo config={config} semente={semente} onFim={terminar} onSom={onSom} />}

        {fase === 'resultado' && resultado && (
          <>
            <p className="text-dice-400 text-5xl font-bold tabular-nums">{resultado.pontos}</p>
            <p className="text-ink text-sm text-center">{resumoResultado(tipo, resultado)}</p>
            {onResultado && (
              <p className={`text-xs ${envio.estado === 'erro' ? 'text-harm' : 'text-ink-dim'}`} aria-live="polite">
                {envio.estado === 'enviando' && 'Enviando para a mesa…'}
                {envio.estado === 'enviado' && '✓ Enviado para a mesa'}
                {envio.estado === 'erro' && `Não foi enviado: ${envio.erro}`}
              </p>
            )}
            <div className="flex gap-2">
              {onJogarDeNovo && (
                <button onClick={onJogarDeNovo} className={`${BTN} bg-accent-600 hover:bg-accent-500 text-white`}>Jogar de novo</button>
              )}
              <button onClick={onFechar} className={`${BTN} bg-hover text-ink hover:bg-border`} autoFocus={!onJogarDeNovo}>Fechar</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
