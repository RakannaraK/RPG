import { useState } from 'react'
import { ESTILOS_NOME, CAMPOS_NPC, gerarNpc, npcParaVerbete, sortearCampo } from '../../lib/geradorNpc'
import { novaSemente } from '../../lib/minigames/semente'
import Botao from '../ui/Botao'
import Ilustra from '../arte/Ilustra'
import { t } from '../../i18n'

const ROTULOS = {
  nome: t('Nome'), ocupacao: t('Ofício'), aparencia: t('Aparência'), personalidade: t('Personalidade'),
  maneirismo: t('Jeito de falar'), motivacao: t('O que quer'), segredo: t('Segredo (só você)'), gancho: t('Gancho (só você)'),
}

/**
 * Fase 46 — NPC na hora, sem IA: sorteia de tabelas; cada linha pode ser
 * sorteada de novo sozinha. Salva direto na enciclopédia (nasce oculto).
 */
export default function GeradorNpc({ onSalvar, onAjustar, onCancelar }) {
  const [estilo, setEstilo] = useState('brasileiro')
  const [atual, setAtual] = useState(() => gerarNpc({ estilo: 'brasileiro', s: novaSemente() }))
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const { npc, s } = atual

  function outro(e = estilo) { setAtual(gerarNpc({ estilo: e, s: novaSemente() })) }

  function rolarDeNovo(campo) {
    const [valor, s2] = sortearCampo(campo, npc, s)
    setAtual({ npc: { ...npc, [campo]: valor }, s: s2 })
  }

  async function salvar() {
    setSalvando(true); setErro('')
    try { await onSalvar(npcParaVerbete(npc)) } catch (e) { setErro(e.message); setSalvando(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Ilustra nome="elmo" tamanho={28} />
        <h2 className="text-ink text-lg font-semibold flex-1">{t('Gerar NPC')}</h2>
        <label className="flex items-center gap-2 text-xs text-ink-dim">{t('Nomes')}
          <select
            value={estilo} onChange={e => { setEstilo(e.target.value); outro(e.target.value) }}
            className="px-2.5 py-1.5 rounded-lg bg-void border border-border text-ink text-sm"
          >
            {ESTILOS_NOME.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        </label>
      </div>

      <dl className="divide-y divide-border/60">
        {CAMPOS_NPC.map(c => (
          <div key={c} className="flex flex-wrap sm:flex-nowrap items-start gap-x-3 gap-y-0.5 py-2">
            <dt className="w-full sm:w-32 shrink-0 text-xs text-ink-dim pt-0.5">{ROTULOS[c]}</dt>
            <dd className={`flex-1 min-w-0 text-sm text-ink ${c === 'nome' ? 'font-semibold text-base' : ''}`}>{npc[c]}</dd>
            <button
              type="button" onClick={() => rolarDeNovo(c)} aria-label={t('Sortear de novo: {campo}', { campo: ROTULOS[c] })} title={t('Sortear de novo')}
              className="shrink-0 min-w-[28px] min-h-[28px] rounded-lg text-ink-dim hover:text-ink hover:bg-slate-700 inline-flex items-center justify-center"
            ><Ilustra nome="d20" tamanho={16} /></button>
          </div>
        ))}
      </dl>

      <p className="text-xs text-ink-dim">{t('Segredo e gancho vão para as notas do mestre. O NPC nasce oculto — revele quando quiser.')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Botao variante="primario" onClick={salvar} disabled={salvando}>{salvando ? t('Salvando…') : t('Salvar na enciclopédia')}</Botao>
        <Botao variante="contorno" onClick={() => onAjustar(npcParaVerbete(npc))}>{t('Ajustar antes')}</Botao>
        <Botao variante="secundario" onClick={() => outro()}>{t('Outro NPC')}</Botao>
        <Botao variante="fantasma" onClick={onCancelar}>{t('Cancelar')}</Botao>
        {erro && <span className="text-harm text-xs" role="alert">{erro}</span>}
      </div>
    </div>
  )
}
