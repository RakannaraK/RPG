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
import { useConfirmar } from '../ui/Confirmar'
import Modal, { FecharModal } from '../ui/Modal'
import Icone from '../ui/Icone'
import CabecalhoSecao from '../ui/CabecalhoSecao'
import EstadoVazio from '../ui/EstadoVazio'
import { EsqueletoCartoes } from '../ui/Esqueleto'
import { nivelAmeaca, ordemAmeaca } from '../../lib/ameaca'

const AMEACAS = ['Trivial', 'Fácil', 'Normal', 'Difícil', 'Mortal', 'Lendária']
const ESPECIES = ['Fera', 'Humanoide', 'Morto-vivo', 'Aberração', 'Elemental', 'Construto', 'Dragão', 'Espírito']


/**
 * Fase 31.1 — bestiário da mesa: criaturas são FICHAS (`tipo_ficha = 'criatura'`),
 * então têm atributos, habilidades, itens e rolagens como qualquer personagem.
 * Nascem privadas: o jogador não vê a ficha do monstro.
 */
export default function PainelBestiario({ mesaId, meuId, isGestor, podeEscrever, onAbrir, acoesExtras = null }) {
  const { confirmar } = useConfirmar()
  const { fichas: criaturas, loading, refetch } = useFichas(mesaId, 'criatura')
  const { sistema } = useSistema(mesaId)
  const { createFicha } = useCreateFicha()
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useState(null) // { nome, especie, ameaca, vida }
  const [ocupado, setOcupado] = useState('')
  const [erro, setErro] = useState('')
  const [srd, setSrd] = useState(false) // F50
  const [selId, setSelId] = useState(null) // F52 — prévia ao lado (computador)
  const [fEspecie, setFEspecie] = useState('')
  const [fAmeaca, setFAmeaca] = useState('')

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
    if (!(await confirmar({ titulo: 'Excluir criatura?', mensagem: `${c.nome_personagem} sai do bestiário desta mesa.`, detalhe: 'Esta ação não pode ser desfeita.', confirmar: 'Excluir', perigo: true }))) return
    setOcupado(c.id); setErro('')
    const { error } = await supabase.from('fichas').delete().eq('id', c.id)
    if (error) setErro(error.message)
    else refetch()
    setOcupado('')
  }

  // filtros só com o que existe nos dados (espécie e ameaça são texto livre)
  const especies = [...new Set(doBestiario.map(c => c.especie).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const ameacas = [...new Set(doBestiario.map(c => c.ameaca).filter(Boolean))].sort((a, b) => ordemAmeaca(a) - ordemAmeaca(b) || a.localeCompare(b, 'pt-BR'))
  const filtrada = lista.filter(c => (!fEspecie || c.especie === fEspecie) && (!fAmeaca || c.ameaca === fAmeaca))
  const selecionada = filtrada.find(c => c.id === selId) || null

  function escolher(c) {
    // no computador a prévia abre ao lado; no celular vai direto para a ficha
    if (window.matchMedia?.('(min-width: 1024px)').matches) setSelId(c.id)
    else onAbrir?.(c.id)
  }

  const chip = (ativo, rotulo, onClick, chave) => (
    <button
      key={chave ?? rotulo} type="button" onClick={onClick} aria-pressed={ativo}
      className={`px-3 py-1 rounded-full border text-sm transition-colors duration-rapida ${ativo ? 'selecionado text-ink' : 'border-border text-ink-dim hover:text-ink hover:border-accent-700'}`}
    >{rotulo}</button>
  )

  return (
    <div className="space-y-5">
      <CabecalhoSecao
        titulo="Bestiário da mesa"
        descricao="As criaturas desta campanha. Nascem privadas: os jogadores não veem a ficha do monstro."
        acoes={podeEscrever && (
          <>
            <ImportarFicha
              mesaId={mesaId} donoId={meuId}
              extras={{ tipo_ficha: 'criatura', privada: true }}
              rotulo="Importar"
              className="botao inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg border border-border text-ink text-sm hover:border-accent-500"
              onImportada={id => { refetch(); onAbrir?.(id) }}
            />
            <Botao variante="contorno" onClick={() => setSrd(true)}><Icone nome="globo" tamanho={16} /> Biblioteca SRD</Botao>
            <Botao variante="primario" onClick={() => setNovo({ nome: '', especie: '', ameaca: '', vida: '' })}><Icone nome="mais" tamanho={18} /> Nova criatura</Botao>
          </>
        )}
      />

      {srd && (
        <Modal onFechar={() => setSrd(false)} tamanho="xl" titulo="Biblioteca SRD 5e" subtitulo="Criaturas prontas. Escolha uma para copiar para o bestiário desta mesa.">
          <BestiarioSrd
            mesaId={mesaId} meuId={meuId} sistemaId={sistema?.id}
            onImportada={id => { setSrd(false); refetch(); onAbrir?.(id) }}
          />
        </Modal>
      )}

      {novo && (
        <Modal
          onFechar={() => { setNovo(null); setErro('') }} bloqueado={ocupado === 'criando'}
          titulo="Nova criatura" subtitulo="Atributos, habilidades e itens você monta depois, na ficha dela."
          rodape={
            <>
              <FecharModal disabled={ocupado === 'criando'} />
              <Botao variante="primario" onClick={criar} disabled={ocupado === 'criando'}>{ocupado === 'criando' ? 'Criando…' : 'Criar e abrir a ficha'}</Botao>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2"><span className="rotulo">Nome</span>
              <input autoFocus value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })} placeholder="Ex.: Goblin" className="campo w-full" />
            </label>
            <label className="block"><span className="rotulo">Espécie</span>
              <input value={novo.especie} onChange={e => setNovo({ ...novo, especie: e.target.value })} placeholder="Fera, Humanoide…" list="especies-bestiario" className="campo w-full" />
            </label>
            <label className="block"><span className="rotulo">Ameaça</span>
              <input value={novo.ameaca} onChange={e => setNovo({ ...novo, ameaca: e.target.value })} placeholder="Normal, ND 5…" list="ameacas-bestiario" className="campo w-full" />
            </label>
            <label className="block"><span className="rotulo">Vida</span>
              <input type="number" min={1} value={novo.vida} onChange={e => setNovo({ ...novo, vida: e.target.value })} placeholder="Ex.: 7" className="campo w-full" />
            </label>
          </div>
          <datalist id="especies-bestiario">{ESPECIES.map(e => <option key={e} value={e} />)}</datalist>
          <datalist id="ameacas-bestiario">{AMEACAS.map(a => <option key={a} value={a} />)}</datalist>
          {erro && <p className="aviso-erro mt-3" role="alert">{erro}</p>}
        </Modal>
      )}

      {erro && !novo && <p className="aviso-erro" role="alert">{erro}</p>}

      {loading ? (
        <EsqueletoCartoes quantos={3} className="grid gap-3 lg:max-w-sm" altura="h-20" />
      ) : doBestiario.length === 0 ? (
        <EstadoVazio arte="garra" titulo="O bestiário está vazio" descricao="Crie uma criatura do zero ou copie uma pronta da biblioteca SRD. Depois é só invocar no combate ou no mapa.">
          {podeEscrever && (
            <>
              <Botao variante="contorno" onClick={() => setSrd(true)}>Abrir a biblioteca SRD</Botao>
              <Botao variante="primario" onClick={() => setNovo({ nome: '', especie: '', ameaca: '', vida: '' })}><Icone nome="mais" tamanho={18} /> Nova criatura</Botao>
            </>
          )}
        </EstadoVazio>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] items-start">
          {/* ── Lista ── */}
          <div className="space-y-3">
            <label className="relative block">
              <span className="sr-only">Buscar criatura</span>
              <Icone nome="busca" tamanho={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, espécie ou ameaça" className="campo w-full !pl-9" />
            </label>
            {especies.length > 1 && (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por espécie">
                {chip(!fEspecie, 'Todas', () => setFEspecie(''), '__todas')}
                {especies.map(e => chip(fEspecie === e, e, () => setFEspecie(fEspecie === e ? '' : e)))}
              </div>
            )}
            {ameacas.length > 1 && (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por ameaça">
                {chip(!fAmeaca, 'Qualquer ameaça', () => setFAmeaca(''), '__qualquer')}
                {ameacas.map(a => chip(fAmeaca === a, a, () => setFAmeaca(fAmeaca === a ? '' : a)))}
              </div>
            )}
            <p className="text-ink-dim text-xs">{filtrada.length} de {doBestiario.length} criatura{doBestiario.length > 1 ? 's' : ''}</p>

            {filtrada.length === 0 ? (
              <EstadoVazio compacto arte="garra" titulo="Nada encontrado" descricao="Tente outro nome ou tire um filtro." />
            ) : (
              <ul className="entra-lista space-y-2">
                {filtrada.map((c, i) => (
                  <li key={c.id} style={{ '--i': i }} className="flex items-stretch gap-1.5">
                    <button
                      type="button" onClick={() => escolher(c)} aria-current={selecionada?.id === c.id || undefined}
                      className={`cartao flex-1 min-w-0 flex items-center gap-3 p-2.5 rounded-xl border text-left bg-raised/70 ${selecionada?.id === c.id ? 'selecionado' : 'border-border'}`}
                    >
                      <Retrato c={c} tamanho="w-12 h-12" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-ink font-semibold truncate">
                          {c.nome_personagem}
                          {c.privada && <Icone nome="cadeado" tamanho={13} className="text-ink-dim" />}
                        </span>
                        <span className="block text-ink-dim text-xs truncate mt-0.5">{[c.especie, c.hp_maximo ? `${c.hp_maximo} de vida` : null].filter(Boolean).join(' • ') || 'sem espécie'}</span>
                      </span>
                      {c.ameaca && <SeloAmeaca ameaca={c.ameaca} />}
                    </button>
                    {acoesExtras && <div className="flex items-center">{acoesExtras(c)}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Prévia (computador) ── */}
          <div className="hidden lg:block lg:sticky lg:top-32">
            {selecionada ? (
              <article key={selecionada.id} className="entra-aba rounded-2xl border border-border bg-raised/70 overflow-hidden">
                <div className="relative h-40 bg-void flex items-center justify-center overflow-hidden">
                  {selecionada.imagem_url
                    ? <img src={selecionada.imagem_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    : <Ilustra nome="garra" tamanho={96} className="opacity-70" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-raised via-transparent to-transparent" aria-hidden="true" />
                </div>
                <div className="p-5 space-y-4 -mt-8 relative">
                  <div>
                    <div className="flex items-start gap-3">
                      <h3 className="flex-1 font-sora text-2xl font-bold text-ink leading-tight">{selecionada.nome_personagem}</h3>
                      {selecionada.ameaca && <SeloAmeaca ameaca={selecionada.ameaca} grande />}
                    </div>
                    <p className="text-ink-dim mt-1">{selecionada.especie || 'Espécie não definida'}</p>
                  </div>
                  {selecionada.hp_maximo && (
                    <div className="inline-flex items-center gap-2 rounded-xl bg-void/70 border border-border px-3 py-2">
                      <Icone nome="coracao" tamanho={16} className="text-harm" />
                      <span className="text-ink font-semibold tabular-nums">{selecionada.hp_maximo}</span>
                      <span className="text-ink-dim text-sm">de vida</span>
                    </div>
                  )}
                  {selecionada.privada && (
                    <p className="inline-flex items-center gap-1.5 text-sm text-ink-dim"><Icone nome="cadeado" tamanho={14} /> Apenas o mestre vê esta ficha</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Botao variante="primario" onClick={() => onAbrir?.(selecionada.id)}>Abrir a ficha completa <Icone nome="seta-dir" tamanho={16} /></Botao>
                    <Botao variante="contorno" onClick={() => exportar(selecionada)} disabled={ocupado === selecionada.id}><Icone nome="baixar" tamanho={16} /> Exportar</Botao>
                    {(podeEditarFicha(selecionada, meuId) || isGestor) && (
                      <>
                        <Botao variante="contorno" onClick={() => duplicar(selecionada)} disabled={ocupado === selecionada.id}><Icone nome="copiar" tamanho={16} /> Duplicar</Botao>
                        <Botao variante="fantasma" className="hover:!text-harm" onClick={() => apagar(selecionada)} disabled={ocupado === selecionada.id}><Icone nome="lixeira" tamanho={16} /> Excluir</Botao>
                      </>
                    )}
                  </div>
                  <p className="text-ink-dim text-xs">Atributos, ações, reações e notas do mestre ficam na ficha completa.</p>
                </div>
              </article>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <Ilustra nome="garra" tamanho={56} className="mx-auto mb-3 opacity-80" />
                <p className="text-ink font-medium">Escolha uma criatura</p>
                <p className="text-ink-dim text-sm mt-1">A prévia aparece aqui; a ficha completa abre com um clique.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Retrato da criatura (imagem ou a garra da casa). */
function Retrato({ c, tamanho }) {
  return c.imagem_url
    ? <img src={c.imagem_url} alt="" loading="lazy" className={`${tamanho} rounded-lg object-cover ring-1 ring-border shrink-0`} />
    : <span className={`${tamanho} rounded-lg bg-void ring-1 ring-border flex items-center justify-center shrink-0`}><Ilustra nome="garra" tamanho={28} /></span>
}

/** Ameaça: o texto é livre ("ND 1/4", "Mortal"); as palavras conhecidas ganham um nível de 1 a 5 em pontinhos. */
function SeloAmeaca({ ameaca, grande = false }) {
  const n = nivelAmeaca(ameaca)
  return (
    <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-void/70 font-semibold text-ink ${grande ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'}`} title={`Ameaça: ${ameaca}`}>
      {n > 0 && (
        <span className="inline-flex gap-0.5" aria-hidden="true">
          {[1, 2, 3, 4, 5].map(i => <span key={i} className={`w-1 h-2.5 rounded-sm ${i <= n ? (n >= 4 ? 'bg-harm' : n >= 3 ? 'bg-warn' : 'bg-ok') : 'bg-border'}`} />)}
        </span>
      )}
      {ameaca}
    </span>
  )
}
