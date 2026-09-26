import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useFichas, useCreateFicha } from '../../hooks/useFicha'
import { useSistema } from '../../hooks/useSistema'
import { podeEditarFicha } from '../../lib/permissoesFicha'
import { duplicarFicha, exportarFichaDoBanco } from '../../lib/fichaBanco'
import { nomeArquivoFicha } from '../../lib/fichaPortatil'
import { baixarJson } from '../../lib/baixarArquivo'
import ImportarFicha from '../ficha/ImportarFicha'
import BestiarioSrd from './BestiarioSrd'
import Ilustra from '../arte/Ilustra'
import Botao from '../ui/Botao'

const INP = 'px-3 py-2 rounded-lg bg-void border border-border text-ink text-sm placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent-500'
const AMEACAS = ['Trivial', 'Fácil', 'Normal', 'Difícil', 'Mortal', 'Lendária']
const ESPECIES = ['Fera', 'Humanoide', 'Morto-vivo', 'Aberração', 'Elemental', 'Construto', 'Dragão', 'Espírito']

/** Cabe qualquer texto; a cor é só um empurrãozinho visual para as palavras conhecidas. */
const CorAmeaca = { Trivial: 'bg-slate-700 text-slate-200', Fácil: 'bg-emerald-900 text-emerald-200', Normal: 'bg-sky-900 text-sky-200', Difícil: 'bg-amber-900 text-amber-200', Mortal: 'bg-red-900 text-red-200', Lendária: 'bg-fuchsia-900 text-fuchsia-200' }

/**
 * Fase 31.1 — bestiário da mesa: criaturas são FICHAS (`tipo_ficha = 'criatura'`),
 * então têm atributos, habilidades, itens e rolagens como qualquer personagem.
 * Nascem privadas: o jogador não vê a ficha do monstro.
 */
