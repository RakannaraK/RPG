// Editor de layout/seções do sistema — usado pelo mestre no SistemaEditor
import FormulaInput from './FormulaInput'
import ProgressaoEditor from './ProgressaoEditor'
import DefesaAtivaEditor from './DefesaAtivaEditor'
import ResolucaoEditor from './ResolucaoEditor'
import TrilhasEditor from './TrilhasEditor'
import { avaliarFormula } from '../../lib/formulaEngine'
import { ehRolado } from '../../lib/pontosEngine'

const INP_PS = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm placeholder-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500'

/**
 * Fase 22.1 — config de pontos de status (point-buy). EXCLUDENTE com a rolagem
 * de atributo (F3): o editor avisa. Inicial e ganho aceitam número, fórmula ou
 * notação rolada ("1d6 + 10").
 */
function PontosStatusEditor({ cfg = {}, onChange }) {
  const set = patch => onChange({ ...cfg, ...patch })
  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-purple-200 text-sm font-semibold">Pontos de status (distribuição)</p>
        <label className="text-purple-300 text-xs flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={!!cfg.ativo} onChange={e => set({ ativo: e.target.checked })} className="accent-purple-500" />
          ativar
        </label>
      </div>
      <p className="text-purple-500 text-xs">
        Point-buy: um pool inicial e ganho por nível, distribuídos nos atributos. É um modo
        <span className="text-amber-400"> alternativo</span> — não use junto com a rolagem de atributo (F3).
        Valores aceitam número, fórmula (<span className="font-mono">nivel</span>) ou notação rolada
        (<span className="font-mono">1d6 + 10</span>, rolada a cada nível).
      </p>
      {cfg.ativo && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <label className="text-purple-400 text-xs shrink-0">Rótulo</label>
            <input type="text" value={cfg.rotulo || ''} onChange={e => set({ rotulo: e.target.value })}
              placeholder="Pontos de Status" className={`${INP_PS} flex-1 min-w-[8rem]`} />
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <label className="text-purple-300 text-xs flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={!!cfg.inicial_por_raca} onChange={e => set({ inicial_por_raca: e.target.checked })} className="accent-purple-500" />
              inicial por raça
            </label>
            {!cfg.inicial_por_raca && (
              <span className="flex items-center gap-1.5">
                <span className="text-purple-400 text-xs">inicial</span>
                <input type="text" value={cfg.inicial || ''} onChange={e => set({ inicial: e.target.value })}
                  placeholder="16" className={`${INP_PS} w-24 font-mono`} />
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <span className="flex items-center gap-1.5">
              <span className="text-purple-400 text-xs">ganho por nível</span>
              <input type="text" value={cfg.ganho_por_nivel || ''} onChange={e => set({ ganho_por_nivel: e.target.value })}
                placeholder="1d6 + 10" className={`${INP_PS} w-28 font-mono`} />
              {ehRolado(cfg.ganho_por_nivel) && <span className="text-amber-400/80 text-[11px]">🎲 rolado</span>}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-purple-400 text-xs">custo por ponto</span>
              <input type="number" min={1} value={cfg.custo_por_ponto ?? 1} onChange={e => set({ custo_por_ponto: Number(e.target.value) })}
                className={`${INP_PS} w-16 text-center`} />
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-purple-400 text-xs">teto/atributo</span>
              <input type="number" value={cfg.maximo_por_atributo ?? ''} onChange={e => set({ maximo_por_atributo: e.target.value === '' ? null : Number(e.target.value) })}
                placeholder="—" className={`${INP_PS} w-16 text-center`} />
            </span>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Fase 22.3 — config de crítico. Limiar por fórmula com a variável `maestria`
 * (nível de maestria do item usado). Multiplicador em modo total ou dados.
 */
function CriticoEditor({ cfg = {}, onChange }) {
  const set = patch => onChange({ ...cfg, ...patch })
  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-purple-200 text-sm font-semibold">Crítico</p>
        <label className="text-purple-300 text-xs flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={!!cfg.ativo} onChange={e => set({ ativo: e.target.checked })} className="accent-purple-500" />
          ativar
        </label>
      </div>
      <p className="text-purple-500 text-xs">
        Avaliado no <span className="text-purple-300">dado puro do acerto</span> (antes de bônus). O limiar
        é uma fórmula que pode usar <span className="font-mono text-purple-300">maestria</span> (nível do item).
        Ex.: d20 clássico → <span className="font-mono">20</span>; IC → <span className="font-mono">max(25, 85 - 15 * piso(maestria / 2))</span>.
      </p>
      {cfg.ativo && (
        <>
          <div>
            <label className="text-purple-400 text-xs block mb-1">Limiar (crítico se o dado ≥ isto)</label>
            <FormulaInput
              value={cfg.limiar_formula || ''}
              onChange={f => set({ limiar_formula: f })}
              placeholder="20  ou  max(25, 85 - 15 * piso(maestria / 2))"
              presets={[
                { label: '20 (d20 clássico)', valor: '20' },
                { label: 'IC (d100 dinâmico)', valor: 'max(25, 85 - 15 * piso(maestria / 2))' },
              ]}
              variaveis={['maestria', 'piso(']}
            />
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <span className="flex items-center gap-1.5">
              <span className="text-purple-400 text-xs">multiplicador padrão</span>
              <input type="number" min={1} step="0.5" value={cfg.multiplicador_padrao ?? 2}
                onChange={e => set({ multiplicador_padrao: Number(e.target.value) })}
                className="w-16 px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-purple-400 text-xs">modo</span>
              <select value={cfg.modo_multiplicador || 'total'} onChange={e => set({ modo_multiplicador: e.target.value })}
                className="px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="total">total (dobra tudo)</option>
                <option value="dados">dados (só os dados)</option>
              </select>
            </span>
          </div>
          <p className="text-purple-600 text-[11px]">
            Ordem: dados+fixos → multiplicador crítico → percentuais → piso. O multiplicador de uma
            categoria (aba Maestria & Itens) sobrescreve o padrão.
          </p>
        </>
      )}
    </div>
  )
}

const SECOES = [
  { id: 'acoes',         label: 'Ações / Ataques',      desc: 'Lista de ataques e habilidades ativas' },
  { id: 'inventario',    label: 'Inventário',            desc: 'Equipamentos e itens carregados' },
  { id: 'tracos',        label: 'Traços & Habilidades',  desc: 'Características passivas, raça, classe' },
  { id: 'notas',         label: 'Notas',                 desc: 'Campo de anotações livres do jogador' },
  { id: 'imagens',       label: 'Imagens',               desc: 'Galeria de imagens do personagem' },
  { id: 'pericias',      label: 'Perícias',              desc: 'Lista de perícias com bônus e proficiência' },
  { id: 'proficiencias', label: 'Proficiências',         desc: 'Linguagens, armas, armaduras, ferramentas' },
  { id: 'combate',       label: 'Combate',               desc: 'CA, iniciativa, deslocamento e outros campos numéricos' },
  { id: 'defesas',       label: 'Defesas & Condições',   desc: 'Resistências, imunidades, condições' },
]

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-purple-600' : 'bg-slate-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function toFieldId(str) {
  return (
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || `campo_${Date.now()}`
  )
}

export default function LayoutEditor({
  config,
  onConfigChange,
  pericias,
  onAddPericia,
  onUpdatePericia,
  onRemovePericia,
  atributos,
  pools = [],
}) {
  function toggleSecao(id, value) {
    onConfigChange({
      ...config,
      secoes: { ...config.secoes, [id]: value },
    })
  }

  function addCampoCombate() {
    onConfigChange({
      ...config,
      campos_combate: [
        ...config.campos_combate,
        { id: `campo_${Date.now()}`, nome: '', tipo: 'manual', formula: '' },
      ],
    })
  }

  function updateCampoCombate(index, patch) {
    onConfigChange({
      ...config,
      campos_combate: config.campos_combate.map((c, i) =>
        i === index ? { ...c, ...patch } : c
      ),
    })
  }

  function removeCampoCombate(index) {
    onConfigChange({
      ...config,
      campos_combate: config.campos_combate.filter((_, i) => i !== index),
    })
  }

  // Apenas atributos já salvos no banco (com ID real) podem ser vinculados a perícias
  const atributosSalvos = atributos.filter(a => !a.id?.startsWith('temp_'))

  // 17.4 — contexto de EXEMPLO para prévia dos campos calculados (atributos = 10)
  const ctxExemplo = {
    atributos: Object.fromEntries((atributos || []).flatMap(a => (a.nome ? [[a.nome, 10], [a.id, 10]] : []))),
    formulaModificador: config.formula_modificador || '',
    nivel: 5, vida_atual: 10, vida_max: 10, pericias: {}, recursos: {},
  }
  function previaCampo(formula) {
    if (!formula || !formula.trim()) return null
    try { return { ok: true, valor: avaliarFormula(formula, ctxExemplo) } }
    catch (e) { return { ok: false, erro: e.message } }
  }

  const ATALHOS_DADO = [4, 6, 8, 10, 12, 20, 100]

  function handleDadoPadrao(raw) {
    const v = parseInt(raw, 10)
    if (!isNaN(v) && v >= 2) {
      onConfigChange({ ...config, dado_padrao: v })
    } else if (raw === '' || raw === '0' || raw === '1') {
      onConfigChange({ ...config, dado_padrao: raw })
    }
  }

  return (
    <div className="space-y-8">
      {/* Dado padrão dos testes */}
      <div className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
        <p className="text-purple-200 text-sm font-semibold">Dado padrão dos testes</p>
        <p className="text-purple-500 text-xs">
          Dado usado em testes de atributo e perícia. Aceita qualquer valor ≥ 2 (ex: d17, d1000).
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 text-sm shrink-0">1d</span>
            <input
              type="number"
              min="2"
              value={config.dado_padrao ?? 20}
              onChange={e => handleDadoPadrao(e.target.value)}
              className="w-20 px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {ATALHOS_DADO.map(lados => (
              <button
                key={lados}
                type="button"
                onClick={() => onConfigChange({ ...config, dado_padrao: lados })}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                  config.dado_padrao === lados
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-900/60 text-purple-300 hover:bg-purple-800 hover:text-white'
                }`}
              >
                d{lados}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fórmula do modificador de atributo (17.3) */}
      <div className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
        <p className="text-purple-200 text-sm font-semibold">Modificador de atributo</p>
        <p className="text-purple-500 text-xs">
          Como o modificador de cada atributo sai do valor. Use <span className="font-mono text-purple-300">x</span> para
          o valor do atributo. Vazio = sem modificador (usa o valor puro, ex: Infinit Corridor).
          A ficha exibe o modificador calculado quando há fórmula.
        </p>
        <FormulaInput
          value={config.formula_modificador || ''}
          onChange={f => onConfigChange({ ...config, formula_modificador: f })}
          placeholder="ex: piso((x-10)/2)"
          presets={[
            { label: 'Sem modificador (valor puro)', valor: '' },
            { label: 'piso((x-10)/2)  (D&D)', valor: 'piso((x-10)/2)' },
          ]}
        />
      </div>

      {/* Exibição de atributos — dots (24.3) */}
      <div className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
        <p className="text-purple-200 text-sm font-semibold">Exibição de atributos e perícias</p>
        <p className="text-purple-500 text-xs">
          <span className="text-purple-300">Dots</span> mostra bolinhas (●●●○○) em vez de número — só a
          exibição muda; fórmulas e paradas continuam lendo o número. Override por atributo na aba Atributos.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-purple-300 text-xs flex items-center gap-1.5">
            padrão
            <select
              value={config.exibicao_atributos || 'numero'}
              onChange={e => onConfigChange({ ...config, exibicao_atributos: e.target.value })}
              className="px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="numero">Número</option>
              <option value="dots">Dots (bolinhas)</option>
            </select>
          </label>
          {(config.exibicao_atributos || 'numero') === 'dots' && (
            <label className="text-purple-300 text-xs flex items-center gap-1.5">
              máximo de bolinhas
              <input
                type="number" min={1} max={10}
                value={config.maximo_dots ?? 5}
                onChange={e => onConfigChange({ ...config, maximo_dots: Math.max(1, Math.min(10, Number(e.target.value) || 5)) })}
                className="w-16 px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </label>
          )}
        </div>
      </div>

      {/* Fórmula de proficiência (19.2) */}
      <div className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
        <p className="text-purple-200 text-sm font-semibold">Proficiência</p>
        <p className="text-purple-500 text-xs">
          Fórmula da variável <span className="font-mono text-purple-300">proficiencia</span> (use{' '}
          <span className="font-mono text-purple-300">nivel</span>). Vazio = sistema sem proficiência
          (a variável nem aparece). Ex: D&D no nível 13 → 5.
        </p>
        <FormulaInput
          value={config.formula_proficiencia || ''}
          onChange={f => onConfigChange({ ...config, formula_proficiencia: f })}
          placeholder="ex: 2 + teto(nivel / 4) - 1"
          presets={[
            { label: 'Sem proficiência', valor: '' },
            { label: '2 + teto(nivel/4) − 1  (D&D)', valor: '2 + teto(nivel / 4) - 1' },
          ]}
          variaveis={['nivel']}
        />
      </div>

      {/* Progressão por XP (19.3) */}
      <ProgressaoEditor
        progressao={config.progressao_xp}
        onChange={p => onConfigChange({ ...config, progressao_xp: p })}
      />

      {/* Pontos de status (22.1) */}
      <PontosStatusEditor
        cfg={config.pontos_status}
        onChange={ps => onConfigChange({ ...config, pontos_status: ps })}
      />

      {/* Crítico (22.3) */}
      <CriticoEditor
        cfg={config.critico}
        onChange={c => onConfigChange({ ...config, critico: c })}
      />

      {/* Defesa ativa (22.5) */}
      <DefesaAtivaEditor
        cfg={config.defesa_ativa}
        onChange={d => onConfigChange({ ...config, defesa_ativa: d })}
      />

      {/* Resolução de rolagens (23.2/23.4) */}
      <ResolucaoEditor
        cfg={config.resolucao}
        pools={pools}
        onChange={r => onConfigChange({ ...config, resolucao: r })}
      />

      {/* Trilhas (24.2) */}
      <TrilhasEditor
        trilhas={config.trilhas}
        descansos={config.descansos || []}
        onChange={t => onConfigChange({ ...config, trilhas: t })}
      />

      {/* Rótulo de vida */}
      <div className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
        <p className="text-purple-200 text-sm font-semibold">Rótulo de vida</p>
        <div className="flex items-center gap-3">
          <label className="text-purple-400 text-sm shrink-0">Nome do campo</label>
          <input
            type="text"
            value={config.rotulo_vida}
            onChange={e => onConfigChange({ ...config, rotulo_vida: e.target.value })}
            placeholder="Pontos de Vida"
            className="flex-1 px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <p className="text-purple-600 text-xs">
          Ex: "Pontos de Vida", "Vitalidade", "HP", "Sanidade"
        </p>
      </div>

      {/* Seções */}
      <div>
        <p className="text-purple-200 text-sm font-semibold mb-1">Seções da ficha</p>
        <p className="text-purple-500 text-xs mb-4">
          Atributos estão sempre ativos. As demais seções aparecem na ficha apenas se ativadas aqui.
        </p>

        {/* Atributos — sempre ativo */}
        <div className="flex items-center justify-between bg-slate-800/50 border border-purple-900/40 rounded-xl px-4 py-3 mb-2 opacity-60">
          <div>
            <p className="text-white text-sm font-medium">Atributos</p>
            <p className="text-purple-500 text-xs">Valores de Força, Destreza, etc. definidos no sistema</p>
          </div>
          <span className="text-xs text-purple-500 font-medium">Sempre ativo</span>
        </div>

        <div className="space-y-2">
          {SECOES.map(s => (
            <div
              key={s.id}
              className="flex items-center justify-between bg-slate-800 border border-purple-800 rounded-xl px-4 py-3"
            >
              <div>
                <p className="text-white text-sm font-medium">{s.label}</p>
                <p className="text-purple-500 text-xs">{s.desc}</p>
              </div>
              <Toggle
                checked={!!config.secoes[s.id]}
                onChange={v => toggleSecao(s.id, v)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Editor de campos de combate */}
      {config.secoes.combate && (
        <div className="bg-slate-800 border border-purple-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm font-semibold">Campos de combate</p>
              <p className="text-purple-500 text-xs mt-0.5">
                Cada campo é uma caixa na ficha. <span className="text-purple-400">Manual</span> = editável;{' '}
                <span className="text-purple-400">Calculado</span> = fórmula (read-only, recalcula sozinho).
              </p>
            </div>
            <button
              type="button"
              onClick={addCampoCombate}
              className="text-sm px-3 py-1.5 bg-purple-800 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              + Adicionar
            </button>
          </div>

          {config.campos_combate.length === 0 ? (
            <p className="text-purple-600 text-xs py-2">
              Nenhum campo ainda. Ex: Classe de Armadura, Iniciativa, Deslocamento
            </p>
          ) : (
            <div className="space-y-3">
              {config.campos_combate.map((campo, i) => {
                const calculado = campo.tipo === 'calculado'
                const previa = calculado ? previaCampo(campo.formula) : null
                return (
                  <div key={campo.id} className="bg-slate-900/40 border border-purple-900/50 rounded-xl p-3 space-y-2">
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={campo.nome}
                        onChange={e => updateCampoCombate(i, { nome: e.target.value })}
                        placeholder="Ex: Classe de Armadura"
                        className="flex-1 px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <select
                        value={campo.tipo || 'manual'}
                        onChange={e => updateCampoCombate(i, { tipo: e.target.value })}
                        className="px-2 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        title="Tipo do campo"
                      >
                        <option value="manual">Manual</option>
                        <option value="calculado">Calculado</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeCampoCombate(i)}
                        className="p-2 text-red-500 hover:text-red-400 hover:bg-red-950 rounded-lg transition-colors text-sm"
                      >
                        ✕
                      </button>
                    </div>

                    {calculado && (
                      <div className="pl-1">
                        <FormulaInput
                          value={campo.formula || ''}
                          onChange={f => updateCampoCombate(i, { formula: f })}
                          placeholder="ex: 10 + mod(destreza) + mod(constituicao)"
                          variaveis={['atributo(', 'mod(', 'nivel', 'pericia(', ' + ', ' - ']}
                        />
                        {previa && (
                          previa.ok
                            ? <p className="text-purple-500 text-xs mt-1">Prévia (atributos=10, nível=5): <span className="text-green-400 font-mono">{previa.valor}</span></p>
                            : <p className="text-red-400 text-xs mt-1">⚠ {previa.erro}</p>
                        )}
                        <p className="text-purple-600 text-[11px] mt-1">
                          Pode usar atributos, mod, nível, perícias — mas não outro campo (evita ciclos).
                        </p>
                        {/* 22.7 — destacar este derivado no painel de combate */}
                        <label className="mt-1.5 flex items-center gap-1.5 text-purple-300 text-[11px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!campo.exibir_combate}
                            onChange={e => updateCampoCombate(i, { exibir_combate: e.target.checked })}
                            className="accent-purple-500"
                          />
                          exibir no combate (ex: "Ações extras: 3")
                        </label>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Editor de perícias */}
      {config.secoes.pericias && (
        <div className="bg-slate-800 border border-purple-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm font-semibold">Perícias</p>
              <p className="text-purple-500 text-xs mt-0.5">
                Defina as perícias do sistema. O bônus base pode ser ligado a um atributo.
              </p>
            </div>
            <button
              type="button"
              onClick={onAddPericia}
              className="text-sm px-3 py-1.5 bg-purple-800 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              + Adicionar
            </button>
          </div>

          {pericias.length === 0 ? (
            <p className="text-purple-600 text-xs py-2">
              Nenhuma perícia ainda. Ex: Percepção, Atletismo, Furtividade, Persuasão
            </p>
          ) : (
            <div className="space-y-2">
              {pericias.map((p, i) => (
                <div key={p.id} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={p.nome}
                    onChange={e => onUpdatePericia(i, { ...p, nome: e.target.value })}
                    placeholder="Ex: Percepção"
                    className="flex-1 px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <select
                    value={p.atributo_base_id || ''}
                    onChange={e =>
                      onUpdatePericia(i, {
                        ...p,
                        atributo_base_id: e.target.value || null,
                      })
                    }
                    className="px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    title="Atributo base (opcional)"
                  >
                    <option value="">Sem atributo base</option>
                    {atributosSalvos.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nome}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onRemovePericia(i, p)}
                    className="p-2 text-red-500 hover:text-red-400 hover:bg-red-950 rounded-lg transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {atributosSalvos.length === 0 && pericias.length > 0 && (
            <p className="text-amber-600 text-xs">
              Salve o sistema primeiro para poder vincular perícias a atributos.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
