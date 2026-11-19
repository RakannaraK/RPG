import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useCreateFicha } from '../../hooks/useFicha'
import { duplicarFicha } from '../../lib/fichaBanco'
import { formasDaFicha, planejarTransformacao } from '../../lib/transformacao'
import { useConfirmar } from '../ui/Confirmar'
import { t } from '../../i18n'

const INP = 'px-2 py-1.5 rounded-lg bg-void border border-border text-ink text-sm placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent-500'
const BTN = 'px-2.5 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50'

/**
 * Fase 33.2 — formas alternativas da ficha. Cada forma é uma ficha própria
 * (atributos, vida, habilidades e itens dela), presa a esta pelo `forma_de_id`.
 * Transformar só troca qual delas está valendo — nada é apagado.
 */
export default function PainelFormas({ ficha, mesaId, meuId, isDono, onAbrirFicha, onTransformar }) {
  const { confirmar } = useConfirmar()
  const fichaId = ficha?.id
  const { createFicha } = useCreateFicha()
  const [formas, setFormas] = useState([])
  const [criaturas, setCriaturas] = useState([])
  const [nome, setNome] = useState('')
  const [deCriatura, setDeCriatura] = useState('')
  const [ocupado, setOcupado] = useState('')
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    if (!fichaId) return
    const [fs, cs] = await Promise.all([
      supabase.from('fichas').select('*').eq('forma_de_id', fichaId),
      isDono
        ? supabase.from('fichas').select('id, nome_personagem, especie').eq('mesa_id', mesaId).eq('tipo_ficha', 'criatura').is('origem_id', null)
        : Promise.resolve({ data: [] }),
    ])
    setFormas(formasDaFicha(fs.data || [], fichaId))
    setCriaturas(cs.data || [])
  }, [fichaId, mesaId, isDono])

  useEffect(() => { carregar() }, [carregar])

  const ativa = formas.find(f => f.id === ficha?.forma_ativa_id) || null

  async function criarEmBranco() {
    if (!nome.trim()) { setErro(t('Dê um nome à forma.')); return }
    setOcupado('criar'); setErro('')
    try {
      await createFicha({
        mesaId, sistemaId: ficha.sistema_id || null, donoId: meuId,
        infoBasica: { nome_personagem: nome.trim(), nivel: ficha.nivel || 1, hp_maximo: ficha.hp_maximo ?? null },
        extras: { tipo_ficha: 'forma', forma_de_id: ficha.id, privada: ficha.privada },
      })
      setNome('')
      await carregar()
    } catch (e) { setErro(e.message) } finally { setOcupado('') }
  }

  async function criarDeCriatura() {
    const criatura = criaturas.find(c => c.id === deCriatura)
    if (!criatura) return
    setOcupado('criar'); setErro('')
    try {
      await duplicarFicha(criatura.id, {
        mesaId, donoId: meuId,
        nome: criatura.nome_personagem,
        extras: { tipo_ficha: 'forma', forma_de_id: ficha.id, origem_id: criatura.id, privada: ficha.privada },
      })
      setDeCriatura('')
      await carregar()
    } catch (e) { setErro(e.message) } finally { setOcupado('') }
  }

  async function transformar(formaId) {
    setOcupado(formaId || 'voltar'); setErro('')
    try {
      await onTransformar(planejarTransformacao(ficha, formaId, formas))
    } catch (e) { setErro(e.message) } finally { setOcupado('') }
  }

  async function apagar(forma) {
    if (!(await confirmar({ titulo: t('Apagar forma?'), mensagem: t('A forma {nome} será apagada.', { nome: forma.nome_personagem }), detalhe: t('Esta ação não pode ser desfeita.'), confirmar: t('Apagar'), perigo: true }))) return
    setOcupado(forma.id); setErro('')
    const { error } = await supabase.from('fichas').delete().eq('id', forma.id)
    if (error) setErro(error.message)
    else await carregar()
    setOcupado('')
  }

  if (formas.length === 0 && !isDono) return null

  return (
    <div className="rounded-2xl border border-border bg-raised/40 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-dice-400 font-semibold text-sm">{t('🐺 Formas')}</span>
        {ativa && <span className="text-xs px-2 py-0.5 rounded-full bg-dice-700/30 border border-dice-500/60 text-dice-200">{t('em {nome}', { nome: ativa.nome_personagem })}</span>}
        {formas.length === 0 && <span className="text-ink-dim text-xs">{t('Nenhuma forma. A forma tem vida, atributos e habilidades próprios.')}</span>}
      </div>

      {formas.length > 0 && (
        <ul className="space-y-1">
          {formas.map(f => {
            const estaAtiva = f.id === ficha.forma_ativa_id
            return (
              <li key={f.id} className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => onAbrirFicha?.(f.id)} className="text-ink text-sm hover:underline flex-1 min-w-[8rem] text-left truncate">
                  {f.nome_personagem}
                  {f.hp_maximo != null && <span className="text-ink-dim text-xs">{t(' · {atual}/{maximo} de vida', { atual: f.hp_atual ?? '?', maximo: f.hp_maximo })}</span>}
                </button>
                {isDono && (
                  <>
                    <button
                      type="button" onClick={() => transformar(estaAtiva ? null : f.id)} disabled={!!ocupado}
                      className={`${BTN} ${estaAtiva ? 'bg-hover text-ink hover:bg-border' : 'bg-accent-600 hover:bg-accent-500 text-sobre-acento font-semibold'}`}
                    >{estaAtiva ? t('↩ Voltar ao normal') : t('🐺 Transformar')}</button>
                    <button type="button" onClick={() => apagar(f)} disabled={!!ocupado} className="text-ink-dim hover:text-red-400 text-sm px-1" title={t('Apagar forma')}>✕</button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {isDono && (
        <div className="flex flex-wrap items-end gap-2 border-t border-border pt-2">
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder={t('Nova forma (ex.: Lobo)')} className={`${INP} w-44`} />
          <button type="button" onClick={criarEmBranco} disabled={ocupado === 'criar'} className={`${BTN} bg-hover text-ink hover:bg-border`}>{t('+ Criar em branco')}</button>
          {criaturas.length > 0 && (
            <>
              <select value={deCriatura} onChange={e => setDeCriatura(e.target.value)} className={INP} aria-label={t('Forma a partir de criatura')}>
                <option value="">{t('…ou a partir do bestiário')}</option>
                {criaturas.map(c => <option key={c.id} value={c.id}>{c.nome_personagem}{c.especie ? ` (${c.especie})` : ''}</option>)}
              </select>
              <button type="button" onClick={criarDeCriatura} disabled={!deCriatura || ocupado === 'criar'} className={`${BTN} bg-hover text-ink hover:bg-border`}>
                {ocupado === 'criar' ? t('Criando…') : t('Copiar criatura')}
              </button>
            </>
          )}
        </div>
      )}
      {erro && <p className="text-red-400 text-xs">{erro}</p>}
    </div>
  )
}
