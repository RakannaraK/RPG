import { useEffect, useMemo, useState } from 'react'
import { carregarSistemaCompleto } from '../../lib/carregarSistemaCompleto'
import { gravarImportacao } from '../../lib/fichaBanco'
import { planejarImportacao } from '../../lib/fichaPortatil'
import { ATRIBUICAO_SRD, blocoDeTexto, buscarCriaturas, criaturaParaArquivo } from '../../lib/srd5e'
import Botao from '../ui/Botao'
import Icone from '../ui/Icone'
import Esqueleto from '../ui/Esqueleto'


/**
 * Fase 50 — criaturas prontas do SRD 5.1. Cada uma entra no bestiário como uma
 * criatura comum (privada), pelo mesmo import de ficha da F30: os atributos
 * casam com os nomes do sistema da mesa; o que não casar vira aviso e o bloco
 * completo fica nos traços.
 */
export default function BestiarioSrd({ mesaId, meuId, sistemaId, onImportada }) {
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
    <section className="space-y-4" aria-label="Biblioteca SRD 5e">
      <label className="relative block">
        <span className="sr-only">Buscar criatura do SRD</span>
        <Icone nome="busca" tamanho={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder={`Buscar entre ${lista ? lista.length : '…'} criaturas por nome, tipo ou ND (ex.: nd 1/2)`} className="campo w-full !pl-9" />
      </label>

      <div className="grid gap-4 md:grid-cols-[17rem_minmax(0,1fr)] items-start">
        <ul className={`max-h-[50vh] overflow-y-auto space-y-1 pr-1 ${escolhida ? 'hidden md:block' : ''}`}>
          {!lista && !erro && [1, 2, 3, 4, 5].map(i => <li key={i}><Esqueleto className="h-9" /></li>)}
          {visiveis.map(c => (
            <li key={c.id}>
              <button
                type="button" onClick={() => setEscolhidaId(c.id)} aria-current={c.id === escolhidaId || undefined}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors duration-rapida ${c.id === escolhidaId ? 'selecionado text-ink' : 'border-transparent text-ink hover:bg-hover/70'}`}
              >
                <span className="flex-1 min-w-0 truncate">{c.nome}</span>
                <span className="text-xs text-ink-dim shrink-0 tabular-nums">ND {c.nd}</span>
              </button>
            </li>
          ))}
          {lista && !visiveis.length && <li className="text-ink-dim text-sm px-2">Nada encontrado.</li>}
        </ul>

        {escolhida ? (
          <div key={escolhida.id} className="entra-aba space-y-3 min-w-0 rounded-xl bg-void/60 border border-border p-4">
            <Botao variante="fantasma" tamanho="sm" className="md:hidden" onClick={() => setEscolhidaId(null)}><Icone nome="seta-esq" tamanho={14} /> Lista</Botao>
            <div className="flex items-start gap-3">
              <h3 className="flex-1 font-sora text-ink text-xl font-semibold">{escolhida.nome}</h3>
              <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border border-border text-ink">ND {escolhida.nd}</span>
            </div>
            <p className="text-ink text-sm whitespace-pre-wrap leading-relaxed">{blocoDeTexto(escolhida)}</p>
            {avisos.length > 0 && (
              <details className="text-xs text-ink-dim">
                <summary className="cursor-pointer">O sistema desta mesa não tem {avisos.length} {avisos.length === 1 ? 'coisa' : 'coisas'} daqui (ficam só no texto)</summary>
                <ul className="list-disc pl-5 mt-1">{avisos.map(a => <li key={a}>{a}</li>)}</ul>
              </details>
            )}
            <Botao variante="primario" onClick={adicionar} disabled={ocupado}><Icone nome="mais" tamanho={16} /> {ocupado ? 'Adicionando…' : 'Adicionar ao bestiário da mesa'}</Botao>
            {erro && <p className="aviso-erro" role="alert">{erro}</p>}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-ink-dim text-sm">
            Escolha uma criatura para ver a ficha. Ela entra no bestiário como privada: os jogadores não veem.
            {erro && <p className="aviso-erro mt-3" role="alert">{erro}</p>}
          </div>
        )}
      </div>
      <p className="text-ink-dim text-xs">{ATRIBUICAO_SRD}</p>
    </section>
  )
}
