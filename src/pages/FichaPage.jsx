import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFicha, useUpdateFicha } from '../hooks/useFicha'
import { useSistema } from '../hooks/useSistema'
import { useRolagem } from '../hooks/useRolagem'
import { supabase } from '../lib/supabase'
import { mergeConfigLayout } from '../lib/sistemaDefaults'
import { coletarModificadores, calcularValoresFinais, agregarDefesas, listarCondicoesManuais, resolverValoresFormula } from '../lib/modifierEngine'
import { validarNotacao, rolarNotacao } from '../lib/diceNotation'
import { useHabilidadesFicha } from '../hooks/useHabilidadesFicha'
import { useClassesFicha } from '../hooks/useClassesFicha'
import { nivelTotalDe } from '../components/ficha/layout/ClassesFicha'
import { modoProgressao } from '../lib/progressaoEngine'
import { resolverFaixas } from '../lib/faixas'
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
  const { registrarRolagem, registrarEvento } = useRolagem()
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

  // Fase 19.1 — multiclasse: adicionar/remover classe re-sincroniza as
  // habilidades auto-concedidas contra o CONJUNTO de classes; o cache de nível
  // é atualizado pelo efeito acima.
  async function handleAddClasse(classeId) {
    try {
      await adicionarClasse(classeId)
      const ids = [...classesFicha.map(cf => cf.classe_id), classeId]
      await sincronizarClasses(ids)
    } catch {}
  }

  async function handleRemoveClasse(rowId, classeId) {
    try {
      await removerClasse(rowId)
      const ids = classesFicha.map(cf => cf.classe_id).filter(id => id !== classeId)
      await sincronizarClasses(ids)
    } catch {}
  }

  async function handleSetNivel(rowId, nivel) {
    await definirNivel(rowId, nivel)
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
      await definirNivel(rowId, (Number(cf?.nivel) || 1) + 1)
    } else {
      // Sistema sem classes estruturadas: o nível vive só em fichas.nivel
      await updateFicha(fichaId, { nivel: nivelTotalAtual() + 1 })
      refetch()
    }
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
  const ctxModificador = {
    nivel: nivelTotal,
    niveisClasse,
    formula_proficiencia: formulaProficiencia,
    vida_atual: ficha.hp_atual ?? 0,
    vida_max: ficha.hp_maximo ?? 0,
    recursos: recursosCtx,
    pericias: {},
    formulaModificador: config.formula_modificador || '',
  }
  // 19.4 — a faixa ativa é escolhida ANTES de resolver fórmulas: o valor da
  // faixa ainda pode ser fórmula (ou notação de dado, que passa direto).
  const modificadoresAtivos = resolverValoresFormula(
    resolverFaixas(
      coletarModificadores({
        raca: racaAtiva,
        classes: classesAtivas,
        habilidadesFicha,
        estadoFicha,
        condicoesManuais,
      }),
      ctxModificador
    ),
    ctxModificador
  )
  // 12.6 — interruptores situacionais: todos os mods de condição manual em jogo
  const condicoesManuaisDisponiveis = listarCondicoesManuais({
    raca: racaAtiva,
    classes: classesAtivas,
    habilidadesFicha,
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
    vida_atual: ficha.hp_atual ?? 0,
    vida_max: valoresFinais.vida_max ?? ficha.hp_maximo ?? 0,
    pericias: {},
    recursos: {},
  }

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
        />

        {/* XP e nível (Fase 19.3). Sistema sem XP: só o dono vê (botão de subir). */}
        {(modoProgressao(config.progressao_xp) !== 'nenhum' || isDono) && (
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

        {/* Descanso (Fase 15) — só dono, só se o sistema configurou descansos */}
        {isDono && (config.descansos?.length > 0) && (
          <DescansoBar
            descansos={config.descansos}
            ficha={ficha}
            valoresFinais={valoresFinais}
            habilidadesFicha={habilidadesFicha}
            contextoFormula={contextoFormula}
            onAplicar={handleAplicarDescanso}
          />
        )}

        {/* Faixa de atributos */}
        <FaixaAtributos
          valoresAtributos={valoresAtributos}
          isDono={isDono}
          mesaId={mesaId}
          fichaId={fichaId}
          registrarRolagem={registrarRolagem}
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
                  pericias={periciasDoSistema}
                  fichaId={fichaId}
                  isDono={isDono}
                  valoresAtributos={valoresAtributos}
                  mesaId={mesaId}
                  dadoPadrao={dadoPadrao}
                  modificadoresAtivos={modificadoresAtivos}
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
              onToggleHabilidade={toggleHabilidade}
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
