import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFicha, useUpdateFicha } from '../hooks/useFicha'
import { useSistema } from '../hooks/useSistema'
import { useRolagem } from '../hooks/useRolagem'
import { supabase } from '../lib/supabase'
import { mergeConfigLayout } from '../lib/sistemaDefaults'
import { coletarModificadores, calcularValoresFinais, agregarDefesas, listarCondicoesManuais, resolverValoresFormula } from '../lib/modifierEngine'
import { validarNotacao, rolarNotacao, resolverNotacaoFormula } from '../lib/diceNotation'
import { avaliarFormula } from '../lib/formulaEngine'
import { useHabilidadesFicha } from '../hooks/useHabilidadesFicha'
import { useClassesFicha } from '../hooks/useClassesFicha'
import { nivelTotalDe } from '../components/ficha/layout/ClassesFicha'
import { modoProgressao } from '../lib/progressaoEngine'
import { resolverFaixas } from '../lib/faixas'
import { bloqueadosPorNivel } from '../lib/requisitos'
import { recompensasAoSubir } from '../lib/recompensas'
import { useRecompensas, useRecompensasFicha } from '../hooks/useRecompensas'
import PainelRecompensas from '../components/ficha/PainelRecompensas'
import { calcularMaximos, mapaPools, atualDePool } from '../lib/poolEngine'
import { usePools, usePoolsFicha } from '../hooks/usePools'
import { useTrilhasFicha } from '../hooks/useTrilhasFicha'
import { useEstadosFicha } from '../hooks/useEstadosFicha'
import { recuperarTrilha } from '../lib/trackEngine'
import { modificadoresDeEstados, mapaEstados, especiaisDeEstados, clampEstado } from '../lib/estadosEngine'
import PainelTrilhas from '../components/ficha/PainelTrilhas'
import PainelEstados from '../components/ficha/PainelEstados'
import PainelXpDireto from '../components/ficha/PainelXpDireto'
import { useXpLog } from '../hooks/useXpLog'
import { usePericiasFicha } from '../hooks/usePericiasFicha'
import { registroDeCompra } from '../lib/purchaseEngine'
import PainelPools from '../components/ficha/PainelPools'
import { slotsTotais, usadosPorCirculo, slotsAtivos, gastarSlot } from '../lib/slotsEngine'
import { useSlotsFicha } from '../hooks/useSlotsFicha'
import PainelSlots from '../components/ficha/PainelSlots'
import { podeUsarPoder, montarNotacaoUso, custoDeSlot, frasesDeUso } from '../lib/poderes'
import { usePoderes } from '../hooks/usePoderes'
import { usePoderesFicha } from '../hooks/usePoderesFicha'
import { useLinhasPoder, useLinhasFicha } from '../hooks/useLinhasPoder'
import PainelPoderes from '../components/ficha/PainelPoderes'
import PainelLinhas from '../components/ficha/PainelLinhas'
import { podeAtivarHabilidade, planejarTurno } from '../lib/custoHabilidade'
import { useCategorias } from '../hooks/useCategorias'
import { useMaestrias } from '../hooks/useMaestrias'
import { usePropriedades } from '../hooks/usePropriedades'
import { bonusMaestria } from '../lib/masteryEngine'
import { useItens } from '../hooks/useItens'
import PainelMaestrias from '../components/ficha/PainelMaestrias'
import PainelCarteira from '../components/ficha/PainelCarteira'
import { usePontosStatus } from '../hooks/usePontosStatus'
import PainelPontos from '../components/ficha/PainelPontos'
import { inicialDaRaca, ganhoPorNivelDaRaca, ehRolado, notacaoDoGanho, avaliarGanho } from '../lib/pontosEngine'
import BarraXp from '../components/ficha/BarraXp'
import { useCondicoesManuais } from '../hooks/useCondicoesManuais'
import DescansoBar from '../components/ficha/DescansoBar'
import CabecalhoPersonagem from '../components/ficha/layout/CabecalhoPersonagem'
import FaixaAtributos from '../components/ficha/layout/FaixaAtributos'
import PainelCombate from '../components/ficha/layout/PainelCombate'
import PainelPericias from '../components/ficha/layout/PainelPericias'
import PainelProficiencias from '../components/ficha/layout/PainelProficiencias'
import PainelDefesas from '../components/ficha/layout/PainelDefesas'
import PainelImagens from '../components/ficha/layout/PainelImagens'
import AbasCentrais from '../components/ficha/layout/AbasCentrais'

