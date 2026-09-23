import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { faixasDaBarra, textoVida } from '../lib/barraVida'

const INTERVALO = 3000 // ms — o overlay não usa Realtime (é anônimo); pergunta de novo

const COR_NIVEL = { cheia: '#22c55e', media: '#eab308', baixa: '#ef4444', vazia: '#ef4444' }

/** Barra de vida com pedaço de escudo (vida temporária, F12). */
function BarraVida({ atual, maximo, temp, numeros }) {
  const { pct, pctTemp, nivel } = faixasDaBarra({ atual, maximo, temp })
  return (
    <div className="w-full">
      <div className="h-2.5 w-full rounded-full bg-black/60 overflow-hidden flex" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,.25)' }}>
        <div style={{ width: `${pct}%`, background: COR_NIVEL[nivel] }} />
        {pctTemp > 0 && <div style={{ width: `${pctTemp}%`, background: '#38bdf8' }} title="escudo" />}
      </div>
      {numeros && (
        <p className="text-xs text-white/90 text-center mt-0.5 tabular-nums" style={{ textShadow: '0 1px 2px #000' }}>
          {textoVida({ atual, maximo, temp })}
        </p>
      )}
    </div>
  )
}

/**
 * Fase 34.2 — painel para transmissão (OBS): página SEM login, fundo
 * transparente, que só existe com o token secreto. Mostra o que o mestre
 * liberou; ficha privada nunca entra (a função do banco já filtra).
 */
export default function OverlayPage() {
  const { token } = useParams()
  const [dados, setDados] = useState(undefined) // undefined = carregando; null = link inválido
  const [erro, setErro] = useState('')

  useEffect(() => {
    // Fundo transparente de verdade: o OBS usa o que estiver por baixo
    const html = document.documentElement
    const anterior = { body: document.body.style.background, html: html.style.background }
    document.body.style.background = 'transparent'
    html.style.background = 'transparent'
    // F37 — desliga a camada de arte (grão, brasa e vinheta): no OBS o que
    // vale é o que está por baixo, e textura nenhuma pode aparecer.
    html.dataset.semArte = '1'
    return () => {
      document.body.style.background = anterior.body
      html.style.background = anterior.html
      delete html.dataset.semArte
    }
  }, [])

  useEffect(() => {
    let vivo = true
    async function buscar() {
      const { data, error } = await supabase.rpc('overlay_dados', { p_token: token })
      if (!vivo) return
      if (error) { setErro('Overlay ainda não ativado neste banco (sql/fase34_overlay.sql).'); return }
      setErro('')
      setDados(data ?? null)
    }
    buscar()
    const id = setInterval(buscar, INTERVALO)
    return () => { vivo = false; clearInterval(id) }
  }, [token])

  if (erro) return <p className="p-4 text-red-300 text-sm">{erro}</p>
  if (dados === undefined) return null
  if (dados === null) {
    return <p className="p-4 text-white/70 text-sm" style={{ textShadow: '0 1px 2px #000' }}>Link do overlay inválido.</p>
  }

  const cfg = dados.config || {}
  const vida = cfg.mostrar_vida || 'barra'
  const escala = Number(cfg.escala) || 1
  const vertical = cfg.direcao === 'vertical'
  const personagens = dados.personagens || []

  return (
    <div className="p-3" style={{ fontSize: `${escala}rem` }}>
      {dados.turno && (
        <div className="mb-2 inline-block rounded-xl bg-black/55 px-3 py-1.5" style={{ backdropFilter: 'blur(2px)' }}>
          <span className="text-amber-300 text-sm font-bold">⚔ Rodada {dados.turno.rodada}</span>
          {dados.turno.de && <span className="text-white text-sm"> · vez de <b>{dados.turno.de}</b></span>}
        </div>
      )}

      <div className={`flex ${vertical ? 'flex-col' : 'flex-row flex-wrap'} gap-2`}>
        {personagens.map(p => (
          <div key={p.id} className="flex items-center gap-2 rounded-xl bg-black/55 px-2.5 py-2 min-w-[11rem]" style={{ backdropFilter: 'blur(2px)' }}>
            {p.imagem
              ? <img src={p.imagem} alt="" className="w-10 h-10 rounded-full object-cover border border-white/30 shrink-0" />
              : <div className="w-10 h-10 rounded-full bg-white/10 border border-white/30 shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-semibold truncate" style={{ textShadow: '0 1px 2px #000' }}>{p.nome}</p>
              {vida !== 'nada' && <BarraVida atual={p.hp_atual} maximo={p.hp_maximo} temp={p.vida_temp} numeros={vida === 'numeros'} />}
            </div>
          </div>
        ))}
      </div>

      {dados.rolagem && (
        <div className="mt-2 inline-block rounded-xl bg-black/55 px-3 py-1.5" style={{ backdropFilter: 'blur(2px)' }}>
          <span className="text-white/80 text-xs">{dados.rolagem.autor}{dados.rolagem.rotulo ? ` · ${dados.rolagem.rotulo}` : ''}</span>
          <span className="text-amber-300 text-lg font-bold ml-2 tabular-nums">{dados.rolagem.total}</span>
          {dados.rolagem.notacao && <span className="text-white/50 text-xs ml-1">{dados.rolagem.notacao}</span>}
        </div>
      )}
    </div>
  )
}
