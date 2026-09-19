import { useState } from 'react'
import { PRESET_IDS } from '../../engines/actionSoundEngine'
import { tocarPresetAcao } from '../../audio/actionSynth'
import { usePreferencias } from '../../context/PreferenciasContext'

const INP = 'px-2 py-1.5 rounded-lg bg-void border border-border text-ink text-sm placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent-500'

/**
 * Fase 31.1 — o que uma criatura tem além da ficha: espécie, ameaça e o som de
 * quando ela aparece. Salva ao sair do campo.
 */
export default function BlocoCriatura({ ficha, isDono, onSalvar }) {
  const { preferencias } = usePreferencias()
  const [especie, setEspecie] = useState(ficha.especie || '')
  const [ameaca, setAmeaca] = useState(ficha.ameaca || '')
  const [estado, setEstado] = useState('')

  async function salvar(patch) {
    setEstado('Salvando…')
    try { await onSalvar(patch); setEstado('✓ Salvo') } catch (e) { setEstado(e.message || 'Não salvou.') }
  }

  const ouvir = preset => tocarPresetAcao(preset, { ativo: preferencias.som_acao_ativo, volume: preferencias.som_acao_volume })

  if (!isDono) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-dice-400 font-semibold">🐾 Criatura</span>
        {ficha.especie && <span className="text-ink-dim">{ficha.especie}</span>}
        {ficha.ameaca && <span className="px-2 py-0.5 rounded-full bg-raised text-ink text-xs">{ficha.ameaca}</span>}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-raised/40 p-3 flex flex-wrap items-end gap-2">
      <span className="text-dice-400 font-semibold text-sm mr-1">🐾 Criatura</span>
      <label className="text-ink-dim text-xs space-y-1">Espécie
        <input value={especie} onChange={e => setEspecie(e.target.value)} onBlur={() => especie !== (ficha.especie || '') && salvar({ especie: especie.trim() || null })}
          maxLength={60} placeholder="Fera, Morto-vivo…" className={`${INP} w-40 block`} />
      </label>
      <label className="text-ink-dim text-xs space-y-1">Ameaça
        <input value={ameaca} onChange={e => setAmeaca(e.target.value)} onBlur={() => ameaca !== (ficha.ameaca || '') && salvar({ ameaca: ameaca.trim() || null })}
          maxLength={40} placeholder="Normal, ND 5…" className={`${INP} w-32 block`} />
      </label>
      <label className="text-ink-dim text-xs space-y-1">Som ao aparecer
        <select value={ficha.som_preset || ''} onChange={e => { salvar({ som_preset: e.target.value || null }); if (e.target.value) ouvir(e.target.value) }} className={`${INP} w-36 block`}>
          <option value="">Nenhum</option>
          {PRESET_IDS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      {ficha.som_preset && (
        <button type="button" onClick={() => ouvir(ficha.som_preset)} className="px-2 py-1.5 rounded-lg bg-hover text-ink text-sm hover:bg-border" title="Ouvir">🔊</button>
      )}
      <span className="text-ink-dim text-xs ml-auto" aria-live="polite">{estado}</span>
    </div>
  )
}
