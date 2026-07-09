// Editor de layout/seções do sistema — usado pelo mestre no SistemaEditor
import FormulaInput from './FormulaInput'
import { avaliarFormula } from '../../lib/formulaEngine'

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
