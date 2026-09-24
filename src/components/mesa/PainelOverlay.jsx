import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const INP = 'px-2 py-1.5 rounded-lg bg-void border border-border text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500'
const BTN = 'px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50'
const PADRAO = { mostrar_vida: 'barra', mostrar_turno: true, mostrar_rolagem: false, direcao: 'horizontal', escala: 1 }

/**
 * Fase 34.2 — link secreto do overlay para o OBS. Quem gera e configura é o
 * mestre (o banco confere); regenerar invalida o link antigo na hora.
 */
export default function PainelOverlay({ mesaId }) {
  const [token, setToken] = useState(null)
  const [cfg, setCfg] = useState(PADRAO)
  const [indisponivel, setIndisponivel] = useState(false)
  const [ocupado, setOcupado] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let vivo = true
    supabase.from('mesas').select('overlay_token, overlay_config').eq('id', mesaId).maybeSingle()
      .then(({ data, error }) => {
        if (!vivo) return
        if (error) { setIndisponivel(true); return }
        setToken(data?.overlay_token || null)
        setCfg({ ...PADRAO, ...(data?.overlay_config || {}) })
      })
    return () => { vivo = false }
  }, [mesaId])

  const url = token ? `${window.location.origin}/overlay/${token}` : ''

  async function salvar(novaCfg, novoToken = false) {
    setOcupado('salvar'); setErro('')
    try {
      const { data, error } = await supabase.rpc('definir_overlay', {
        p_mesa_id: mesaId, p_config: novaCfg, p_novo_token: novoToken,
      })
      if (error) throw new Error(error.message)
      setToken(data)
      setCfg(novaCfg)
    } catch (e) { setErro(e.message) } finally { setOcupado('') }
  }

  const mudar = patch => salvar({ ...cfg, ...patch })

  async function copiar() {
    try { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }
    catch { setErro('Copie o link manualmente.') }
  }

  if (indisponivel) return null

  return (
    <div className="space-y-2">
      <div>
        <p className="text-purple-200 font-medium text-sm">Overlay para transmissão (OBS)</p>
        <p className="text-accent-300 text-xs mt-0.5">
          Um link secreto com os retratos e a vida do grupo, com fundo transparente — entra no OBS como “fonte de navegador”.
        </p>
      </div>

      {!token ? (
        <button type="button" onClick={() => salvar(cfg, true)} disabled={!!ocupado} className={`${BTN} bg-purple-700 hover:bg-purple-600 text-sobre-acento`}>
          {ocupado ? 'Gerando…' : 'Gerar link do overlay'}
        </button>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <input readOnly value={url} onFocus={e => e.target.select()} className={`${INP} flex-1 min-w-[16rem] font-mono text-xs`} aria-label="Link do overlay" />
            <button type="button" onClick={copiar} className={`${BTN} bg-slate-700 hover:bg-slate-600 text-white`}>{copiado ? '✓ Copiado' : 'Copiar'}</button>
            <a href={url} target="_blank" rel="noreferrer" className={`${BTN} bg-slate-700 hover:bg-slate-600 text-white`}>Abrir prévia ↗</a>
            <button
              type="button"
              onClick={() => { if (window.confirm('Gerar um link novo? O link antigo para de funcionar na hora.')) salvar(cfg, true) }}
              className={`${BTN} text-purple-300 hover:text-white border border-purple-800`}
            >Trocar link</button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <label className="text-purple-400 text-xs flex items-center gap-1.5">
              Vida
              <select value={cfg.mostrar_vida} onChange={e => mudar({ mostrar_vida: e.target.value })} className={INP}>
                <option value="barra">só barra</option>
                <option value="numeros">barra e números</option>
                <option value="nada">não mostrar</option>
              </select>
            </label>
            <label className="text-purple-400 text-xs flex items-center gap-1.5">
              Sentido
              <select value={cfg.direcao} onChange={e => mudar({ direcao: e.target.value })} className={INP}>
                <option value="horizontal">deitado</option>
                <option value="vertical">em pé</option>
              </select>
            </label>
            <label className="text-purple-400 text-xs flex items-center gap-1.5">
              Tamanho
              <input type="number" min="0.5" max="3" step="0.1" value={cfg.escala} onChange={e => mudar({ escala: Number(e.target.value) || 1 })} className={`${INP} w-20`} />
            </label>
            <label className="text-purple-400 text-xs flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={!!cfg.mostrar_turno} onChange={e => mudar({ mostrar_turno: e.target.checked })} className="accent-purple-500" />
              mostrar turno
            </label>
            <label className="text-purple-400 text-xs flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={!!cfg.mostrar_rolagem} onChange={e => mudar({ mostrar_rolagem: e.target.checked })} className="accent-purple-500" />
              mostrar última rolagem
            </label>
          </div>
          <p className="text-accent-300 text-xs">
            Ficha privada nunca aparece no overlay; notas, chat e eventos secretos também não.
          </p>
        </>
      )}
      {erro && <p className="text-red-400 text-xs">{erro}</p>}
    </div>
  )
}