export default function PainelBestiario({ mesaId, meuId, isGestor, podeEscrever, onAbrir, acoesExtras = null }) {
  const { fichas: criaturas, loading, refetch } = useFichas(mesaId, 'criatura')
  const { sistema } = useSistema(mesaId)
  const { createFicha } = useCreateFicha()
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useState(null) // { nome, especie, ameaca, vida }
  const [ocupado, setOcupado] = useState('')
  const [erro, setErro] = useState('')
  const [srd, setSrd] = useState(false) // F50

  const doBestiario = criaturas.filter(c => !c.origem_id) // cópias em jogo não poluem a lista
  const filtro = busca.trim().toLocaleLowerCase('pt-BR')
  const lista = filtro
    ? doBestiario.filter(c => [c.nome_personagem, c.especie, c.ameaca].some(t => (t || '').toLocaleLowerCase('pt-BR').includes(filtro)))
    : doBestiario

  async function criar() {
    if (!novo?.nome?.trim()) { setErro('Dê um nome à criatura.'); return }
    setOcupado('criando'); setErro('')
    try {
      const ficha = await createFicha({
        mesaId, sistemaId: sistema?.id || null, donoId: meuId,
        infoBasica: { nome_personagem: novo.nome.trim(), nivel: 1, hp_maximo: novo.vida !== '' ? novo.vida : null },
        extras: { tipo_ficha: 'criatura', privada: true, especie: novo.especie?.trim() || null, ameaca: novo.ameaca?.trim() || null },
      })
      setNovo(null)
      refetch()
      onAbrir?.(ficha.id)
    } catch (e) {
      setErro(e.message || 'Não foi possível criar.')
    } finally { setOcupado('') }
  }

  async function duplicar(c) {
    setOcupado(c.id); setErro('')
    try { await duplicarFicha(c.id, { mesaId, donoId: meuId }); refetch() }
    catch (e) { setErro(e.message) } finally { setOcupado('') }
  }

  async function exportar(c) {
    setOcupado(c.id); setErro('')
    try {
      const { arquivo } = await exportarFichaDoBanco(c.id)
      baixarJson(nomeArquivoFicha(c.nome_personagem), arquivo)
    } catch (e) { setErro(e.message) } finally { setOcupado('') }
  }

  async function apagar(c) {
    if (!window.confirm(`Apagar “${c.nome_personagem}” do bestiário? Não dá para desfazer.`)) return
    setOcupado(c.id); setErro('')
    const { error } = await supabase.from('fichas').delete().eq('id', c.id)
    if (error) setErro(error.message)
    else refetch()
    setOcupado('')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, espécie ou ameaça" className={`${INP} flex-1 min-w-[12rem]`} />
        {podeEscrever && (
          <>
            <ImportarFicha
              mesaId={mesaId} donoId={meuId}
              extras={{ tipo_ficha: 'criatura', privada: true }}
              rotulo="⬆ Importar criatura"
              onImportada={id => { refetch(); onAbrir?.(id) }}
            />
            <Botao variante="contorno" onClick={() => setSrd(v => !v)} aria-expanded={srd}>Bestiário SRD 5e</Botao>
            <button
              type="button" onClick={() => setNovo({ nome: '', especie: '', ameaca: '', vida: '' })}
              className="text-sm px-4 py-2 bg-purple-700 hover:bg-purple-600 text-sobre-acento rounded-lg transition-colors"
            >+ Nova criatura</button>
          </>
        )}
      </div>

      {srd && (
        <BestiarioSrd
          mesaId={mesaId} meuId={meuId} sistemaId={sistema?.id}
          onImportada={id => { setSrd(false); refetch(); onAbrir?.(id) }}
          onFechar={() => setSrd(false)}
        />
      )}

      {novo && (
        <div className="rounded-xl border border-purple-800 bg-slate-800 p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input autoFocus value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })} placeholder="Nome (ex.: Goblin)" className={INP} />
            <input value={novo.especie} onChange={e => setNovo({ ...novo, especie: e.target.value })} placeholder="Espécie" list="especies-bestiario" className={INP} />
            <input value={novo.ameaca} onChange={e => setNovo({ ...novo, ameaca: e.target.value })} placeholder="Ameaça" list="ameacas-bestiario" className={INP} />
            <input type="number" min={1} value={novo.vida} onChange={e => setNovo({ ...novo, vida: e.target.value })} placeholder="Vida" className={INP} />
          </div>
          <datalist id="especies-bestiario">{ESPECIES.map(e => <option key={e} value={e} />)}</datalist>
          <datalist id="ameacas-bestiario">{AMEACAS.map(a => <option key={a} value={a} />)}</datalist>
          <div className="flex items-center gap-2">
            <Botao variante="primario" tamanho="sm" type="button" onClick={criar} disabled={ocupado === 'criando'}>
              {ocupado === 'criando' ? 'Criando…' : 'Criar e abrir a ficha'}
            </Botao>
            <button type="button" onClick={() => { setNovo(null); setErro('') }} className="px-3 py-1.5 text-sm text-purple-300 hover:text-white">Cancelar</button>
            <span className="text-accent-300 text-xs">Atributos, habilidades e itens você monta na ficha.</span>
          </div>
        </div>
      )}

      {erro && <p className="text-red-400 text-sm">{erro}</p>}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse border border-purple-900" />)}</div>
      ) : lista.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-purple-800 rounded-2xl">
          <Ilustra nome="garra" tamanho={64} className="mx-auto mb-3" />
          <p className="text-purple-300 text-sm">{doBestiario.length === 0 ? 'Bestiário vazio.' : 'Nada encontrado com esse texto.'}</p>
          {podeEscrever && doBestiario.length === 0 && (
            <p className="text-accent-300 text-xs mt-1">Crie criaturas aqui e invoque-as no combate e no mapa.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map(c => {
            const podeMexer = podeEditarFicha(c, meuId) || isGestor
            return (
              <div key={c.id} className="rounded-xl border border-purple-800 bg-slate-800 overflow-hidden flex flex-col">
                <button type="button" onClick={() => onAbrir?.(c.id)} className="flex gap-3 p-3 text-left hover:bg-slate-700/60 transition-colors">
                  {c.imagem_url
                    ? <img src={c.imagem_url} alt="" className="w-14 h-14 rounded-lg object-cover border border-purple-900 shrink-0" />
                    : <div className="w-14 h-14 rounded-lg bg-slate-900 border border-purple-900 flex items-center justify-center text-2xl shrink-0">🐾</div>}
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold truncate flex items-center gap-1.5">
                      {c.nome_personagem}
                      {c.privada && <span title="Só você e o mestre veem a ficha">🔒</span>}
                    </p>
                    <p className="text-purple-400 text-xs mt-0.5 truncate">{c.especie || 'sem espécie'}{c.hp_maximo ? ` · ${c.hp_maximo} de vida` : ''}</p>
                    {c.ameaca && (
                      <span className={`inline-block mt-1 text-xs font-semibold px-1.5 py-0.5 rounded-full ${CorAmeaca[c.ameaca] || 'bg-purple-900 text-purple-200'}`}>{c.ameaca}</span>
                    )}
                  </div>
                </button>
                <div className="flex border-t border-purple-900/70 text-sm">
                  {acoesExtras?.(c)}
                  <button type="button" onClick={() => exportar(c)} disabled={ocupado === c.id} className="flex-1 py-1.5 text-purple-300 hover:text-white hover:bg-purple-900/40 transition-colors" title="Exportar (.json)">⬇</button>
                  {podeMexer && <button type="button" onClick={() => duplicar(c)} disabled={ocupado === c.id} className="flex-1 py-1.5 text-purple-300 hover:text-white hover:bg-purple-900/40 border-l border-purple-900/70 transition-colors" title="Duplicar">⧉</button>}
                  {podeMexer && <button type="button" onClick={() => apagar(c)} disabled={ocupado === c.id} className="flex-1 py-1.5 text-red-500 hover:text-red-400 hover:bg-red-950/40 border-l border-purple-900/70 transition-colors" title="Apagar do bestiário">🗑</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