export default function FichaPage() {
  const { id: mesaId, fichaId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()

  const { ficha, valoresAtributos, loading, error, refetch } = useFicha(fichaId)
  const { sistema, pericias: periciasDoSistema, racas, classes, habilidades } = useSistema(mesaId)
  const { updateValorAtributo, updateFicha } = useUpdateFicha()
  const { registrarRolagem, registrarResolvida, registrarEvento } = useRolagem()
  const {
    habilidadesFicha,
    toggleHabilidade,
    adicionarHabilidade,
    removerHabilidade,
    ajustarRecurso,
    sincronizarOrigem,
    sincronizarClasses,
    recuperarRecursos,
    definirRecurso,
  } = useHabilidadesFicha(fichaId, habilidades)
  const {
    classesFicha,
    adicionarClasse,
    removerClasse,
    definirNivel,
  } = useClassesFicha(fichaId, classes)
  const { condicoesManuais, toggleCondicao } = useCondicoesManuais(fichaId)
  // 19.6 — catálogo do sistema + checklist da ficha
  const { recompensas } = useRecompensas(sistema?.id)
  const { recompensasFicha, gerarPendencias, marcarConcluida } = useRecompensasFicha(fichaId)
  // 20.1 — pools do sistema + estado na ficha
  const { pools } = usePools(sistema?.id)
  const { linhasPools, definirAtual } = usePoolsFicha(fichaId)
  const { marcasDe, salvarMarcas, bonusDe, salvarBonus } = useTrilhasFicha(fichaId) // 24.2/25.2
  const { valores: valoresEstados, definirValor: definirEstado } = useEstadosFicha(fichaId) // 24.4
  const { log: xpLog, inserir: inserirXpLog } = useXpLog(fichaId) // 25.2
  const { periciasFicha: periciasFichaPage, savePericia: savePericiaPage } = usePericiasFicha(fichaId) // 25.2 — alvo de compra
  const [periciasKey, setPericiasKey] = useState(0) // remonta o painel após compra
  // 20.3 — slots (modo opcional): só `usados` é armazenado
  const { linhasSlots, definirUsados } = useSlotsFicha(fichaId)
  // 21.1 — categorias de item (dropdown no inventário)
  const { categorias } = useCategorias(sistema?.id)
  // 21.3 — maestrias da ficha (nível derivado da curva do sistema)
  const maestriaCfg = mergeConfigLayout(sistema?.config_layout).maestria
  const { linhasMaestria, ganharXp } = useMaestrias(fichaId, maestriaCfg?.curva)
  const { itens: itensFicha } = useItens(fichaId)
  // 21.4 — propriedades desbloqueáveis do sistema
  const { propriedades: propriedadesSistema } = usePropriedades(sistema?.id)
  // 22.2 — pontos de status (pool + histórico)
  const { disponiveis: pontosDisp, log: pontosLog, jaRecebeuInicial, registrar: registrarPontos } = usePontosStatus(fichaId)
  // 20.4 — catálogo de poderes + poderes da ficha
  const { poderes: catalogoPoderes } = usePoderes(sistema?.id)
  const { linhas: linhasPoderSistema } = useLinhasPoder(sistema?.id)
  const { ratingDe, definirRating } = useLinhasFicha(fichaId)
  const {
    poderesFicha, aprenderPoder, esquecerPoder, definirPreparado, sincronizarPoderesClasses,
  } = usePoderesFicha(fichaId, catalogoPoderes)

  // Estado local de raça/classe para recálculo imediato sem esperar refetch
  const [racaId, setRacaId] = useState(null)
  const [classeId, setClasseId] = useState(null)

  useEffect(() => {
    if (ficha?.id) {
      setRacaId(ficha.raca_id || null)
      setClasseId(ficha.classe_id || null)
    }
  }, [ficha?.id])

  // Fase 19.1 — mantém o cache derivado em sincronia: fichas.nivel = soma dos
  // níveis de classe; fichas.classe_id = classe primária (ordem 0). Só o dono
  // escreve, e só quando há classes_ficha (fichas ainda não migradas ficam no
  // fallback legado, sem escrita). Guarda por igualdade evita loop de update.
  const somaNiveis = classesFicha.reduce((s, cf) => s + (Number(cf.nivel) || 0), 0)
  const classePrimaria = classesFicha[0]?.classe_id || null
  useEffect(() => {
    if (!ficha) return
    const dono = ficha.dono_id === session?.user?.id
    if (!dono || classesFicha.length === 0) return
    if (somaNiveis === (ficha.nivel ?? null) && classePrimaria === (ficha.classe_id ?? null)) return
    updateFicha(fichaId, { nivel: somaNiveis, classe_id: classePrimaria }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [somaNiveis, classePrimaria, ficha?.id, classesFicha.length])

  // 19.3 — gestor da mesa (criador ou co-mestre) também pode dar XP
  const [souGestor, setSouGestor] = useState(false)
  useEffect(() => {
    if (!mesaId || !session?.user?.id) return
    let cancelado = false
    ;(async () => {
      try {
        const { data: mesaData } = await supabase
          .from('mesas').select('criador_id').eq('id', mesaId).maybeSingle()
        let gestor = mesaData?.criador_id === session.user.id
        if (!gestor) {
          const { data: membro } = await supabase
            .from('membros_mesa').select('role')
            .eq('mesa_id', mesaId).eq('usuario_id', session.user.id).maybeSingle()
          gestor = membro?.role === 'co-mestre'
        }
        if (!cancelado) setSouGestor(gestor)
      } catch { /* sem permissão de gestor — segue como jogador */ }
    })()
    return () => { cancelado = true }
  }, [mesaId, session?.user?.id])

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleDeleteFicha() {
    setDeleting(true)
    setDeleteError('')
    try {
      const { error: err } = await supabase.from('fichas').delete().eq('id', fichaId)
      if (err) throw err
      navigate(`/mesa/${mesaId}`)
    } catch (err) {
      setDeleteError(err.message || 'Erro ao deletar ficha.')
      setDeleting(false)
    }
  }

  async function handleSaveValor(atributoId, valor, dadosRolados) {
    await updateValorAtributo(fichaId, atributoId, valor, dadosRolados)
    refetch()
  }

  async function handleRacaChange(id) {
    setRacaId(id || null)
    await sincronizarOrigem('raca', id || null)
    try { await updateFicha(fichaId, { raca_id: id || null }) } catch {}
  }

  // 19.5 — contexto de nível derivado de uma lista de classes (para o requisito)
  function ctxNivel(lista) {
    const niveisClasse = {}
    for (const cf of lista) {
      const n = Number(cf.nivel) || 0
      if (cf.classe_id) niveisClasse[cf.classe_id] = n
      if (cf.classe?.nome) niveisClasse[cf.classe.nome] = n
    }
    return { nivel: lista.reduce((s, cf) => s + (Number(cf.nivel) || 0), 0), niveisClasse }
  }

  // Fase 19.1 — multiclasse: adicionar/remover classe re-sincroniza as
  // habilidades auto-concedidas contra o CONJUNTO de classes; o cache de nível
  // é atualizado pelo efeito acima.
  // Fase 19.5 — a sincronização também roda ao mudar de nível: o que destrava
  // entra sozinho, o que deixa de atender ao requisito sai.
  async function handleAddClasse(classeId) {
    try {
      await adicionarClasse(classeId)
      const novas = [...classesFicha, { classe_id: classeId, nivel: 1, classe: classes.find(c => c.id === classeId) }]
      await sincronizarClasses(novas.map(cf => cf.classe_id), ctxNivel(novas))
      await sincronizarPoderesClasses(novas.map(cf => cf.classe_id), ctxNivel(novas))
      // 19.6 — entrar numa classe já concede as recompensas de nível 1 dela
      await gerarRecompensas(classeId, 1, ctxNivel(novas).nivel)
    } catch {}
  }

  async function handleRemoveClasse(rowId, classeId) {
    try {
      await removerClasse(rowId)
      const novas = classesFicha.filter(cf => cf.classe_id !== classeId)
      await sincronizarClasses(novas.map(cf => cf.classe_id), ctxNivel(novas))
      await sincronizarPoderesClasses(novas.map(cf => cf.classe_id), ctxNivel(novas))
    } catch {}
  }

  async function handleSetNivel(rowId, nivel) {
    await definirNivel(rowId, nivel)
    const n = Math.max(1, Math.floor(Number(nivel) || 1))
    const novas = classesFicha.map(cf => (cf.id === rowId ? { ...cf, nivel: n } : cf))
    await sincronizarClasses(novas.map(cf => cf.classe_id), ctxNivel(novas))
    await sincronizarPoderesClasses(novas.map(cf => cf.classe_id), ctxNivel(novas))
  }

  // 19.3 — XP passa por RPC SECURITY DEFINER (dono ou gestor); erro sobe p/ a UI.
  async function handleAddXp(delta) {
    const { error: err } = await supabase.rpc('adicionar_xp', {
      p_ficha_id: fichaId,
      p_delta: delta,
    })
    if (err) throw new Error(err.message)
    refetch()
  }

  // 19.3 — subir de nível: manual, confirmado, e o jogador escolhe a classe.
  // O cache fichas.nivel é atualizado pelo efeito; as fórmulas recalculam sozinhas.
  // (as recompensas pendentes daquele nível entram na 19.6, quando as tabelas existirem)
  async function handleSubirNivel(rowId) {
    if (rowId) {
      const cf = classesFicha.find(c => c.id === rowId)
      const novo = (Number(cf?.nivel) || 1) + 1
      await definirNivel(rowId, novo)
      // 19.5 — habilidades destravadas pelo novo nível entram automaticamente
      const novas = classesFicha.map(c => (c.id === rowId ? { ...c, nivel: novo } : c))
      const total = ctxNivel(novas).nivel
      await sincronizarClasses(novas.map(c => c.classe_id), ctxNivel(novas))
      // 20.4 — poderes de classe destravados pelo novo nível entram sozinhos
      await sincronizarPoderesClasses(novas.map(c => c.classe_id), ctxNivel(novas))
      // 19.6 — recompensas daquele nível (da classe escolhida + do nível total)
      await gerarRecompensas(cf?.classe_id ?? null, novo, total)
      await anunciarNivel(total, cf?.classe?.nome ? `${cf.classe.nome} ${novo}` : null)
      await creditarPontosNivel(total) // 22.2
      return total
    }
    // Sistema sem classes estruturadas: o nível vive só em fichas.nivel
    const total = nivelTotalAtual() + 1
    await updateFicha(fichaId, { nivel: total })
    await gerarRecompensas(null, 0, total)
    await anunciarNivel(total, null)
    await creditarPontosNivel(total) // 22.2
    refetch()
    return total
  }

  // 22.2 — ao subir de nível, rola/resolve o ganho de pontos e credita + loga.
  // Função declarada (hoisted) — usa config/racaAtiva/contextoFormula do render.
  async function creditarPontosNivel(nivel) {
    const ps = config?.pontos_status
    if (!ps?.ativo) return
    const expr = ganhoPorNivelDaRaca(ps, racaAtiva)
    if (!String(expr || '').trim()) return
    try {
      if (ehRolado(expr)) {
        const nota = notacaoDoGanho(expr, contextoFormula)
        const r = rolarNotacao(nota)
        await registrarPontos({ delta: r.total, tipo: 'ganho_nivel', detalhe: { rolagem: nota, resultado: r.total, nivel } })
        await registrarEvento({ mesaId, fichaId, rotulo: `${ficha.nome_personagem} ganhou ${r.total} ${ps.rotulo || 'pontos'} (${nota})`, notacao: nota, total: r.total, dados: r.dados })
      } else {
        const v = avaliarGanho(expr, contextoFormula)
        await registrarPontos({ delta: v, tipo: 'ganho_nivel', detalhe: { valor: v, nivel } })
      }
    } catch { /* não bloqueia o level-up */ }
  }

  // 19.7 — o feed da mesa anuncia a subida de nível (o ganho de XP é silencioso)
  async function anunciarNivel(nivelNovo, detalheClasse) {
    try {
      await registrarEvento({
        mesaId,
        fichaId,
        rotulo: `${ficha.nome_personagem} subiu para o nível ${nivelNovo}!${detalheClasse ? ` (${detalheClasse})` : ''}`,
        notacao: '',
        total: nivelNovo,
        dados: [],
      })
    } catch { /* o level-up não depende do feed */ }
  }

  // 19.6 — as recompensas são checklist-guia: só viram pendência, nada é aplicado.
  async function gerarRecompensas(classeId, nivelClasse, nivelTotal) {
    try {
      const novas = recompensasAoSubir(recompensas, { classeId, nivelClasse, nivelTotal })
      await gerarPendencias(novas)
    } catch { /* não impede o level-up */ }
  }

  // nível total sem depender do render (usado antes das consts do corpo)
  function nivelTotalAtual() {
    return classesFicha.length ? nivelTotalDe(classesFicha) : (ficha?.nivel ?? 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-black">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-purple-400 text-sm">Carregando ficha...</p>
        </div>
      </div>
    )
  }

  if (error || !ficha) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-black">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Ficha não encontrada.'}</p>
          <button
            onClick={() => navigate(`/mesa/${mesaId}`)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Voltar à mesa
          </button>
        </div>
      </div>
    )
  }

  const isDono = ficha.dono_id === session?.user?.id
  const config = sistema?.config_layout ? mergeConfigLayout(sistema.config_layout) : mergeConfigLayout(null)
  const secoes = config.secoes
  const camposCombate = config.campos_combate || []
  const rotuloVida = config.rotulo_vida || 'Pontos de Vida'
  const dadoPadrao = config.dado_padrao || 20

  // Motor de modificadores
  const racaAtiva = racas.find(r => r.id === racaId) || null
  const classeAtiva = classes.find(c => c.id === classeId) || null
  // Fase 19.1 — classes ativas: multiclasse (classes_ficha) quando houver; senão
  // fallback legado (uma única classe via classe_id), sem mudar comportamento.
  const classesAtivas = classesFicha.length
    ? classesFicha.filter(cf => cf.classe).map(cf => cf.classe)
    : (classeAtiva ? [classeAtiva] : [])
  // Nível total = soma das classes (fonte de verdade); fallback = ficha.nivel legado.
  const nivelTotal = classesFicha.length ? nivelTotalDe(classesFicha) : (ficha.nivel ?? 1)
  // 19.2 — mapa p/ nivel(classe): por id E por nome (fallback legado quando não migrada)
  const niveisClasse = {}
  if (classesFicha.length) {
    classesFicha.forEach(cf => {
      const n = Number(cf.nivel) || 0
      if (cf.classe_id) niveisClasse[cf.classe_id] = n
      if (cf.classe?.nome) niveisClasse[cf.classe.nome] = n
    })
  } else if (classeAtiva) {
    const n = ficha.nivel ?? 1
    niveisClasse[classeAtiva.id] = n
    if (classeAtiva.nome) niveisClasse[classeAtiva.nome] = n
  }
  const formulaProficiencia = config.formula_proficiencia || ''

  // Estado da ficha para condições automáticas (Fase 12). Usa vida_max BASE
  // (hp_maximo) no cálculo de % para evitar dependência circular com o motor.
  const habilidadesAtivasIds = new Set(
    habilidadesFicha
      .filter(hf => hf.habilidade && (hf.habilidade.tipo === 'passiva' || hf.ativa === true))
      .map(hf => hf.habilidade.id)
  )
  const estadoFicha = {
    vida_atual: ficha.hp_atual ?? 0,
    vida_max: ficha.hp_maximo ?? 0,
    nivel: nivelTotal,
    niveisClasse, // 19.5 — requisito medido pelo nível da classe de origem
    habilidadesAtivas: habilidadesAtivasIds,
  }
  // 17.5 — contexto p/ fórmulas de MODIFICADOR (sem atributos → anti-auto-referência)
  const recursosCtx = {}
  habilidadesFicha.forEach(hf => {
    const h = hf.habilidade
    if (h?.recurso_max != null) {
      const v = hf.recurso_atual ?? h.recurso_max
      if (h.recurso_nome) recursosCtx[h.recurso_nome] = v
      if (h.id) recursosCtx[h.id] = v
    }
  })
  // 20.1 — os máximos de pool são DERIVADOS (nunca armazenados). Calculados com os
  // atributos BASE: um máximo pode usar atributo() e um modificador pode usar pool(),
  // então usar os atributos finais fecharia um ciclo. Mesmo precedente do estadoFicha,
  // que já usa a vida BASE pelo mesmo motivo.
  const atributosBase = {}
  valoresAtributos.forEach(va => {
    if (!va.atributo?.id) return
    const v = va.valor ?? 0
    atributosBase[va.atributo.id] = v
    if (va.atributo.nome) atributosBase[va.atributo.nome] = v
  })
  const ctxPools = {
    atributos: atributosBase,
    nivel: nivelTotal,
    niveisClasse,
    formula_proficiencia: formulaProficiencia,
    formulaModificador: config.formula_modificador || '',
    vida_atual: ficha.hp_atual ?? 0,
    vida_max: ficha.hp_maximo ?? 0,
    recursos: recursosCtx,
    pericias: {},
  }
  const { maximos: maximosPools, erros: errosPools } = calcularMaximos(pools, ctxPools)
  const poolsMap = mapaPools(pools, linhasPools, maximosPools)
  const atualDoPool = poolId =>
    atualDePool(linhasPools.find(l => l.pool_id === poolId), maximosPools[poolId] ?? 0)

  // 23.4 — bundle de rerolagem: config + pool escolhido (atual/máx) + débito
  const rerolCfg = config.resolucao?.rerolagem
  const rerolagem = rerolCfg?.ativo && rerolCfg.pool_id
    ? {
        config: rerolCfg,
        pool: pools.find(p => p.id === rerolCfg.pool_id) || null,
        atual: atualDoPool(rerolCfg.pool_id),
        maximo: maximosPools[rerolCfg.pool_id] ?? 0,
        gastar: qtd => definirAtual(rerolCfg.pool_id, Math.max(0, atualDoPool(rerolCfg.pool_id) - qtd)),
      }
    : null

  // 20.3 — totais de slot DERIVADOS da grade × classes da ficha (nunca armazenados)
  const fonteClasses = classesFicha.length
    ? classesFicha
    : (classeAtiva ? [{ classe_id: classeAtiva.id, nivel: nivelTotal }] : [])
  const totaisSlots = slotsTotais(config, fonteClasses)
  const usadosSlots = usadosPorCirculo(linhasSlots)

  const ctxModificador = {
    nivel: nivelTotal,
    niveisClasse,
    formula_proficiencia: formulaProficiencia,
    pools: poolsMap, // 20.1 — pool(nome) = valor atual
    vida_atual: ficha.hp_atual ?? 0,
    vida_max: ficha.hp_maximo ?? 0,
    recursos: recursosCtx,
    pericias: {},
    formulaModificador: config.formula_modificador || '',
  }
  // 19.4 — a faixa ativa é escolhida ANTES de resolver fórmulas: o valor da
  // faixa ainda pode ser fórmula (ou notação de dado, que passa direto).
  // 24.4 — efeitos dos ESTADOS entram no MESMO pipeline (sem segundo mecanismo):
  // a faixa ativa do estado só seleciona; a aplicação é a F12/18 normal.
  const modificadoresAtivos = resolverValoresFormula(
    resolverFaixas(
      [
        ...coletarModificadores({
          raca: racaAtiva,
          classes: classesAtivas,
          habilidadesFicha,
          itens: itensFicha, // 21 — itens equipados como fonte de modificador
          estadoFicha,
          condicoesManuais,
        }),
        ...modificadoresDeEstados(config.estados || [], valoresEstados),
      ],
      ctxModificador
    ),
    ctxModificador
  )
  // 19.5 — habilidades das classes/raça da ficha que ainda não atingiram o
  // requisito: aparecem bloqueadas, para o jogador planejar a progressão.
  const habilidadesBloqueadas = bloqueadosPorNivel(
    (habilidades || []).filter(h =>
      (h.classe_id && classesAtivas.some(c => c.id === h.classe_id)) ||
      (h.raca_id && racaAtiva?.id === h.raca_id)
    ),
    estadoFicha
  )

  // 12.6 — interruptores situacionais: todos os mods de condição manual em jogo
  const condicoesManuaisDisponiveis = listarCondicoesManuais({
    raca: racaAtiva,
    classes: classesAtivas,
    habilidadesFicha,
    itens: itensFicha, // 21
    estadoFicha, // 19.5 — não oferece interruptor de efeito ainda bloqueado
  })
  const baseMotor = {
    atributos: Object.fromEntries(
      valoresAtributos.filter(va => va.atributo?.id).map(va => [va.atributo.id, va.valor ?? 0])
    ),
    vida_max: ficha.hp_maximo ?? 0,
    combate: {},
  }
  const valoresFinais = calcularValoresFinais(baseMotor, modificadoresAtivos)
  const defesas = agregarDefesas(modificadoresAtivos)

  // 12.7 — mapa id→nome para resumos legíveis (atributos, perícias, combate)
  const nomesAlvos = {}
  valoresAtributos.forEach(va => { if (va.atributo?.id) nomesAlvos[va.atributo.id] = va.atributo.nome })
  ;(periciasDoSistema || []).forEach(p => { if (p?.id) nomesAlvos[p.id] = p.nome })
  ;(camposCombate || []).forEach(c => { if (c?.id) nomesAlvos[c.id] = c.nome })
  // 19.4 — classes entram no mapa p/ o rótulo "faixa 9–15, nível de Bárbaro 9"
  ;(classes || []).forEach(c => { if (c?.id) nomesAlvos[c.id] = c.nome })

  // 17.3 — contexto de fórmula (atributos FINAIS por id e por nome) + fórmula do modificador
  const formulaModificador = config.formula_modificador || ''
  const atributosCtx = {}
  valoresAtributos.forEach(va => {
    if (!va.atributo?.id) return
    const vf = valoresFinais.atributos[va.atributo.id]
    const val = vf !== undefined ? vf : (va.valor ?? 0)
    atributosCtx[va.atributo.id] = val
    if (va.atributo.nome) atributosCtx[va.atributo.nome] = val
  })
  const contextoFormula = {
    atributos: atributosCtx,
    formulaModificador,
    nivel: nivelTotal,
    niveisClasse,
    formula_proficiencia: formulaProficiencia,
    pools: poolsMap, // 20.1
    vida_atual: ficha.hp_atual ?? 0,
    vida_max: valoresFinais.vida_max ?? ficha.hp_maximo ?? 0,
    pericias: {},
    recursos: {},
    estados: mapaEstados(config.estados || [], valoresEstados), // 24.4 — estado(x)
  }

  // 23.5/24.4 — quantidade de dados especiais (ex: Fome): um estado com
  // alimenta_dados_especiais manda; senão, a fórmula da config F23.
  const dadosEspCfg = config.resolucao?.dados_especiais
  let especiaisQtd = 0
  if (dadosEspCfg?.ativo) {
    const doEstado = especiaisDeEstados(config.estados || [], valoresEstados)
    if (doEstado != null) {
      especiaisQtd = doEstado
    } else if (String(dadosEspCfg.quantidade_formula || '').trim()) {
      try { especiaisQtd = Math.max(0, Math.floor(avaliarFormula(dadosEspCfg.quantidade_formula, contextoFormula) || 0)) }
      catch { especiaisQtd = 0 }
    }
  }

  // 20.4 — tudo que o motor precisa para decidir se um poder pode ser usado
  const poolsPorId = Object.fromEntries(pools.map(p => [p.id, p]))
  const estadoPoderes = {
    totaisSlots,
    usadosSlots,
    atualDoPool,
    poolsPorId,
    contexto: contextoFormula,
  }
  const classesIds = new Set(fonteClasses.map(c => c.classe_id).filter(Boolean))

  // 12.4 — usa um efeito pontual (cura ou vida_temp_acao) de uma habilidade:
  // rola se for notação, aplica à vida e registra no feed.
  async function handleUsarAcao(mod, nomeHab) {
    const valorStr = (mod.valor ?? '').toString().trim()
    let total = 0
    let dados = []
    if (valorStr && /\dd\d/i.test(valorStr) && validarNotacao(valorStr)) {
      const r = rolarNotacao(valorStr)
      total = r.total
      dados = r.dados
    } else {
      total = Number(valorStr) || 0
    }
    if (total <= 0) return

    try {
      if (mod.tipo === 'cura') {
        const max = valoresFinais.vida_max || ficha.hp_maximo || 0
        const atual = ficha.hp_atual ?? 0
        const novo = max > 0 ? Math.min(max, atual + total) : atual + total
        await updateFicha(fichaId, { hp_atual: novo })
      } else if (mod.tipo === 'vida_temp_acao') {
        // Vida temporária não acumula: fica a maior
        const novoTemp = Math.max(ficha.vida_temp_atual ?? 0, total)
        await updateFicha(fichaId, { vida_temp_atual: novoTemp })
      }
      await registrarEvento({
        mesaId,
        fichaId,
        rotulo: `${mod.tipo === 'cura' ? 'Cura' : 'Vida temporária'} — ${nomeHab}`,
        notacao: dados.length ? valorStr : '',
        total,
        dados,
      })
      refetch()
    } catch {
      // erro silenciado — a vida não muda se falhar
    }
  }

  // 15.3 — aplica um descanso (calculado no DescansoBar) à ficha e recursos
  async function handleAplicarDescanso(tipo, resultado) {
    const patch = { hp_atual: resultado.vida.para }
    if (resultado.vida_temp.para !== resultado.vida_temp.de) patch.vida_temp_atual = resultado.vida_temp.para
    try {
      await updateFicha(fichaId, patch)
      for (const r of resultado.recursos) {
        await definirRecurso(r.habilidadeFichaId, r.para)
      }
      // 20.1 — pools recuperados pelo descanso
      for (const p of resultado.pools || []) {
        await definirAtual(p.poolId, p.para)
      }
      // 20.3 — slots devolvidos pelo descanso
      for (const s of resultado.slots || []) {
        await definirUsados(s.circulo, s.para)
      }
      // 24.2 — trilhas curadas pelo descanso (por tipo de marca, conforme a config)
      for (const t of config.trilhas || []) {
        const atuais = marcasDe(t.id)
        if (!atuais) continue
        const r = recuperarTrilha(atuais, t, tipo.id)
        if (Object.keys(r.curadas).length > 0) {
          try { await salvarMarcas(t.id, r.marcas) } catch { /* segue */ }
        }
      }
      try {
        await supabase.from('descansos_log').insert({
          ficha_id: fichaId,
          sessao_id: null,
          tipo_descanso: tipo.nome,
          recuperado: { vida: resultado.vida.recuperado, recursos: resultado.recursos },
        })
      } catch { /* tabela de log é opcional */ }
      await registrarEvento({
        mesaId,
        fichaId,
        rotulo: `${tipo.nome} — ${ficha.nome_personagem}`,
        notacao: resultado.vida.notacao || '',
        total: resultado.vida.recuperado,
        dados: resultado.vida.dados || [],
      })
      refetch()
    } catch { /* falha silenciada — não quebra a ficha */ }
  }

  // 24.4 — muda o valor de um estado (clamp no motor); feed opcional por estado
  async function handleSetEstado(cfg, novoValor) {
    const v = clampEstado(novoValor, cfg)
    try {
      await definirEstado(cfg.id, v)
      if (cfg.feed !== false) {
        await registrarEvento({
          mesaId, fichaId,
          rotulo: `${ficha.nome_personagem} — ${cfg.nome}: ${v}`,
          notacao: '', total: v, dados: [],
        })
      }
    } catch { /* upsert reverte sozinho */ }
  }

  // ---- Fase 25.2 — progressão por XP direto ----
  // Alvos compráveis de uma categoria: { id, nome, valor ATUAL, fora? }.
  // Linhas de poder entram na 25.3 (o painel avisa "nenhum alvo" até lá).
  function alvosCompraDe(categoria) {
    switch (categoria.alvo) {
      case 'atributo':
        return valoresAtributos
          .filter(va => va.atributo?.id)
          .map(va => ({ id: va.atributo.id, nome: va.atributo.nome, valor: Math.floor(Number(va.valor) || 0) }))
      case 'pericia':
        return (periciasDoSistema || []).map(p => ({
          id: p.id, nome: p.nome,
          valor: Math.floor(Number(periciasFichaPage.find(x => x.pericia_id === p.id)?.bonus) || 0),
        }))
      case 'trilha_tamanho_bonus':
        return (config.trilhas || []).map(t => ({ id: t.id, nome: t.nome, valor: bonusDe(t.id) }))
      case 'linha_poder': {
        const nativas = new Set([
          ...(racaAtiva?.linhas_nativas || []),
          ...classesAtivas.flatMap(c => c?.linhas_nativas || []),
        ])
        return linhasPoderSistema.map(l => ({
          id: l.id, nome: l.nome, valor: ratingDe(l.id), fora: !nativas.has(l.id),
        }))
      }
      default:
        return []
    }
  }

  // Mestre/dono concede XP com motivo: RPC da F19 (SECURITY DEFINER) + log
  async function handleConcederXp(quantidade, motivo) {
    await handleAddXp(quantidade)
    await inserirXpLog({ tipo: 'ganho', quantidade, detalhe: { motivo: motivo || null } })
  }

  // Compra (contrato 25.1): +1 no alvo, débito via RPC, log e feed — nessa ordem
  // de segurança: só debita depois de aplicar o +1 com sucesso.
  // 25.3c — muda o rating de uma linha; se auto_conceder, aprende automaticamente
  // os poderes dos níveis alcançados que a ficha ainda não conhece.
  async function handleDefinirRatingLinha(linhaId, novoValor) {
    await definirRating(linhaId, novoValor)
    const linha = linhasPoderSistema.find(l => l.id === linhaId)
    if (!linha?.auto_conceder) return
    const jaTem = new Set(poderesFicha.map(l => l.poder_id))
    const paraAprender = catalogoPoderes.filter(p =>
      p.linha_id === linhaId && (p.nivel_linha ?? 0) <= novoValor && !jaTem.has(p.id)
    )
    for (const p of paraAprender) {
      try { await aprenderPoder(p.id, 'linha') } catch { /* segue */ }
    }
  }

  async function handleComprarXp(categoria, alvo, validacao) {
    const { custo, novoValor } = validacao
    if (categoria.alvo === 'atributo') {
      await handleSaveValor(alvo.id, novoValor, null)
    } else if (categoria.alvo === 'pericia') {
      const atual = periciasFichaPage.find(x => x.pericia_id === alvo.id)
      await savePericiaPage(alvo.id, { proficiente: atual?.proficiente ?? false, bonus: novoValor })
      setPericiasKey(k => k + 1) // remonta o painel de perícias (instância própria)
    } else if (categoria.alvo === 'trilha_tamanho_bonus') {
      await salvarBonus(alvo.id, novoValor)
    } else if (categoria.alvo === 'linha_poder') {
      await handleDefinirRatingLinha(alvo.id, novoValor)
    } else {
      throw new Error('Categoria de compra desconhecida: ' + categoria.alvo)
    }
    await handleAddXp(-custo)
    await inserirXpLog(registroDeCompra(categoria, alvo.id, alvo.valor, custo))
    await registrarEvento({
      mesaId, fichaId,
      rotulo: `${ficha.nome_personagem} subiu ${alvo.nome} para ${novoValor} — ${custo} XP`,
      notacao: '', total: custo, dados: [],
    })
    refetch()
  }

  // 24.2 — eventos de trilha (encheu do maior / transbordo) anunciados no feed
  async function handleEventosTrilha(t, eventos) {
    if (t.feed === false) return
    if (eventos.includes('encheu_do_maior') && t.ao_encher_do_maior?.rotulo) {
      await registrarEvento({
        mesaId, fichaId,
        rotulo: `${ficha.nome_personagem} — ${t.ao_encher_do_maior.rotulo}! (${t.nome} cheia)`,
        notacao: '', total: 0, dados: [],
      })
    } else if (eventos.includes('transbordo_convertido')) {
      await registrarEvento({
        mesaId, fichaId,
        rotulo: `${ficha.nome_personagem} — ${t.nome}: dano transbordou (marca agravada)`,
        notacao: '', total: 0, dados: [],
      })
    }
  }

  // 21.3 — credita XP de maestria; ao subir de nível, anuncia no feed
  async function handleGanharMaestria(alvo, delta, nome) {
    try {
      const r = await ganharXp(alvo, delta)
      if (r.subiu) {
        await registrarEvento({
          mesaId, fichaId,
          rotulo: `${ficha.nome_personagem} — Maestria em ${nome} subiu para ${r.nivel}!`,
          notacao: '', total: r.nivel, dados: [],
        })
      }
    } catch { /* erro silenciado — o valor local reverte no hook */ }
  }

  // 22.2 — receber os pontos iniciais (rola se for notação; feed)
  async function handleReceberInicial() {
    const ps = config.pontos_status
    const expr = inicialDaRaca(ps, racaAtiva)
    if (ehRolado(expr)) {
      const nota = notacaoDoGanho(expr, contextoFormula)
      const r = rolarNotacao(nota)
      await registrarPontos({ delta: r.total, tipo: 'ganho_inicial', detalhe: { rolagem: nota, resultado: r.total } })
      try { await registrarEvento({ mesaId, fichaId, rotulo: `${ficha.nome_personagem} — ${ps.rotulo || 'pontos'} iniciais: ${r.total} (${nota})`, notacao: nota, total: r.total, dados: r.dados }) } catch {}
    } else {
      const v = avaliarGanho(expr, contextoFormula)
      await registrarPontos({ delta: v, tipo: 'ganho_inicial', detalhe: { valor: v } })
    }
  }

  // 22.2 — distribuir: aplica os deltas nos atributos e debita o pool (gasto)
  async function handleDistribuirPontos(dist, custo) {
    for (const [attrId, delta] of Object.entries(dist)) {
      const d = Math.floor(Number(delta) || 0)
      if (d <= 0) continue
      const va = valoresAtributos.find(v => v.atributo?.id === attrId)
      const base = va?.valor ?? 0
      await updateValorAtributo(fichaId, attrId, base + d, va?.dados_rolados)
    }
    await registrarPontos({ delta: -custo, tipo: 'gasto', detalhe: { distribuicao: dist } })
    refetch()
  }

  // 22.2 — ajuste do mestre (com motivo, registrado no log)
  async function handleAjustarPontos(quantidade, motivo) {
    await registrarPontos({ delta: quantidade, tipo: 'ajuste', detalhe: { motivo: (motivo || '').trim() || null } })
  }

  // 20.1 — rolagem de um pool de DADOS vai ao feed
  async function handleRolagemPool({ pool, notacao, total, dados }) {
    try {
      await registrarEvento({
        mesaId,
        fichaId,
        rotulo: `${pool.nome} — ${ficha.nome_personagem}`,
        notacao,
        total,
        dados,
      })
    } catch { /* o gasto já aconteceu; o feed é best-effort */ }
  }

  // 20.4 — usar um poder: custo DEBITA ANTES do efeito; falha bloqueia sem debitar.
  // Não existe reembolso — se der errado depois, o mestre ajusta na mão.
  async function handleUsarPoder(poder, circuloUsado) {
    const check = podeUsarPoder(poder, estadoPoderes)
    if (!check.ok) throw new Error(check.motivo)

    // 1) débitos
    for (const c of check.custos) {
      const atual = atualDoPool(c.pool_id)
      await definirAtual(c.pool_id, atual - c.quantidade)
    }
    if (custoDeSlot(poder.custo)) {
      const r = gastarSlot(circuloUsado, totaisSlots, usadosSlots)
      if (!r.ok) throw new Error(r.motivo)
      await definirUsados(circuloUsado, r.usados)
    }

    // 2) efeito (notação com a escala do círculo usado, fórmulas resolvidas na F17.2)
    const notacaoBruta = montarNotacaoUso(poder, circuloUsado)
    let resultado = null
    if (notacaoBruta) {
      let notacao = notacaoBruta
      try { notacao = resolverNotacaoFormula(notacaoBruta, contextoFormula).notacao } catch { /* usa a bruta */ }
      if (validarNotacao(notacao)) {
        const r = rolarNotacao(notacao)
        resultado = { notacao, total: r.total, dados: r.dados, tipo: poder.efeito_tipo }
      }
    }

    // 3) feed. Dano de poder vira "aplicável": o mestre lança num alvo no combate (F14.6).
    const rotulo = `${ficha.nome_personagem} ${frasesDeUso(poder, circuloUsado, 'usou')}`
    try {
      await registrarEvento({
        mesaId, fichaId, rotulo,
        notacao: resultado?.notacao || '',
        total: resultado?.total ?? 0,
        dados: resultado?.dados || [],
        aplicavel: resultado?.tipo === 'dano' && resultado?.total > 0
          ? { tipo: 'dano', valor: resultado.total, origem: poder.nome }
          : null,
      })
    } catch { /* o custo já foi pago; o feed é best-effort */ }

    return resultado
  }

  // 20.5 — ativar uma habilidade debita o custo de pool. Sem recurso, não ativa.
  async function handleToggleHabilidade(habilidadeFichaId, novoEstado) {
    if (novoEstado) {
      const hf = habilidadesFicha.find(h => h.id === habilidadeFichaId)
      const check = podeAtivarHabilidade(hf?.habilidade, estadoPoderes)
      if (!check.ok) throw new Error(check.motivo)
      for (const c of check.custos) {
        await definirAtual(c.pool_id, atualDoPool(c.pool_id) - c.quantidade)
      }
    }
    await toggleHabilidade(habilidadeFichaId, novoEstado)
  }

  // 20.5 — fora de combate o jogador cobra o próprio turno na mão.
  // Dentro do combate, a SessaoPage cobra sozinha ao avançar o turno (via RPC).
  async function handlePagarTurno() {
    const ativas = habilidadesFicha.filter(hf => hf.ativa === true && hf.habilidade)
    const plano = planejarTurno(ativas, estadoPoderes)
    for (const d of plano.debitos) await definirAtual(d.pool_id, d.atual)
    for (const id of plano.desativar) await toggleHabilidade(id, false)
    for (const aviso of plano.avisos) {
      try {
        await registrarEvento({ mesaId, fichaId, rotulo: aviso, notacao: '', total: 0, dados: [] })
      } catch { /* feed é best-effort */ }
    }
    return plano
  }

  // 20.1 — aplicar o resultado do pool de dados à vida (uso típico: curar)
  async function handleCurarComPool(total) {
    const max = valoresFinais.vida_max || ficha.hp_maximo || 0
    const atual = ficha.hp_atual ?? 0
    const novo = max > 0 ? Math.min(max, atual + total) : atual + total
    try {
      await updateFicha(fichaId, { hp_atual: novo })
      refetch()
    } catch { /* vida não muda se falhar */ }
  }

  // 21.4 — maestria de um item: nível + bônus percentuais + propriedades
  // (desbloqueadas/bloqueadas). Propriedades aplicáveis: gerais + da categoria do item.
  function maestriaDoItem(item) {
    const mc = config.maestria
    if (!mc?.ativo) return null
    const escopo = mc.escopo === 'item' ? 'item' : 'categoria'
    const linha = linhasMaestria.find(l =>
      escopo === 'item' ? l.item_id === item.id : (item.categoria_id && l.categoria_id === item.categoria_id)
    )
    const nivel = linha?.nivel ?? 0
    const props = (propriedadesSistema || []).filter(p => !p.categoria_id || p.categoria_id === item.categoria_id)
    return { nivel, ...bonusMaestria(nivel, mc, props) }
  }

  const hasLeft = secoes.pericias || secoes.proficiencias
  const hasRight = secoes.combate || secoes.defesas || secoes.imagens

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-900 to-black">
      {/* Barra de navegação */}
      <header className="border-b border-purple-800 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(`/mesa/${mesaId}`)}
            className="text-purple-400 hover:text-white transition-colors text-sm shrink-0"
          >
            ← Voltar
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-xl leading-tight truncate">
              {ficha.nome_personagem}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isDono && (
              <span className="text-xs text-purple-400 bg-purple-900/60 border border-purple-700 px-2 py-1 rounded-full">
                Visualizando
              </span>
            )}
            {isDono && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-red-500 hover:text-red-400 hover:bg-red-950/50 rounded-lg transition-colors"
                title="Deletar ficha"
              >
                🗑
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Cabeçalho do personagem */}
        <CabecalhoPersonagem
          ficha={ficha}
          rotuloVida={rotuloVida}
          isDono={isDono}
          onRefetch={refetch}
          racas={racas}
          classes={classes}
          racaId={racaId}
          onRacaChange={handleRacaChange}
          classesFicha={classesFicha}
          nivelTotal={nivelTotal}
          classeFallbackNome={classeAtiva?.nome || null}
          onAddClasse={handleAddClasse}
          onRemoveClasse={handleRemoveClasse}
          onSetNivel={handleSetNivel}
          vidaMaxFinal={valoresFinais.vida_max}
          vidaTemp={valoresFinais.vida_temp}
          vidaTempPontual={ficha.vida_temp_atual ?? 0}
          esconderVida={(config.trilhas || []).some(t => t.substitui_vida)}
        />

        {/* Estados com gatilhos (24.4) — destaque ao lado da vida/trilha */}
        <PainelEstados
          estados={config.estados || []}
          valores={valoresEstados}
          isDono={isDono}
          onSet={handleSetEstado}
          apenasDestaque={false}
        />

        {/* Trilhas (24.2) — adaptativo: some se o sistema não tem trilhas */}
        <PainelTrilhas
          trilhas={config.trilhas || []}
          marcasDe={marcasDe}
          salvarMarcas={salvarMarcas}
          contextoFormula={contextoFormula}
          isDono={isDono}
          onEventos={handleEventosTrilha}
          bonusDe={bonusDe}
        />

        {/* 25.2 — modo XP DIRETO: sem nível/level-up; XP em destaque + compras */}
        {config.progressao?.modo === 'xp_direto' && (
          <PainelXpDireto
            ficha={ficha}
            progressao={config.progressao}
            contextoFormula={contextoFormula}
            isDono={isDono}
            souGestor={souGestor}
            nomes={nomesAlvos}
            alvosDe={alvosCompraDe}
            onConceder={handleConcederXp}
            onComprar={handleComprarXp}
            log={xpLog}
          />
        )}

        {/* XP e nível (Fase 19.3) — só no modo de progressão POR NÍVEL (25.1). */}
        {(config.progressao?.modo ?? 'nivel') === 'nivel' && (modoProgressao(config.progressao_xp) !== 'nenhum' || isDono) && (
          <BarraXp
            xp={ficha.xp ?? 0}
            nivelTotal={nivelTotal}
            progressao={config.progressao_xp}
            classesFicha={classesFicha}
            podeDarXp={isDono || souGestor}
            isDono={isDono}
            onAddXp={handleAddXp}
            onSubirNivel={handleSubirNivel}
          />
        )}

        {/* Pools/Recursos (20.1) — adaptativo: some se o sistema não tem pools */}
        <PainelPools
          pools={pools}
          linhasPools={linhasPools}
          maximos={maximosPools}
          erros={errosPools}
          isDono={isDono}
          atualDe={atualDoPool}
          onDefinirAtual={definirAtual}
          onRolagem={handleRolagemPool}
          onCurar={handleCurarComPool}
        />

        {/* Slots (20.3) — modo opcional; some se desativado ou sem slots */}
        {slotsAtivos(config) && (
          <PainelSlots
            rotulo={config.slots?.rotulo || 'Espaços'}
            totais={totaisSlots}
            usados={usadosSlots}
            isDono={isDono}
            onDefinirUsados={definirUsados}
          />
        )}

        {/* Linhas de poder (25.3c) — adaptativo: some se o sistema não tem linhas */}
        <PainelLinhas
          linhas={linhasPoderSistema}
          catalogoPoderes={catalogoPoderes}
          poderesFicha={poderesFicha}
          ratingDe={ratingDe}
          onDefinirRating={handleDefinirRatingLinha}
          isDono={isDono}
          onAprender={aprenderPoder}
        />

        {/* Poderes (20.4) — adaptativo: some se o sistema não tem catálogo */}
        <PainelPoderes
          rotulo={config.poderes_rotulo || 'Poderes'}
          catalogo={catalogoPoderes}
          poderesFicha={poderesFicha}
          estado={estadoPoderes}
          cdSistema={config.slots?.cd_formula || ''}
          usaPreparacao={slotsAtivos(config) && !!config.slots?.preparacao}
          classesIds={classesIds}
          isDono={isDono}
          onUsar={handleUsarPoder}
          onAprender={aprenderPoder}
          onEsquecer={esquecerPoder}
          onPreparar={definirPreparado}
          onCurar={handleCurarComPool}
        />

        {/* Maestrias (21.3) — adaptativo: some se maestria desativada */}
        <PainelMaestrias
          config={config.maestria}
          categorias={categorias}
          itens={itensFicha}
          linhasMaestria={linhasMaestria}
          propriedades={propriedadesSistema}
          isDono={isDono}
          onGanhar={handleGanharMaestria}
        />

        {/* Carteira (21.6) — adaptativo: some se o sistema não tem moedas */}
        <PainelCarteira
          moedas={config.moedas}
          carteira={ficha.carteira || {}}
          isDono={isDono}
          onSalvar={async nova => { await updateFicha(fichaId, { carteira: nova }); refetch() }}
        />

        {/* Recompensas de nível (19.6) — checklist-guia, some se não houver nenhuma */}
        <PainelRecompensas
          recompensasFicha={recompensasFicha}
          recompensas={recompensas}
          classes={classes}
          isDono={isDono}
          onMarcar={marcarConcluida}
        />

        {/* Descanso (Fase 15) — só dono, só se o sistema configurou descansos */}
        {isDono && (config.descansos?.length > 0) && (
          <DescansoBar
            descansos={config.descansos}
            ficha={ficha}
            valoresFinais={valoresFinais}
            habilidadesFicha={habilidadesFicha}
            contextoFormula={contextoFormula}
            pools={pools}
            linhasPools={linhasPools}
            maximosPools={maximosPools}
            configSlots={slotsAtivos(config) ? config : null}
            usadosSlots={usadosSlots}
            onAplicar={handleAplicarDescanso}
          />
        )}

        {/* Pontos de status (22.2) — adaptativo: some se o modo pontos está off */}
        <PainelPontos
          config={config.pontos_status}
          atributos={valoresAtributos.map(va => ({ id: va.atributo?.id, nome: va.atributo?.nome, valor: va.valor ?? 0 })).filter(a => a.id)}
          disponiveis={pontosDisp}
          log={pontosLog}
          jaRecebeuInicial={jaRecebeuInicial}
          isDono={isDono}
          isMestre={souGestor}
          inicialResolvido={(() => {
            const ps = config.pontos_status
            if (!ps?.ativo) return null
            const e = inicialDaRaca(ps, racaAtiva)
            if (!String(e || '').trim()) return null
            return ehRolado(e) ? notacaoDoGanho(e, contextoFormula) : avaliarGanho(e, contextoFormula)
          })()}
          onReceberInicial={handleReceberInicial}
          onDistribuir={handleDistribuirPontos}
          onAjustar={handleAjustarPontos}
        />

        {/* Faixa de atributos */}
        <FaixaAtributos
          valoresAtributos={valoresAtributos}
          isDono={isDono}
          mesaId={mesaId}
          fichaId={fichaId}
          registrarRolagem={registrarRolagem}
          registrarResolvida={registrarResolvida}
          resolucao={config.resolucao}
          rerolagem={rerolagem}
          especiaisQtd={especiaisQtd}
          exibicaoAtributos={config.exibicao_atributos}
          maximoDots={config.maximo_dots}
          dadoPadrao={dadoPadrao}
          valoresFinaisMotor={valoresFinais.atributos}
          detalhamentoMotor={valoresFinais.detalhamento}
          onSaveValor={handleSaveValor}
          modificadoresAtivos={modificadoresAtivos}
          formulaModificador={formulaModificador}
          contextoFormula={contextoFormula}
        />

        {/* Layout de 3 colunas */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* Coluna esquerda — Perícias / Proficiências */}
          {hasLeft && (
            <div className="w-full lg:w-64 xl:w-72 shrink-0 space-y-4">
              {secoes.pericias && (
                <PainelPericias
                  key={periciasKey}
                  pericias={periciasDoSistema}
                  fichaId={fichaId}
                  isDono={isDono}
                  valoresAtributos={valoresAtributos}
                  mesaId={mesaId}
                  dadoPadrao={dadoPadrao}
                  modificadoresAtivos={modificadoresAtivos}
                  resolucao={config.resolucao}
                  rerolagem={rerolagem}
                  especiaisQtd={especiaisQtd}
                  exibicaoAtributos={config.exibicao_atributos}
                  maximoDots={config.maximo_dots}
                />
              )}
              {secoes.proficiencias && (
                <PainelProficiencias
                  ficha={ficha}
                  isDono={isDono}
                  onRefetch={refetch}
                />
              )}
            </div>
          )}

          {/* Coluna central — Abas: Ações / Inventário / Traços / Notas / Habilidades */}
          <div className="flex-1 min-w-0">
            <AbasCentrais
              secoes={secoes}
              fichaId={fichaId}
              donoId={ficha.dono_id}
              isDono={isDono}
              mesaId={mesaId}
              ficha={ficha}
              onRefetch={refetch}
              habilidades={habilidades}
              habilidadesFicha={habilidadesFicha}
              onToggleHabilidade={handleToggleHabilidade}
              poolsPorId={poolsPorId}
              onPagarTurno={handlePagarTurno}
              onAdicionarHabilidade={adicionarHabilidade}
              onRemoverHabilidade={removerHabilidade}
              onAjustarRecurso={ajustarRecurso}
              onRecuperarRecursos={recuperarRecursos}
              valoresFinais={valoresFinais}
              modificadoresAtivos={modificadoresAtivos}
              onUsarAcaoHabilidade={handleUsarAcao}
              condicoesManuais={condicoesManuais}
              condicoesManuaisDisponiveis={condicoesManuaisDisponiveis}
              onToggleCondicao={toggleCondicao}
              nomesAlvos={nomesAlvos}
              habilidadesBloqueadas={habilidadesBloqueadas}
              categorias={categorias}
              maestria={config.maestria}
              onGanharMaestria={handleGanharMaestria}
              maestriaDoItem={maestriaDoItem}
              atributos={valoresAtributos.map(va => va.atributo).filter(Boolean)}
              camposCombate={camposCombate}
              pericias={periciasDoSistema}
              classes={classes}
              pools={pools}
              critico={config.critico}
            />
          </div>

          {/* Coluna direita — Combate / Defesas / Imagens */}
          {hasRight && (
            <div className="w-full lg:w-64 xl:w-72 shrink-0 space-y-4">
              {secoes.combate && (
                <PainelCombate
                  campos={camposCombate}
                  fichaId={fichaId}
                  isDono={isDono}
                  contextoFormula={contextoFormula}
                />
              )}
              {secoes.defesas && (
                <PainelDefesas
                  resistencias={defesas.resistencias}
                  imunidades={defesas.imunidades}
                  vulnerabilidades={defesas.vulnerabilidades}
                  vidaTemp={valoresFinais.vida_temp}
                />
              )}
              {secoes.imagens && (
                <PainelImagens
                  fichaId={fichaId}
                  donoId={ficha.dono_id}
                  isDono={isDono}
                />
              )}
            </div>
          )}

        </div>
      </div>

      {/* Modal de confirmação de deleção */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-800/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">Deletar ficha?</h3>
            <p className="text-purple-300 text-sm mb-5">
              Tem certeza? Esta ação não pode ser desfeita. Todos os atributos,
              equipamentos e imagens desta ficha serão apagados permanentemente.
            </p>
            {deleteError && (
              <p className="text-red-400 text-sm mb-3">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteError('') }}
                disabled={deleting}
                className="flex-1 py-2.5 text-purple-300 hover:text-white border border-purple-700 hover:border-purple-500 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteFicha}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {deleting ? 'Deletando...' : 'Deletar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
