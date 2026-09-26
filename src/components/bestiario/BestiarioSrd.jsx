import { useEffect, useMemo, useState } from 'react'
import { carregarSistemaCompleto } from '../../lib/carregarSistemaCompleto'
import { gravarImportacao } from '../../lib/fichaBanco'
import { planejarImportacao } from '../../lib/fichaPortatil'
import { ATRIBUICAO_SRD, blocoDeTexto, buscarCriaturas, criaturaParaArquivo } from '../../lib/srd5e'
import Botao from '../ui/Botao'

const CAMPO = 'px-3 py-2 rounded-lg bg-void border border-border text-ink text-sm placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent-500'

/**
 * Fase 50 — criaturas prontas do SRD 5.1. Cada uma entra no bestiário como uma
 * criatura comum (privada), pelo mesmo import de ficha da F30: os atributos
 * casam com os nomes do sistema da mesa; o que não casar vira aviso e o bloco
 * completo fica nos traços.
 */
export default function BestiarioSrd({ mesaId, meuId, sistemaId, onImportada, onFechar }) {
  const [lista, setLista] = useState(null)
  const [grafo, setGrafo] = useState(null)
  const [busca, setBusca] = useState('')
  const [escolhidaId, setEscolhidaId] = useState(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    // os dados só descem quando alguém abre esta lista
    import('../../lib/srd5eDados').then(m => setLista(m.CRIATURAS_SRD)).catch(e => setErro(e.message))
    if (sistemaId) carregarSistemaCompleto(sistemaId).then(setGrafo).catch(() => setGrafo(null))
  }, [sistemaId])

  const visiveis = useMemo(() => buscarCriaturas(lista || [], busca), [lista, busca])
  const escolhida = (lista || []).find(c => c.id === escolhidaId)
  const avisos = useMemo(() => {
    if (!escolhida) return []
    return planejarImportacao(criaturaParaArquivo(escolhida, grafo), grafo).avisos
  }, [escolhida, grafo])

  async function adicionar() {
    setOcupado(true); setErro('')
    try {
      const plano = planejarImportacao(criaturaParaArquivo(escolhida, grafo), grafo)
      const id = await gravarImportacao({ ...plano, sistemaId: sistemaId || null }, {
        mesaId, donoId: meuId,
        extras: { tipo_ficha: 'criatura', privada: true, especie: escolhida.especie, ameaca: `ND ${escolhida.nd}` },
      })
      onImportada(id)
    } catch (e) { setErro(e.message); setOcupado(false) }
  }

  return (
    <section className="rounded-xl border border-border bg-raised p-4 space-y-3" aria-label="Bestiário SRD 5e">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-ink font-semibold flex-1">Bestiário SRD 5e <span className="text-ink-dim text-xs font-normal">· {lista ? lista.length : '…'} criaturas</span></p>
        <Botao variante="fantasma" tamanho="sm" onClick={onFechar}>Fechar</Botao>
      </div>
      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, tipo ou ND (ex.: nd 1/2)" aria-label="Buscar criatura do SRD" className={`${CAMPO} w-full`} />

      <div className="grid gap-3 md:grid-cols-[16rem_1fr] items-start">
        <ul className={`max-h-80 overflow-y-auto space-y-0.5 ${escolhida ? 'hidden md:block' : ''}`}>
          {visiveis.map(c => (
            <li key={c.id}>
              <button
                type="button" onClick={() => setEscolhidaId(c.id)} aria-current={c.id === escolhidaId}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-sm ${c.id === escolhidaId ? 'bg-slate-700 text-ink' : 'text-ink hover:bg-slate-800'}`}
              >
                <span className="flex-1 min-w-0 truncate">{c.nome}</span>
                <span className="text-xs text-ink-dim shrink-0">ND {c.nd}</span>
              </button>
            </li>
          ))}
          {lista && !visiveis.length && <li className="text-ink-dim text-sm px-2">Nada encontrado.</li>}
        </ul>

        {escolhida ? (
          <div className="space-y-3 min-w-0">
            <Botao variante="fantasma" tamanho="sm" className="md:hidden" onClick={() => setEscolhidaId(null)}>← Lista</Botao>
            <h3 className="text-ink text-lg font-semibold">{escolhida.nome}</h3>
            <p className="text-ink text-sm whitespace-pre-wrap leading-relaxed">{blocoDeTexto(escolhida)}</p>
            {avisos.length > 0 && (
              <details className="text-xs text-ink-dim">
                <summary className="cursor-pointer">O sistema desta mesa não tem {avisos.length} {avisos.length === 1 ? 'coisa' : 'coisas'} daqui (ficam só no texto)</summary>
                <ul className="list-disc pl-5 mt-1">{avisos.map(a => <li key={a}>{a}</li>)}</ul>
              </details>
            )}
            <Botao variante="primario" onClick={adicionar} disabled={ocupado}>{ocupado ? 'Adicionando…' : 'Adicionar ao bestiário'}</Botao>
            {erro && <p className="text-harm text-xs" role="alert">{erro}</p>}
          </div>
        ) : (
          <p className="text-ink-dim text-sm">Escolha uma criatura para ver a ficha. Ela entra no bestiário como privada: os jogadores não veem.</p>
        )}
      </div>
      <p className="text-ink-dim text-xs">{ATRIBUICAO_SRD}</p>
    </section>
  )
}
