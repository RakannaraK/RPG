import { useState } from 'react'
import { useBau } from '../../hooks/useBau'
import { fichasQueUso, validarItemBau } from '../../lib/bau'
import Botao from '../ui/Botao'
import Ilustra from '../arte/Ilustra'
import Icone from '../ui/Icone'
import CabecalhoSecao from '../ui/CabecalhoSecao'
import EstadoVazio from '../ui/EstadoVazio'
import { useConfirmar } from '../ui/Confirmar'
import { t } from '../../i18n'

/**
 * Fase 49 — baú do grupo: o que ninguém está carregando. Jogador guarda pela
 * ficha e pega daqui; o mestre também põe o saque direto.
 */
export default function BauGrupo({ mesaId, meuId, isGestor, podeEscrever, fichas }) {
  const { confirmar } = useConfirmar()
  const bau = useBau(mesaId)
  const minhas = fichasQueUso(fichas, meuId)
  const [destino, setDestino] = useState('')
  const [novo, setNovo] = useState(null) // { nome, descricao }
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState('')

  if (bau.indisponivel) return null
  const fichaAlvo = destino || minhas[0]?.id || ''

  async function acao(chave, fn) {
    setOcupado(chave); setErro('')
    try { await fn() } catch (e) { setErro(e.message) } finally { setOcupado('') }
  }

  function porSaque(e) {
    e.preventDefault()
    const v = validarItemBau(novo)
    if (!v.ok) { setErro(v.erro); return }
    acao('saque', async () => { await bau.porSaque(v.linha); setNovo(null) })
  }

  return (
    <section className="rounded-xl border border-border bg-raised p-4 space-y-3" aria-labelledby="titulo-bau">
      <div className="flex items-start gap-3">
        <Ilustra nome="bau" tamanho={28} className="shrink-0 mt-0.5" />
        <CabecalhoSecao
          className="flex-1 min-w-0" nivel={3} titulo={<span id="titulo-bau">{t('Baú do grupo')}</span>}
          descricao={t('O que ninguém está carregando. Guarde pelo inventário da ficha e pegue daqui.')}
          acoes={isGestor && !novo && <Botao variante="secundario" tamanho="sm" onClick={() => setNovo({ nome: '', descricao: '' })}>{t('+ Pôr no baú')}</Botao>}
        />
      </div>

      {novo && (
        <form onSubmit={porSaque} className="flex flex-wrap items-center gap-2">
          <input value={novo.nome} onChange={e => setNovo(n => ({ ...n, nome: e.target.value }))} maxLength={120} placeholder={t('Ex.: Poção de cura')} aria-label={t('Nome do item')} className="campo flex-1 min-w-[10rem]" autoFocus />
          <input value={novo.descricao} onChange={e => setNovo(n => ({ ...n, descricao: e.target.value }))} placeholder={t('Descrição (opcional)')} aria-label={t('Descrição do item')} className="campo flex-[2] min-w-[12rem]" />
          <Botao type="submit" variante="primario" tamanho="sm" disabled={ocupado === 'saque'}>{t('Pôr')}</Botao>
          <Botao variante="fantasma" tamanho="sm" onClick={() => setNovo(null)}>{t('Cancelar')}</Botao>
        </form>
      )}

      {podeEscrever && minhas.length > 1 && bau.itens.length > 0 && (
        <label className="flex items-center gap-2 text-xs text-ink-dim">{t('Pegar para')}
          <select value={fichaAlvo} onChange={e => setDestino(e.target.value)} className={"campo"}>
            {minhas.map(f => <option key={f.id} value={f.id}>{f.nome_personagem}</option>)}
          </select>
        </label>
      )}

      {bau.itens.length === 0 ? (
        <EstadoVazio compacto arte="bau" titulo={t('O baú está vazio.')} />
      ) : (
        <ul className="divide-y divide-border/60">
          {bau.itens.map(item => (
            <li key={item.id} className="flex flex-wrap items-center gap-2 py-2">
              <div className="flex-1 min-w-[10rem]">
                <p className="text-ink text-sm font-medium">{item.nome}</p>
                {item.descricao && <p className="text-ink-dim text-xs">{item.descricao}</p>}
              </div>
              {podeEscrever && fichaAlvo && (
                <Botao
                  variante="contorno" tamanho="sm" disabled={ocupado === item.id}
                  onClick={() => acao(item.id, () => bau.pegar(item.id, fichaAlvo))}
                >{ocupado === item.id ? t('Pegando…') : minhas.length > 1 ? t('Pegar') : t('Pegar para {nome}', { nome: minhas[0].nome_personagem })}</Botao>
              )}
              {isGestor && (
                <button
                  type="button" aria-label={t('Tirar "{nome}" do baú', { nome: item.nome })} data-dica={t('Tirar do baú')}
                  onClick={async () => (await confirmar({ titulo: t('Tirar do baú?'), mensagem: t('{nome} deixa de existir.', { nome: item.nome }), confirmar: t('Tirar'), perigo: true })) && acao(`t${item.id}`, () => bau.tirar(item.id))}
                  className="botao-icone hover:!text-harm"
                ><Icone nome="lixeira" tamanho={18} /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      {podeEscrever && !minhas.length && bau.itens.length > 0 && (
        <p className="text-ink-dim text-xs">{t('Crie um personagem para poder pegar itens do baú.')}</p>
      )}
      {erro && <p className="text-harm text-xs" role="alert">{erro}</p>}
    </section>
  )
}
