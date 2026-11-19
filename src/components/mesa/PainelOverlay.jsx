import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useConfirmar } from '../ui/Confirmar'
import Botao from '../ui/Botao'
import CabecalhoSecao from '../ui/CabecalhoSecao'
import { t } from '../../i18n'

const INP = 'campo !min-h-0 !py-1.5'
const PADRAO = { mostrar_vida: 'barra', mostrar_turno: true, mostrar_rolagem: false, direcao: 'horizontal', escala: 1 }

/**
 * Fase 34.2 — link secreto do overlay para o OBS. Quem gera e configura é o
 * mestre (o banco confere); regenerar invalida o link antigo na hora.
 */
export default function PainelOverlay({ mesaId }) {
  const { confirmar } = useConfirmar()
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
    catch { setErro(t('Copie o link manualmente.')) }
  }

  if (indisponivel) return null

  return (
    <div className="space-y-3">
      <CabecalhoSecao
        nivel={3}
        titulo={t('Overlay para transmissão (OBS)')}
        descricao={t('Um link secreto com os retratos e a vida do grupo, com fundo transparente — entra no OBS como “fonte de navegador”.')}
      />

      {!token ? (
        <Botao variante="primario" onClick={() => salvar(cfg, true)} disabled={!!ocupado}>
          {ocupado ? t('Gerando…') : t('Gerar link do overlay')}
        </Botao>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <input readOnly value={url} onFocus={e => e.target.select()} className={`${INP} flex-1 min-w-[16rem] font-mono text-xs`} aria-label={t('Link do overlay')} />
            <Botao variante="secundario" onClick={copiar}>{copiado ? t('✓ Copiado') : t('Copiar')}</Botao>
            <a href={url} target="_blank" rel="noreferrer" className="botao inline-flex items-center justify-center rounded-lg font-medium px-3 py-2 text-sm min-h-[36px] bg-raised border border-border text-ink hover:border-accent-500">{t('Abrir prévia ↗')}</a>
            <Botao
              variante="contorno"
              onClick={async () => { if (await confirmar({ titulo: t('Gerar link novo?'), mensagem: t('O link antigo para de funcionar na hora. Quem usa no OBS precisa trocar.'), confirmar: t('Gerar link novo') })) salvar(cfg, true) }}
            >{t('Trocar link')}</Botao>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <label className="text-ink-dim text-xs flex items-center gap-1.5">
              {t('Vida')}
              <select value={cfg.mostrar_vida} onChange={e => mudar({ mostrar_vida: e.target.value })} className={INP}>
                <option value="barra">{t('só barra')}</option>
                <option value="numeros">{t('barra e números')}</option>
                <option value="nada">{t('não mostrar')}</option>
              </select>
            </label>
            <label className="text-ink-dim text-xs flex items-center gap-1.5">
              {t('Sentido')}
              <select value={cfg.direcao} onChange={e => mudar({ direcao: e.target.value })} className={INP}>
                <option value="horizontal">{t('deitado')}</option>
                <option value="vertical">{t('em pé')}</option>
              </select>
            </label>
            <label className="text-ink-dim text-xs flex items-center gap-1.5">
              {t('Tamanho')}
              <input type="number" min="0.5" max="3" step="0.1" value={cfg.escala} onChange={e => mudar({ escala: Number(e.target.value) || 1 })} className={`${INP} w-20`} />
            </label>
            <label className="text-ink-dim text-xs flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={!!cfg.mostrar_turno} onChange={e => mudar({ mostrar_turno: e.target.checked })} className="accent-accent-500" />
              {t('mostrar turno')}
            </label>
            <label className="text-ink-dim text-xs flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={!!cfg.mostrar_rolagem} onChange={e => mudar({ mostrar_rolagem: e.target.checked })} className="accent-accent-500" />
              {t('mostrar última rolagem')}
            </label>
          </div>
          <p className="text-ink-dim text-xs">
            {t('Ficha privada nunca aparece no overlay; notas, chat e eventos secretos também não.')}
          </p>
        </>
      )}
      {erro && <p className="text-harm text-xs" role="alert">{erro}</p>}
    </div>
  )
}
