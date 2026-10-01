import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotificacoes } from '../../hooks/useNotificacoes'
import { useFechaFora } from '../../hooks/useFechaFora'
import { agruparPorDia, iconeDaNotificacao, quandoFoi } from '../../lib/notificacoes'
import Icone from '../ui/Icone'
import Ilustra from '../arte/Ilustra'

/**
 * Fase 16.7 → 52 — sininho de notificações. Contador de não lidas (pulsa UMA
 * vez quando chega aviso novo), painel com os avisos separados por dia,
 * ícone por tipo e marca de "novo". Clicar abre o link e marca como lida.
 *
 * O painel se ancora no cabeçalho (`relative` de quem usa), não no botão:
 * assim ele cabe na tela do celular, onde o sino não fica na ponta.
 */
export default function Sininho() {
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const painel = useRef(null)
  const botao = useRef(null)
  const { notificacoes, naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes()
  useFechaFora(painel, aberto, () => setAberto(false), botao)

  // pulso só quando o número SOBE (aviso novo), não ao carregar nem ao ler
  const [visto, setVisto] = useState(naoLidas)
  const [pulso, setPulso] = useState(0)
  if (naoLidas !== visto) {
    if (naoLidas > visto && visto !== 0) setPulso(p => p + 1)
    setVisto(naoLidas)
  }

  function abrir(n) {
    marcarLida(n.id)
    setAberto(false)
    if (n.link) navigate(n.link)
  }

  const grupos = agruparPorDia(notificacoes)
  const rotulo = naoLidas > 0 ? `Notificações: ${naoLidas} não lida${naoLidas > 1 ? 's' : ''}` : 'Notificações'

  return (
    <>
      <button
        ref={botao}
        onClick={() => setAberto(a => !a)}
        aria-label={rotulo} aria-expanded={aberto} aria-haspopup="dialog" data-dica="Notificações"
        className="botao-icone relative"
      >
        <Icone nome="sino" tamanho={20} />
        {naoLidas > 0 && (
          <span key={pulso} className={`contador absolute -top-0.5 -right-0.5 !min-w-[1.1rem] !h-[1.1rem] !text-[0.6875rem] ring-2 ring-bg ${pulso ? 'pulso-uma-vez' : ''}`} aria-hidden="true">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div
          ref={painel}
          role="dialog" aria-label="Notificações"
          className="pop-entra absolute right-3 sm:right-6 top-full mt-1 w-[min(24rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-raised shadow-nivel-3 z-menu overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/70">
            <p className="text-ink font-semibold">
              Notificações
              {naoLidas > 0 && <span className="ml-2 text-ink-dim text-sm font-normal">{naoLidas} nova{naoLidas > 1 ? 's' : ''}</span>}
            </p>
            {naoLidas > 0 && (
              <button onClick={marcarTodasLidas} className="text-accent-300 hover:text-ink text-sm transition-colors duration-rapida">
                Marcar todas como lidas
              </button>
            )}
          </div>

          {notificacoes.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Ilustra nome="sino" tamanho={56} className="mx-auto mb-3 opacity-80" />
              <p className="text-ink font-medium">Tudo em dia</p>
              <p className="text-ink-dim text-sm mt-1">Sessões que começam, convites e mudanças de papel aparecem aqui.</p>
            </div>
          ) : (
            <div className="max-h-[min(28rem,70vh)] overflow-y-auto overscroll-contain">
              {grupos.map(g => (
                <section key={g.rotulo}>
                  <h3 className="sticky top-0 z-10 bg-raised/95 backdrop-blur px-4 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-dim">{g.rotulo}</h3>
                  <ul>
                    {g.itens.map(n => (
                      <li key={n.id} className="group relative">
                        <button
                          onClick={() => abrir(n)}
                          className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors duration-rapida hover:bg-hover/70 ${n.lida ? '' : 'bg-accent-800/15'}`}
                        >
                          <span className={`mt-0.5 w-8 h-8 shrink-0 rounded-full inline-flex items-center justify-center ${n.lida ? 'bg-hover text-ink-dim' : 'bg-accent-700/30 text-accent-300'}`}>
                            <Icone nome={iconeDaNotificacao(n.tipo)} tamanho={16} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className={`block text-sm ${n.lida ? 'text-ink-dim' : 'text-ink font-medium'}`}>{n.titulo}</span>
                            {n.corpo && <span className="block text-ink-dim text-sm mt-0.5 line-clamp-2">{n.corpo}</span>}
                            <span className="block text-ink-dim text-xs mt-1 tabular-nums">{quandoFoi(n.created_at)}</span>
                          </span>
                          {!n.lida && <span className="mt-2 w-2 h-2 rounded-full bg-accent-400 shrink-0" aria-label="nova" />}
                        </button>
                        {!n.lida && (
                          <button
                            onClick={() => marcarLida(n.id)}
                            aria-label={`Marcar "${n.titulo}" como lida`} data-dica="Marcar como lida"
                            className="botao-icone !min-w-[32px] !min-h-[32px] absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                          ><Icone nome="check" tamanho={16} /></button>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
