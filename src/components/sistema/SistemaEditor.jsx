import { useState, useEffect, useCallback } from 'react'
import { useSistema, useSaveSistema } from '../../hooks/useSistema'
import { usePools } from '../../hooks/usePools'
import { useLinhasPoder } from '../../hooks/useLinhasPoder'
import { mergeConfigLayout } from '../../lib/sistemaDefaults'
import { carregarSistemaCompleto } from '../../lib/carregarSistemaCompleto'
import { serializarSistema } from '../../engines/systemSerializer'
import { baixarJson } from '../../lib/baixarArquivo'
import { importarSistemaNaMesa } from '../../lib/importarSistema'
import { TEMPLATES_SISTEMA } from '../../templates'
import GuiaMestre from '../ajuda/GuiaMestre'
import AtributoEditor from './AtributoEditor'
import LayoutEditor from './LayoutEditor'
import RacasClassesEditor from './RacasClassesEditor'
import PoolsEditor from './PoolsEditor'
import PoderesEditor from './PoderesEditor'
import LinhasPoderEditor from './LinhasPoderEditor'
import SlotsEditor from './SlotsEditor'
import MaestriaItensEditor from './MaestriaItensEditor'
import SimuladorFicha from './SimuladorFicha'
import DescansosEditor from './DescansosEditor'
import Botao from '../ui/Botao'
import Icone from '../ui/Icone'
import Abas from '../ui/Abas'
import CabecalhoSecao from '../ui/CabecalhoSecao'
import EstadoVazio from '../ui/EstadoVazio'
import Esqueleto from '../ui/Esqueleto'
import { useConfirmar } from '../ui/Confirmar'
import { useToast } from '../ui/Toast'
import { SECOES_SISTEMA, secoesAlteradas, textoAlteradas } from '../../lib/editorSistema'

const REGRA_PADRAO = {
  tipo: 'dados',
  quantidade: 2,
  lados: 6,
  descartar_menores: 0,
  descartar_maiores: 0,
  bonus_fixo: 0,
}

function newAtributo() {
  return {
    id: `temp_${Date.now()}_${Math.random()}`,
    nome: '',
    descricao: '',
    ordem: 0,
    regra_rolagem: { ...REGRA_PADRAO },
  }
}

function newPericia() {
  return {
    id: `temp_${Date.now()}_${Math.random()}`,
    nome: '',
    atributo_base_id: null,
    ordem: 0,
  }
}

export default function SistemaEditor({ mesaId, isMestre }) {
  const { confirmar } = useConfirmar()
  const toast = useToast()
  const { sistema: sistemaDB, atributos: atributosDB, pericias: periciasDB, loading, error, refetch } = useSistema(mesaId)
  const { pools } = usePools(sistemaDB?.id) // 23.4 — p/ escolher o pool da rerolagem
  const { linhas: linhasPoderSistema } = useLinhasPoder(sistemaDB?.id) // 25.3 — p/ threadar em Raças & Classes
  const { saveSistema, loading: saving } = useSaveSistema()

  const [secao, setSecao] = useState('geral') // F52 — editor em seções
  const [base, setBase] = useState(null)      // o que está salvo no banco (para saber o que mudou)

  // Sistema
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')

  // Atributos
  const [atributos, setAtributos] = useState([])
  const [removedAtributoIds, setRemovedAtributoIds] = useState([])

  // Layout
  const [configLayout, setConfigLayout] = useState(mergeConfigLayout(null))

  // Perícias
  const [pericias, setPericias] = useState([])
  const [removedPericiaIds, setRemovedPericiaIds] = useState([])

  const [saveError, setSaveError] = useState('')
  const [exportando, setExportando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [showGuia, setShowGuia] = useState(false)

  // Sincroniza estado local quando dados do DB chegam (e no "Descartar")
  const sincronizar = useCallback(() => {
    const salvo = {
      nome: sistemaDB?.nome || '',
      descricao: sistemaDB?.descricao || '',
      atributos: atributosDB.map(a => ({ ...a })),
      configLayout: mergeConfigLayout(sistemaDB?.config_layout),
      pericias: periciasDB.map(p => ({ ...p })),
    }
    setBase(salvo)
    setNome(salvo.nome)
    setDescricao(salvo.descricao)
    setAtributos(salvo.atributos.map(a => ({ ...a })))
    setConfigLayout(structuredClone(salvo.configLayout))
    setPericias(salvo.pericias.map(p => ({ ...p })))
    setRemovedAtributoIds([])
    setRemovedPericiaIds([])
    setSaveError('')
  }, [sistemaDB, atributosDB, periciasDB])
  useEffect(() => { sincronizar() }, [sincronizar])

  // F52 — o que falta salvar, por seção (a barra de baixo e os pontinhos usam)
  const alteradas = secoesAlteradas(base, {
    nome, descricao, atributos, pericias, configLayout,
    removidos: { atributos: removedAtributoIds, pericias: removedPericiaIds },
  })
  const temAlteracao = alteradas.size > 0

  // fechar a aba do navegador com coisa não salva: o navegador pergunta antes
  useEffect(() => {
    if (!temAlteracao) return
    const avisar = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [temAlteracao])

  async function descartar() {
    const ok = await confirmar({ titulo: 'Descartar alterações?', mensagem: `O que mudou em ${textoAlteradas(alteradas)} volta a ser como está salvo.`, confirmar: 'Descartar', perigo: true })
    if (ok) sincronizar()
  }

  // --- Atributos ---
  function addAtributo() {
    setAtributos(prev => [...prev, newAtributo()])
  }

  function updateAtributo(index, updated) {
    setAtributos(prev => prev.map((a, i) => (i === index ? updated : a)))
  }

  async function removeAtributo(index) {
    const attr = atributos[index]
    if (attr.id && !attr.id.startsWith('temp_')) {
      const nomeAttr = attr.nome || 'este atributo'
      if (!(await confirmar({ titulo: 'Remover atributo?', mensagem: `${nomeAttr} sai do sistema.`, detalhe: 'Os valores já salvos nas fichas são apagados quando você salvar o sistema.', confirmar: 'Remover', perigo: true }))) return
      setRemovedAtributoIds(prev => [...prev, attr.id])
    }
    setAtributos(prev => prev.filter((_, i) => i !== index))
  }

  // --- Perícias ---
  function addPericia() {
    setPericias(prev => [...prev, newPericia()])
  }

  function updatePericia(index, updated) {
    setPericias(prev => prev.map((p, i) => (i === index ? updated : p)))
  }

  function removePericia(index, p) {
    if (p.id && !p.id.startsWith('temp_')) {
      setRemovedPericiaIds(prev => [...prev, p.id])
    }
    setPericias(prev => prev.filter((_, i) => i !== index))
  }

  // --- Salvar ---
  async function handleSave() {
    setSaveError('')

    if (!nome.trim()) {
      setSaveError('O sistema precisa ter um nome (seção Geral).')
      setSecao('geral')
      return
    }
    const invalidos = atributos.filter(a => !a.nome.trim())
    if (invalidos.length > 0) {
      setSaveError('Todos os atributos precisam ter um nome.')
      setSecao('atributos')
      return
    }

    try {
      await saveSistema({
        mesaId,
        sistema: { id: sistemaDB?.id, nome: nome.trim(), descricao: descricao.trim() },
        atributos,
        removedAtributoIds,
        configLayout,
        pericias,
        removedPericiaIds,
      })
      toast.ok('Sistema salvo')
      refetch()
    } catch (err) {
      setSaveError(err.message)
    }
  }

  async function handleExportar() {
    if (!sistemaDB?.id || exportando) return
    setExportando(true)
    setSaveError('')
    try {
      const grafo = await carregarSistemaCompleto(sistemaDB.id)
      const base = (sistemaDB.nome || 'sistema').trim().replace(/[^\w-]+/g, '_').toLowerCase() || 'sistema'
      baixarJson(`${base}.json`, serializarSistema(grafo))
    } catch (err) {
      toast.erro('Não foi possível exportar', { detalhe: err.message })
    } finally {
      setExportando(false)
    }
  }

  async function handleImportar(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || importando) return
    setImportando(true)
    setSaveError('')
    try {
      const json = JSON.parse(await file.text())
      await importarSistemaNaMesa(mesaId, json)
      toast.ok('Sistema importado')
      refetch()
    } catch (err) {
      toast.erro('Não foi possível importar', { detalhe: err.message })
    } finally {
      setImportando(false)
    }
  }

  async function handleUsarModelo(t) {
    if (importando) return
    setImportando(true)
    setSaveError('')
    try {
      await importarSistemaNaMesa(mesaId, t.dados)
      toast.ok(`Sistema criado a partir de ${t.nome}`)
      refetch()
    } catch (err) {
      toast.erro('Não foi possível usar o modelo', { detalhe: err.message })
    } finally {
      setImportando(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)]" role="status" aria-label="Carregando o sistema">
        <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Esqueleto key={i} className="h-10" />)}</div>
        <div className="rounded-2xl border border-border p-6 space-y-3"><Esqueleto className="h-7 w-1/3" /><Esqueleto className="h-4 w-2/3" /><Esqueleto className="h-24" /></div>
      </div>
    )
  }

  if (error) {
    return <EstadoVazio arte="tomo" titulo="Não foi possível abrir o sistema" descricao={error} />
  }

  // Jogadores: visualização somente leitura
  if (!isMestre) {
    if (!sistemaDB) {
      return <EstadoVazio arte="tomo" titulo="Nenhum sistema definido" descricao="Aguarde o mestre configurar as regras da mesa." />
    }
    const resumoRegra = r => (r?.tipo === 'dados' ? `${r.quantidade}d${r.lados}` : r?.tipo === 'fixo' ? `Fixo ${r.valor}` : `${r?.pool_total} pts`)
    return (
      <div className="space-y-6">
        <CabecalhoSecao titulo={sistemaDB.nome} descricao={sistemaDB.descricao || 'As regras desta mesa.'} />
        {atributosDB.length === 0 ? (
          <EstadoVazio compacto arte="dado" titulo="Nenhum atributo ainda" descricao="O mestre ainda está montando o sistema." />
        ) : (
          <section className="space-y-3">
            <p className="text-ink-dim text-xs font-semibold uppercase tracking-wider">Atributos ({atributosDB.length})</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {atributosDB.map(attr => (
                <div key={attr.id} className="rounded-xl border border-border bg-raised/70 px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ink font-semibold">{attr.nome}</p>
                    {attr.descricao && <p className="text-ink-dim text-sm mt-0.5">{attr.descricao}</p>}
                  </div>
                  <span className="text-dice-400 font-mono text-sm shrink-0">{resumoRegra(attr.regra_rolagem)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    )
  }

  const info = SECOES_SISTEMA.find(s => s.id === secao) || SECOES_SISTEMA[0]
  const precisaSistema = !sistemaDB?.id && ['racas', 'recursos', 'poderes', 'maestria'].includes(secao)

  // Mestre: editor em seções
  return (
    <div className="space-y-6">
      <CabecalhoSecao
        titulo={sistemaDB ? (sistemaDB.nome || 'Sistema') : 'Criar o sistema de regras'}
        descricao={sistemaDB ? (sistemaDB.descricao || 'As regras da mesa: atributos, ficha, recursos e poderes.') : 'Comece de um modelo pronto, importe um arquivo ou monte do zero.'}
        acoes={
          <>
            {!sistemaDB && <Botao variante="fantasma" onClick={() => setShowGuia(true)}><Icone nome="ajuda" tamanho={16} /> Guia do mestre</Botao>}
            {sistemaDB?.id && (
              <Botao variante="contorno" onClick={handleExportar} disabled={exportando || saving} title="Baixa um .json com todo o sistema (backup ou importar em outra mesa)">
                <Icone nome="baixar" tamanho={16} /> {exportando ? 'Exportando…' : 'Exportar'}
              </Botao>
            )}
          </>
        }
      />

      {/* celular: abas no topo */}
      <div className="lg:hidden">
        <Abas
          rotulo="Seções do sistema" tamanho="sm" atual={secao} onTrocar={setSecao}
          abas={SECOES_SISTEMA.map(s => ({ id: s.id, rotulo: s.rotulo, selo: alteradas.has(s.id) ? <span className="w-1.5 h-1.5 rounded-full bg-warn" aria-label="não salvo" /> : null }))}
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)] items-start">
        {/* computador: lista de seções */}
        <nav className="hidden lg:block lg:sticky lg:top-32 space-y-0.5" aria-label="Seções do sistema">
          {SECOES_SISTEMA.map(s => {
            const atual = secao === s.id
            return (
              <button
                key={s.id} type="button" onClick={() => setSecao(s.id)} aria-current={atual || undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors duration-rapida ${
                  atual ? 'bg-accent-800/30 text-ink font-semibold shadow-[inset_3px_0_0_var(--accent-400)]' : 'text-ink-dim hover:text-ink hover:bg-hover/70'
                }`}
              >
                <Icone nome={s.icone} tamanho={18} />
                <span className="flex-1">{s.rotulo}</span>
                {alteradas.has(s.id) && <span className="w-2 h-2 rounded-full bg-warn" title="Alteração não salva" aria-label="não salvo" />}
              </button>
            )
          })}
        </nav>

        <section className="min-w-0 rounded-2xl border border-border bg-raised/60 p-5 sm:p-6" aria-label={info.rotulo}>
          <header className="flex items-start gap-3 pb-5 mb-5 border-b border-border/60">
            <span className="w-10 h-10 shrink-0 rounded-xl bg-accent-800/30 text-accent-300 inline-flex items-center justify-center"><Icone nome={info.icone} tamanho={20} /></span>
            <div className="min-w-0">
              <h3 className="font-sora text-ink text-lg font-semibold">{info.rotulo}</h3>
              <p className="text-ink-dim text-sm mt-0.5">{info.descricao}</p>
            </div>
          </header>

          <div key={secao} className="entra-aba">
            {precisaSistema && (
              <EstadoVazio compacto arte="tomo" titulo="Salve o sistema primeiro" descricao="Dê um nome na seção Geral e salve; depois esta parte fica liberada.">
                <Botao variante="primario" onClick={() => setSecao('geral')}>Ir para Geral</Botao>
              </EstadoVazio>
            )}

            {secao === 'geral' && (
              <div className="space-y-6">
                {!sistemaDB && (
                  <div className="space-y-4">
                    <div>
                      <p className="rotulo">Comece de um modelo pronto</p>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {TEMPLATES_SISTEMA.map(t => (
                          <button
                            key={t.id} type="button" onClick={() => handleUsarModelo(t)} disabled={importando}
                            className="cartao text-left rounded-xl border border-border bg-void/40 p-4 disabled:opacity-50"
                          >
                            <span className="block text-ink font-semibold">{t.nome}</span>
                            {t.descricao && <span className="block text-ink-dim text-sm mt-1 line-clamp-2">{t.descricao}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className={`flex items-center gap-3 rounded-xl border border-dashed border-border p-4 cursor-pointer hover:border-accent-500 transition-colors duration-rapida has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-400 ${importando ? 'opacity-60 cursor-wait' : ''}`}>
                      <Icone nome="enviar" tamanho={22} className="text-accent-300" />
                      <span>
                        <span className="block text-ink text-sm font-medium">{importando ? 'Importando…' : 'Importar um sistema (.json)'}</span>
                        <span className="block text-ink-dim text-xs">O arquivo que o botão Exportar gera em outra mesa.</span>
                      </span>
                      <input type="file" accept="application/json,.json" onChange={handleImportar} disabled={importando} className="sr-only" />
                    </label>
                    <div className="divisor-rpg text-xs text-ink-dim">ou monte do zero</div>
                  </div>
                )}
                <label className="block">
                  <span className="rotulo">Nome do sistema</span>
                  <input type="text" placeholder="Ex.: D&D 5e, Homebrew, Call of Cthulhu…" value={nome} onChange={e => setNome(e.target.value)} className="campo w-full" />
                </label>
                <label className="block">
                  <span className="rotulo">Descrição <span className="text-ink-dim font-normal">(opcional)</span></span>
                  <input type="text" placeholder="Uma descrição breve do sistema…" value={descricao} onChange={e => setDescricao(e.target.value)} className="campo w-full" />
                </label>
                {!sistemaDB && (
                  <p className="text-ink-dim text-sm">Depois de dar o nome, monte os atributos e salve. Raças, classes, recursos e poderes ficam liberados quando o sistema existir.</p>
                )}
              </div>
            )}

            {secao === 'atributos' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-ink-dim text-sm">{atributos.length ? `${atributos.length} atributo${atributos.length > 1 ? 's' : ''}` : 'Nenhum atributo ainda.'}</p>
                  <Botao variante="primario" onClick={addAtributo}><Icone nome="mais" tamanho={16} /> Adicionar atributo</Botao>
                </div>
                {atributos.length === 0 ? (
                  <EstadoVazio compacto arte="dado" titulo="Nenhum atributo ainda" descricao="Força, Destreza, Sanidade… Cada atributo diz como o valor nasce na ficha.">
                    <Botao variante="primario" onClick={addAtributo}><Icone nome="mais" tamanho={16} /> Adicionar atributo</Botao>
                  </EstadoVazio>
                ) : (
                  <div className="space-y-3">
                    {atributos.map((attr, i) => (
                      <AtributoEditor
                        key={attr.id} atributo={attr} index={i}
                        onChange={updated => updateAtributo(i, updated)}
                        onRemove={() => removeAtributo(i)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {secao === 'ficha' && (
              <LayoutEditor
                config={configLayout} onConfigChange={setConfigLayout}
                pericias={pericias} onAddPericia={addPericia} onUpdatePericia={updatePericia} onRemovePericia={removePericia}
                atributos={atributos} pools={pools}
              />
            )}

            {secao === 'racas' && !precisaSistema && (
              <RacasClassesEditor
                sistemaId={sistemaDB?.id} atributos={atributos}
                camposCombate={configLayout.campos_combate || []} pericias={pericias}
                pontosStatus={configLayout.pontos_status} linhasPoder={linhasPoderSistema}
              />
            )}

            {secao === 'descansos' && (
              <DescansosEditor
                descansos={configLayout.descansos || []}
                onChange={descansos => setConfigLayout(prev => ({ ...prev, descansos }))}
              />
            )}

            {/* Fase 20.1 — pools/recursos gastáveis · Fase 20.3 — slots (modo opcional) */}
            {secao === 'recursos' && !precisaSistema && (
              <div className="space-y-6">
                <PoolsEditor sistemaId={sistemaDB.id} descansos={configLayout.descansos || []} />
                <SlotsEditor sistemaId={sistemaDB.id} config={configLayout} onChange={setConfigLayout} descansos={configLayout.descansos || []} />
              </div>
            )}

            {/* Fase 20.2 — catálogo de poderes */}
            {secao === 'poderes' && !precisaSistema && (
              <div className="space-y-6">
                {/* 20.6 — rótulo do painel na ficha (o mestre nomeia) */}
                <label className="block max-w-md">
                  <span className="rotulo">Nome do painel na ficha</span>
                  <input
                    type="text" value={configLayout.poderes_rotulo || ''}
                    onChange={e => setConfigLayout(prev => ({ ...prev, poderes_rotulo: e.target.value }))}
                    placeholder="Poderes, Magias, Técnicas…" className="campo w-full"
                  />
                </label>
                <LinhasPoderEditor sistemaId={sistemaDB.id} />
                <PoderesEditor sistemaId={sistemaDB.id} />
              </div>
            )}

            {/* Fase 21.1 — maestria por uso + categorias de item */}
            {secao === 'maestria' && !precisaSistema && (
              <MaestriaItensEditor sistemaId={sistemaDB.id} config={configLayout} onChange={setConfigLayout} />
            )}

            {secao === 'simulador' && (
              <SimuladorFicha config={configLayout} atributos={atributos} pericias={pericias} />
            )}
          </div>
        </section>
      </div>

      {/* Barra de alterações: aparece só com algo para salvar e gruda embaixo */}
      {(alteradas.size > 0 || saving || saveError) && (
        <div className="sticky bottom-3 z-20">
          <div className="barra-salvar mx-auto max-w-3xl flex flex-wrap items-center gap-3 rounded-2xl border border-warn/40 bg-raised/95 backdrop-blur-md shadow-nivel-3 px-4 py-3" role="region" aria-label="Alterações não salvas">
            <Icone nome="alerta" tamanho={20} className="text-warn shrink-0" />
            <p className="flex-1 min-w-[12rem] text-sm text-ink">
              {saveError
                ? <span className="text-harm">{saveError}</span>
                : alteradas.size > 0
                  ? <>Alterações não salvas em <strong>{textoAlteradas(alteradas)}</strong>.</>
                  : 'Salvando…'}
            </p>
            {alteradas.size > 0 && <Botao variante="fantasma" onClick={descartar} disabled={saving}>Descartar</Botao>}
            <Botao variante="primario" onClick={handleSave} disabled={saving || alteradas.size === 0}>{saving ? 'Salvando…' : 'Salvar sistema'}</Botao>
          </div>
        </div>
      )}
      {showGuia && <GuiaMestre onFechar={() => setShowGuia(false)} />}
    </div>
  )
}
