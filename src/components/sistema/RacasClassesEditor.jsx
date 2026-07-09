import { useState } from 'react'
import { useRacasClasses } from '../../hooks/useRacasClasses'
import { useHabilidades } from '../../hooks/useHabilidades'
import {
  usaAtributoAlvo, usaCombateAlvo, usaTextoAlvo, usaValorNum, usaOperacao,
  ehAcertoDano, ehVantagem, ehAcao, montarEfeitoPayload,
} from '../../lib/efeitoForm'
import { validarFormula, usaAtributoOuMod } from '../../lib/formulaEngine'
import { validarFaixas } from '../../lib/faixas'
import FormulaInput from './FormulaInput'
import FaixasEditor from './FaixasEditor'
import RecompensasEditor from './RecompensasEditor'

// Fase 12.5 — vocabulário ampliado de efeitos. `grupo` só organiza o dropdown.
const TIPOS_MOD = [
  { value: 'atributo',        label: 'Atributo' },
  { value: 'vida_max',        label: 'Vida máxima' },
  { value: 'vida_temp',       label: 'Vida temporária (contínua)' },
  { value: 'resistencia',     label: 'Resistência' },
  { value: 'imunidade',       label: 'Imunidade' },
  { value: 'vulnerabilidade', label: 'Vulnerabilidade' },
  { value: 'combate',         label: 'Campo de combate' },
  { value: 'acerto',          label: 'Acerto (ataque)' },
  { value: 'dano',            label: 'Dano' },
  { value: 'vantagem',        label: 'Vantagem (teste)' },
  { value: 'desvantagem',     label: 'Desvantagem (teste)' },
  { value: 'cura',            label: 'Cura (ação)' },
  { value: 'vida_temp_acao',  label: 'Vida temp. (ação)' },
]

const OPERACOES = [
  { value: 'somar',       label: '+ Somar'       },
  { value: 'percentual',  label: '% Percentual'  },
  { value: 'definir',     label: '= Definir'     },
  { value: 'multiplicar', label: '× Multiplicar' },
]

// Fase 18 — formata operação + valor (percentual leva sufixo %)
function fmtOpValor(mod) {
  const v = mod.valor
  const n = Number(v)
  if (mod.operacao === 'percentual')  return `${n >= 0 ? '+' : ''}${v}%`
  if (mod.operacao === 'definir')     return `=${v}`
  if (mod.operacao === 'multiplicar') return `×${v}`
  return `${n >= 0 || isNaN(n) ? '+' : ''}${v}` // somar
}

function descCondicao(mod, atributos) {
  if (mod.condicao_tipo === 'manual') return mod.condicao_config?.rotulo || 'manual'
  if (mod.condicao_tipo === 'auto') {
    const c = mod.condicao_config || {}
    if (c.metrica === 'vida_percent') return `vida ${c.operador} ${c.valor}%`
    if (c.metrica === 'nivel') return `nível ${c.operador} ${c.valor}`
    if (c.metrica === 'habilidade_ativa') return 'habilidade ativa'
  }
  return null
}

function labelModificador(mod, atributos, camposCombate, pericias = []) {
  const opv = fmtOpValor(mod)
  let base
  switch (mod.tipo) {
    case 'atributo': {
      const attr = atributos.find(a => a.id === mod.alvo)
      base = `${opv} em ${attr?.nome || '?'}`; break
    }
    case 'vida_max':        base = `${opv} Vida máx.`; break
    case 'vida_temp':       base = `+${mod.valor} Vida temp.`; break
    case 'resistencia':     base = `Resistência: ${mod.alvo || '?'}`; break
    case 'imunidade':       base = `Imunidade: ${mod.alvo || '?'}`; break
    case 'vulnerabilidade': base = `Vulnerabilidade: ${mod.alvo || '?'}`; break
    case 'combate': {
      const campo = camposCombate.find(c => c.id === mod.alvo)
      base = `${opv} ${campo?.nome || '?'}`; break
    }
    case 'acerto':
    case 'dano': {
      const partes = []
      if (mod.valor) partes.push(`+${mod.valor}`)
      if (mod.dados_extras) partes.push(`+${mod.dados_extras}`)
      if (mod.percentual_rolagem) partes.push(`+${mod.percentual_rolagem}%`)
      const escopo = mod.escopo_categoria ? ` (${mod.escopo_categoria})` : ' global'
      base = `${mod.tipo === 'acerto' ? 'Acerto' : 'Dano'} ${partes.join(' ') || '+0'}${escopo}`; break
    }
    case 'vantagem':
    case 'desvantagem': {
      const lista = mod.valor === 'pericia' ? pericias : atributos
      const alvoNome = lista.find(x => x.id === mod.alvo)?.nome || '?'
      base = `${mod.tipo === 'vantagem' ? 'Vantagem' : 'Desvantagem'} em ${alvoNome}`; break
    }
    case 'cura':
      base = `Cura ${mod.valor || '?'}${mod.operacao === 'continua' ? ' (contínua)' : ''}`; break
    case 'vida_temp_acao':
      base = `Vida temp. ${mod.valor || '?'} (ação)`; break
    default: base = mod.tipo
  }
  // 19.4 — sinaliza escalonamento: "↗ 1d10 → 4d10 por faixa"
  if (mod.faixas?.faixas?.length) {
    const fs = mod.faixas.faixas
    const extremos = fs.length > 1 ? `${fs[0].valor} → ${fs[fs.length - 1].valor}` : `${fs[0].valor}`
    base = `${base} ↗ ${extremos} por faixa`
  }
  // 19.5 — requisito de nível
  if (mod.nivel_minimo != null) base = `${base} · nv ${mod.nivel_minimo}+`
  const cond = descCondicao(mod, atributos)
  return cond ? `${base} [${cond}]` : base
}

function ModificadorForm({ onAdd, atributos, camposCombate, pericias = [], classes = [] }) {
  const [tipo, setTipo] = useState('atributo')
  const [alvo, setAlvo] = useState('')
  const [operacao, setOperacao] = useState('somar')
  const [valor, setValor] = useState('')
  const [valorEhFormula, setValorEhFormula] = useState(false) // 17.5
  const [escalaFaixa, setEscalaFaixa] = useState(false) // 19.4
  const [faixaSpec, setFaixaSpec] = useState({ variavel: 'nivel', campo: 'valor', faixas: [] })
  const [nivelMinimo, setNivelMinimo] = useState('') // 19.5
  const [dadosExtras, setDadosExtras] = useState('')
  const [percRolagem, setPercRolagem] = useState('') // 18.3
  const [escopoCategoria, setEscopoCategoria] = useState('')
  const [vantTipoAlvo, setVantTipoAlvo] = useState('atributo')
  const [curaModo, setCuraModo] = useState('pontual')
  // condição
  const [condTipo, setCondTipo] = useState('nenhuma')
  const [condMetrica, setCondMetrica] = useState('vida_percent')
  const [condOperador, setCondOperador] = useState('<')
  const [condValor, setCondValor] = useState('')
  const [condRotulo, setCondRotulo] = useState('')

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function handleTipoChange(novo) {
    setTipo(novo); setAlvo(''); setValor(''); setValorEhFormula(false); setDadosExtras(''); setPercRolagem(''); setEscopoCategoria('')
    setVantTipoAlvo('atributo'); setCuraModo('pontual'); setErro('')
    setEscalaFaixa(false); setFaixaSpec({ variavel: 'nivel', campo: 'valor', faixas: [] })
    setNivelMinimo('')
  }

  // 17.5 — tipos cujo valor pode ser fórmula (número → fórmula com nivel/recurso/perícia)
  const valorPodeFormula = usaValorNum(tipo) || ehAcertoDano(tipo)
  // 19.4 — os mesmos tipos podem escalar por faixa (valor por faixa de nível)
  const podeEscalar = valorPodeFormula
  const camposFaixa = ehAcertoDano(tipo)
    ? [{ id: 'valor', label: 'bônus fixo' }, { id: 'dados_extras', label: 'dados extras' }]
    : []

  async function handleAdd() {
    setErro('')
    // Validação por tipo
    if (usaAtributoAlvo(tipo) && !alvo)  { setErro('Selecione um atributo.'); return }
    if (usaCombateAlvo(tipo) && !alvo)   { setErro('Selecione um campo de combate.'); return }
    if (usaTextoAlvo(tipo) && !alvo.trim()) { setErro('Informe o tipo de dano (ex: fogo).'); return }
    if (escalaFaixa && podeEscalar) {
      // 19.4 — o valor vem da faixa ativa; exige faixas contíguas e sem sobreposição
      const vfx = validarFaixas(faixaSpec)
      if (!vfx.valida) { setErro(`Faixas: ${vfx.erro}`); return }
    } else if (valorEhFormula && valorPodeFormula) {
      if (!String(valor).trim()) { setErro('Informe a fórmula.'); return }
      const vf = validarFormula(valor)
      if (!vf.valida) { setErro(`Fórmula inválida: ${vf.erro}`); return }
      if (usaAtributoOuMod(valor)) {
        setErro('Fórmula de modificador não pode usar atributo() nem mod() (evita auto-referência). Use nivel, recurso(), pericia() ou vida_*.'); return
      }
    } else {
      if (usaValorNum(tipo) && (valor === '' || isNaN(Number(valor)))) { setErro('Informe um valor numérico válido.'); return }
      if (ehAcertoDano(tipo) && !String(valor).trim() && !dadosExtras.trim()) { setErro('Informe um valor fixo e/ou dados extras.'); return }
    }
    if (ehVantagem(tipo) && !alvo) { setErro('Selecione o alvo (atributo ou perícia).'); return }
    if (ehAcao(tipo) && !String(valor).trim()) { setErro('Informe a quantidade ou notação (ex: 2d4+2).'); return }
    // Validação da condição
    if (condTipo === 'auto' && condMetrica !== 'habilidade_ativa' && (condValor === '' || isNaN(Number(condValor)))) {
      setErro('Informe o valor da condição automática.'); return
    }
    if (condTipo === 'manual' && !condRotulo.trim()) { setErro('Informe o rótulo da condição manual.'); return }

    // Monta o payload (lógica pura — ver lib/efeitoForm.js)
    const escalando = escalaFaixa && podeEscalar
    const payload = montarEfeitoPayload({
      tipo, alvo, operacao, valor, valorEhFormula: !escalando && valorEhFormula && valorPodeFormula,
      dadosExtras, percentualRolagem: percRolagem, escopoCategoria, vantTipoAlvo, curaModo,
      condTipo, condMetrica, condOperador, condValor, condRotulo,
      faixas: escalando ? faixaSpec : null,
      nivelMinimo,
    })

    setSalvando(true)
    try {
      await onAdd(payload)
      // limpa campos de valor mas mantém o tipo selecionado
      setAlvo(''); setValor(''); setValorEhFormula(false); setDadosExtras(''); setPercRolagem(''); setEscopoCategoria('')
      setCondTipo('nenhuma'); setCondValor(''); setCondRotulo('')
      setEscalaFaixa(false); setFaixaSpec({ variavel: 'nivel', campo: 'valor', faixas: [] })
      setNivelMinimo('')
    } catch (err) {
      setErro(err.message || 'Erro ao adicionar efeito.')
    } finally {
      setSalvando(false)
    }
  }

  const ic = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500'

  return (
    <div className="space-y-2 bg-slate-700/40 border border-purple-800/50 rounded-lg p-3">
      <p className="text-purple-400 text-xs font-medium">Adicionar efeito</p>
      <div className="flex flex-wrap gap-2 items-center">
        <select value={tipo} onChange={e => handleTipoChange(e.target.value)} className={ic}>
          {TIPOS_MOD.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        {usaAtributoAlvo(tipo) && (
          <select value={alvo} onChange={e => setAlvo(e.target.value)} className={ic}>
            <option value="">Atributo...</option>
            {atributos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        )}
        {usaCombateAlvo(tipo) && (
          <select value={alvo} onChange={e => setAlvo(e.target.value)} className={ic}>
            <option value="">Campo...</option>
            {camposCombate.map(c => <option key={c.id} value={c.id}>{c.nome || '(sem nome)'}</option>)}
          </select>
        )}
        {usaTextoAlvo(tipo) && (
          <input type="text" value={alvo} onChange={e => setAlvo(e.target.value)}
            placeholder="Tipo de dano (ex: fogo)" className={`${ic} w-40`} />
        )}
        {usaOperacao(tipo) && (
          <select value={operacao} onChange={e => setOperacao(e.target.value)} className={ic}>
            {OPERACOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        {usaValorNum(tipo) && !valorEhFormula && !escalaFaixa && (
          <span className="flex items-center gap-1">
            <input type="number" value={valor} onChange={e => setValor(e.target.value)}
              placeholder={operacao === 'percentual' ? 'ex: 13' : 'Valor'} className={`${ic} w-16 text-center`} />
            {operacao === 'percentual' && <span className="text-purple-400 text-xs">%</span>}
          </span>
        )}
        {valorPodeFormula && !escalaFaixa && (
          <label className="text-purple-400 text-[11px] flex items-center gap-1 cursor-pointer" title="Usar fórmula (ex: piso(nivel/2))">
            <input type="checkbox" checked={valorEhFormula} onChange={e => setValorEhFormula(e.target.checked)} className="accent-purple-500" />
            ƒ fórmula
          </label>
        )}
        {podeEscalar && (
          <label className="text-purple-400 text-[11px] flex items-center gap-1 cursor-pointer" title="Valor diferente por faixa de nível (ex: nv 1-4: 1d10; 5-10: 2d10)">
            <input type="checkbox" checked={escalaFaixa}
              onChange={e => { setEscalaFaixa(e.target.checked); if (e.target.checked) setValorEhFormula(false) }}
              className="accent-purple-500" />
            ↗ por faixa
          </label>
        )}

        {/* Acerto / Dano */}
        {ehAcertoDano(tipo) && (
          <>
            {/* o campo escalado por faixa some — quem o preenche é a faixa ativa */}
            {!valorEhFormula && !(escalaFaixa && faixaSpec.campo === 'valor') && (
              <input type="number" value={valor} onChange={e => setValor(e.target.value)}
                placeholder="Fixo" className={`${ic} w-16 text-center`} title="Bônus fixo (opcional)" />
            )}
            {!(escalaFaixa && faixaSpec.campo === 'dados_extras') && (
              <input type="text" value={dadosExtras} onChange={e => setDadosExtras(e.target.value)}
                placeholder="Dados extras (ex: 1d6)" className={`${ic} w-32`} />
            )}
            <span className="flex items-center gap-1">
              <input type="number" value={percRolagem} onChange={e => setPercRolagem(e.target.value)}
                placeholder="%" className={`${ic} w-14 text-center`} title="Percentual sobre o total da rolagem (ex: 20)" />
              <span className="text-purple-400 text-xs">%</span>
            </span>
            <input type="text" value={escopoCategoria} onChange={e => setEscopoCategoria(e.target.value)}
              placeholder="Categoria (vazio = global)" className={`${ic} w-44`}
              title="Categoria de ação — vazio aplica a tudo" />
          </>
        )}

        {/* Vantagem / Desvantagem */}
        {ehVantagem(tipo) && (
          <>
            <select value={vantTipoAlvo} onChange={e => { setVantTipoAlvo(e.target.value); setAlvo('') }} className={ic}>
              <option value="atributo">Atributo</option>
              <option value="pericia">Perícia</option>
            </select>
            <select value={alvo} onChange={e => setAlvo(e.target.value)} className={ic}>
              <option value="">{vantTipoAlvo === 'pericia' ? 'Perícia...' : 'Atributo...'}</option>
              {(vantTipoAlvo === 'pericia' ? pericias : atributos).map(x => (
                <option key={x.id} value={x.id}>{x.nome}</option>
              ))}
            </select>
          </>
        )}

        {/* Cura / Vida temp ação */}
        {ehAcao(tipo) && (
          <>
            <input type="text" value={valor} onChange={e => setValor(e.target.value)}
              placeholder="Qtd ou notação (ex: 2d4+2)" className={`${ic} w-40`} />
            <select value={curaModo} onChange={e => setCuraModo(e.target.value)} className={ic}>
              <option value="pontual">Pontual (botão)</option>
              <option value="continua">Contínua</option>
            </select>
          </>
        )}

        <button onClick={handleAdd} disabled={salvando}
          className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">
          {salvando ? '...' : '+ Adicionar'}
        </button>
      </div>

      {/* Fórmula do valor (17.5) — só nivel/recurso/perícia/vida (sem atributo/mod) */}
      {valorEhFormula && valorPodeFormula && (
        <div className="border-t border-purple-900/50 pt-2">
          <FormulaInput
            value={valor}
            onChange={setValor}
            placeholder="ex: piso(nivel/2)"
            variaveis={['nivel', 'piso(', 'recurso(', 'pericia(', ' + ', ' - ', ' / ']}
          />
          <p className="text-purple-600 text-[11px] mt-1">
            Pode usar <span className="font-mono">nivel</span>, <span className="font-mono">recurso()</span>,{' '}
            <span className="font-mono">pericia()</span>, <span className="font-mono">vida_*</span> — não{' '}
            <span className="font-mono">atributo()</span>/<span className="font-mono">mod()</span> (evita auto-referência).
          </p>
        </div>
      )}

      {/* Escalonamento por faixa (19.4) */}
      {escalaFaixa && podeEscalar && (
        <div className="border-t border-purple-900/50 pt-2">
          <FaixasEditor
            spec={faixaSpec}
            onChange={setFaixaSpec}
            classes={classes}
            campos={camposFaixa}
            valorPlaceholder={
              ehAcertoDano(tipo) && faixaSpec.campo === 'dados_extras' ? 'ex: 2d10' : 'ex: 3'
            }
          />
        </div>
      )}

      {/* Nível mínimo (19.5) */}
      <div className="flex flex-wrap gap-2 items-center border-t border-purple-900/50 pt-2">
        <span className="text-purple-500 text-[11px]">Nível mínimo:</span>
        <input type="number" min={1} value={nivelMinimo} onChange={e => setNivelMinimo(e.target.value)}
          placeholder="—" className={`${ic} w-16 text-center`}
          title="Só entra em jogo a partir deste nível (da classe de origem; raça/avulso usam o nível total). Vazio = sem requisito." />
        <span className="text-purple-600 text-[11px]">vazio = sem requisito</span>
      </div>

      {/* Condição */}
      <div className="flex flex-wrap gap-2 items-center border-t border-purple-900/50 pt-2">
        <span className="text-purple-500 text-[11px]">Condição:</span>
        <select value={condTipo} onChange={e => setCondTipo(e.target.value)} className={ic}>
          <option value="nenhuma">Nenhuma</option>
          <option value="auto">Automática</option>
          <option value="manual">Manual (situacional)</option>
        </select>
        {condTipo === 'auto' && (
          <>
            <select value={condMetrica} onChange={e => setCondMetrica(e.target.value)} className={ic}>
              <option value="vida_percent">Vida %</option>
              <option value="nivel">Nível</option>
            </select>
            <select value={condOperador} onChange={e => setCondOperador(e.target.value)} className={ic}>
              <option value="<">&lt;</option>
              <option value="<=">≤</option>
              <option value=">">&gt;</option>
              <option value=">=">≥</option>
              <option value="==">=</option>
            </select>
            <input type="number" value={condValor} onChange={e => setCondValor(e.target.value)}
              placeholder={condMetrica === 'vida_percent' ? '50' : '5'} className={`${ic} w-16 text-center`} />
            {condMetrica === 'vida_percent' && <span className="text-purple-500 text-[11px]">%</span>}
          </>
        )}
        {condTipo === 'manual' && (
          <input type="text" value={condRotulo} onChange={e => setCondRotulo(e.target.value)}
            placeholder="Rótulo (ex: Contra mortos-vivos)" className={`${ic} w-56`} />
        )}
      </div>

      {erro && <p className="text-red-400 text-[11px]">{erro}</p>}
    </div>
  )
}

function ModificadoresExpandido({ modificadores, onAddMod, onRemoveMod, atributos, camposCombate, pericias = [], classes = [] }) {
  return (
    <div className="border-t border-purple-900 p-4 space-y-3">
      <p className="text-purple-500 text-xs font-medium uppercase tracking-wider">Efeitos</p>
      {modificadores.length === 0 ? (
        <p className="text-purple-600 text-xs">Nenhum efeito ainda.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {modificadores.map(mod => (
            <div key={mod.id}
              className="flex items-center gap-1.5 bg-purple-900/40 border border-purple-700/50 rounded-lg pl-2.5 pr-1.5 py-1">
              <span className="text-purple-200 text-xs font-medium">
                {labelModificador(mod, atributos, camposCombate, pericias)}
              </span>
              <button onClick={() => onRemoveMod(mod.id)}
                className="text-red-600 hover:text-red-400 text-xs transition-colors leading-none"
                title="Remover efeito">✕</button>
            </div>
          ))}
        </div>
      )}
      <ModificadorForm onAdd={onAddMod} atributos={atributos} camposCombate={camposCombate} pericias={pericias} classes={classes} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Habilidades
// ──────────────────────────────────────────────────────────

const SEL = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500'
const INP = 'w-full px-3 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500'

// Card compartilhado: usado tanto dentro da seção da raça/classe quanto na seção de avulsas.
// Não expõe seletor de raça/classe no formulário de edição — vínculo é gerenciado pelo contexto.
function HabilidadeVinculadaCard({ habilidade, atributos, camposCombate, pericias = [], classes = [], onUpdate, onDelete, onAddMod, onRemoveMod }) {
  const [expandido, setExpandido] = useState(false)
  const [editando, setEditando] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editTipo, setEditTipo] = useState('passiva')
  const [editRecNome, setEditRecNome] = useState('')
  const [editRecMax, setEditRecMax] = useState('')
  const [editNivelMin, setEditNivelMin] = useState('') // 19.5
  const [salvando, setSalvando] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [erro, setErro] = useState('')

  async function handleUpdate() {
    if (!editNome.trim()) { setErro('Nome obrigatório.'); return }
    if (editTipo === 'ativavel' && editRecNome.trim() &&
        (editRecMax === '' || isNaN(Number(editRecMax)) || Number(editRecMax) < 1)) {
      setErro('Informe um máximo de usos válido (número positivo).'); return
    }
    setSalvando(true); setErro('')
    try {
      await onUpdate(habilidade.id, {
        nome: editNome, descricao: editDesc, tipo: editTipo,
        recurso_nome: editTipo === 'ativavel' ? editRecNome : '',
        recurso_max: editTipo === 'ativavel' && editRecNome.trim() ? editRecMax : null,
        nivel_minimo: editNivelMin,
      })
      setEditando(false)
    } catch (err) {
      setErro(err.message || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Remover "${habilidade.nome}"? Todos os modificadores serão apagados.`)) return
    setDeleting(true)
    try { await onDelete(habilidade.id) } catch { setDeleting(false) }
  }

  function startEdit() {
    setEditNome(habilidade.nome)
    setEditDesc(habilidade.descricao || '')
    setEditTipo(habilidade.tipo || 'passiva')
    setEditRecNome(habilidade.recurso_nome || '')
    setEditRecMax(habilidade.recurso_max != null ? String(habilidade.recurso_max) : '')
    setEditNivelMin(habilidade.nivel_minimo != null ? String(habilidade.nivel_minimo) : '')
    setErro(''); setEditando(true)
  }

  const tipoBadge = habilidade.tipo === 'ativavel'
    ? 'bg-blue-900/60 border border-blue-700/60 text-blue-300'
    : 'bg-green-900/60 border border-green-700/60 text-green-300'

  return (
    <div className="bg-slate-700/50 border border-purple-900/50 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        {editando ? (
          <div className="flex-1 space-y-2">
            <input type="text" value={editNome} onChange={e => setEditNome(e.target.value)}
              placeholder="Nome" autoFocus className={INP} />
            <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)}
              placeholder="Descrição (opcional)" className={INP} />
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <p className="text-purple-400 text-xs mb-1">Tipo</p>
                <select value={editTipo} onChange={e => setEditTipo(e.target.value)} className={SEL}>
                  <option value="passiva">Passiva (sempre ativa)</option>
                  <option value="ativavel">Ativável (toggle on/off)</option>
                </select>
              </div>
              {editTipo === 'ativavel' && (
                <>
                  <div>
                    <p className="text-purple-400 text-xs mb-1">Recurso (opcional)</p>
                    <input type="text" value={editRecNome} onChange={e => setEditRecNome(e.target.value)}
                      placeholder="Ex: Pontos de Fúria" className={`${SEL} w-44`} />
                  </div>
                  {editRecNome.trim() && (
                    <div>
                      <p className="text-purple-400 text-xs mb-1">Máximo</p>
                      <input type="number" value={editRecMax} onChange={e => setEditRecMax(e.target.value)}
                        min="1" className={`${SEL} w-20 text-center`} />
                    </div>
                  )}
                </>
              )}
              {/* 19.5 — requisito de nível */}
              <div>
                <p className="text-purple-400 text-xs mb-1">Nível mínimo</p>
                <input type="number" value={editNivelMin} onChange={e => setEditNivelMin(e.target.value)}
                  min="1" placeholder="—" className={`${SEL} w-20 text-center`}
                  title="Só é concedida a partir deste nível (da classe de origem; raça/avulsa usam o nível total)." />
              </div>
            </div>
            {erro && <p className="text-red-400 text-xs">{erro}</p>}
            <div className="flex gap-2">
              <button onClick={handleUpdate} disabled={salvando}
                className="px-3 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">
                {salvando ? '...' : '✓ Salvar'}
              </button>
              <button onClick={() => setEditando(false)}
                className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded-lg transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <button onClick={() => setExpandido(!expandido)} className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-white text-xs font-medium">{habilidade.nome}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tipoBadge}`}>
                  {habilidade.tipo === 'ativavel' ? 'Ativável' : 'Passiva'}
                </span>
                {habilidade.tipo === 'ativavel' && habilidade.recurso_nome && (
                  <span className="text-amber-400 text-[10px]">
                    {habilidade.recurso_nome} · {habilidade.recurso_max ?? '?'} usos
                  </span>
                )}
              </div>
              {habilidade.descricao && (
                <p className="text-purple-500 text-[11px] mt-0.5 truncate">{habilidade.descricao}</p>
              )}
            </button>
            {habilidade.modificadores.length > 0 && (
              <span className="text-purple-600 text-[10px] shrink-0">{habilidade.modificadores.length} mod.</span>
            )}
            <button onClick={startEdit}
              className="p-1.5 text-purple-500 hover:text-purple-300 hover:bg-purple-900/40 rounded-lg transition-colors shrink-0"
              title="Editar">✎</button>
            <button onClick={handleDelete} disabled={deleting}
              className="p-1.5 text-red-600 hover:text-red-400 hover:bg-red-950/50 rounded-lg transition-colors shrink-0 disabled:opacity-50"
              title="Remover">🗑</button>
            <button onClick={() => setExpandido(!expandido)}
              className="p-1.5 text-purple-500 hover:text-purple-300 rounded-lg transition-colors shrink-0 text-xs">
              {expandido ? '▲' : '▼'}
            </button>
          </>
        )}
      </div>
      {expandido && !editando && (
        <ModificadoresExpandido
          modificadores={habilidade.modificadores}
          onAddMod={onAddMod}
          onRemoveMod={onRemoveMod}
          atributos={atributos}
          camposCombate={camposCombate}
          pericias={pericias} classes={classes}
        />
      )}
    </div>
  )
}

// Seção de habilidades vinculadas que aparece dentro do card expandido de uma raça ou classe.
function HabilidadesVinculadas({
  parentId, parentTipo,
  habilidades, atributos, camposCombate, pericias = [], classes = [],
  onCreate, onUpdate, onDelete, onAddMod, onRemoveMod,
}) {
  const [addingNew, setAddingNew] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novaDesc, setNovaDesc] = useState('')
  const [novoTipo, setNovoTipo] = useState('passiva')
  const [novoRecNome, setNovoRecNome] = useState('')
  const [novoRecMax, setNovoRecMax] = useState('')
  const [novoNivelMin, setNovoNivelMin] = useState('') // 19.5
  const [criando, setCriando] = useState(false)
  const [erroNovo, setErroNovo] = useState('')

  const vinculadas = habilidades.filter(h =>
    parentTipo === 'raca' ? h.raca_id === parentId : h.classe_id === parentId
  )

  function resetNovo() {
    setNovoNome(''); setNovaDesc(''); setNovoTipo('passiva')
    setNovoRecNome(''); setNovoRecMax(''); setNovoNivelMin(''); setErroNovo('')
  }

  async function handleCreate() {
    if (!novoNome.trim()) { setErroNovo('Nome obrigatório.'); return }
    if (novoTipo === 'ativavel' && novoRecNome.trim() &&
        (novoRecMax === '' || isNaN(Number(novoRecMax)) || Number(novoRecMax) < 1)) {
      setErroNovo('Informe um máximo de usos válido (número positivo).'); return
    }
    setCriando(true); setErroNovo('')
    try {
      const idField = parentTipo === 'raca' ? 'raca_id' : 'classe_id'
      const otherField = parentTipo === 'raca' ? 'classe_id' : 'raca_id'
      await onCreate({
        nome: novoNome, descricao: novaDesc, tipo: novoTipo,
        recurso_nome: novoTipo === 'ativavel' ? novoRecNome : '',
        recurso_max: novoTipo === 'ativavel' && novoRecNome.trim() ? novoRecMax : null,
        nivel_minimo: novoNivelMin, // 19.5
        [idField]: parentId,
        [otherField]: null,
      })
      setAddingNew(false); resetNovo()
    } catch (err) {
      setErroNovo(err.message || 'Erro ao criar.')
    } finally {
      setCriando(false)
    }
  }

  return (
    <div className="border-t border-purple-900/60 px-4 py-3 space-y-2 bg-slate-900/20">
      <div className="flex items-center justify-between">
        <p className="text-purple-400 text-xs font-semibold uppercase tracking-wider">Habilidades</p>
        {!addingNew && (
          <button onClick={() => setAddingNew(true)}
            className="text-xs px-2.5 py-1 bg-purple-900/60 hover:bg-purple-800 text-purple-300 hover:text-white rounded-lg transition-colors border border-purple-700/50">
            + Nova habilidade
          </button>
        )}
      </div>

      {addingNew && (
        <div className="bg-slate-800 border border-purple-800 rounded-lg p-3 space-y-2">
          <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)}
            placeholder="Nome da habilidade *" autoFocus onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className={INP} />
          <input type="text" value={novaDesc} onChange={e => setNovaDesc(e.target.value)}
            placeholder="Descrição (opcional)" className={INP} />
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <p className="text-purple-400 text-xs mb-1">Tipo</p>
              <select value={novoTipo} onChange={e => setNovoTipo(e.target.value)} className={SEL}>
                <option value="passiva">Passiva (sempre ativa)</option>
                <option value="ativavel">Ativável (toggle on/off)</option>
              </select>
            </div>
            {novoTipo === 'ativavel' && (
              <>
                <div>
                  <p className="text-purple-400 text-xs mb-1">Recurso (opcional)</p>
                  <input type="text" value={novoRecNome} onChange={e => setNovoRecNome(e.target.value)}
                    placeholder="Ex: Pontos de Fúria" className={`${SEL} w-40`} />
                </div>
                {novoRecNome.trim() && (
                  <div>
                    <p className="text-purple-400 text-xs mb-1">Máximo</p>
                    <input type="number" value={novoRecMax} onChange={e => setNovoRecMax(e.target.value)}
                      min="1" placeholder="4" className={`${SEL} w-20 text-center`} />
                  </div>
                )}
              </>
            )}
            {/* 19.5 — requisito de nível */}
            <div>
              <p className="text-purple-400 text-xs mb-1">Nível mínimo</p>
              <input type="number" value={novoNivelMin} onChange={e => setNovoNivelMin(e.target.value)}
                min="1" placeholder="—" className={`${SEL} w-20 text-center`}
                title="Só é concedida a partir deste nível (da classe de origem; raça/avulsa usam o nível total)." />
            </div>
          </div>
          {erroNovo && <p className="text-red-400 text-xs">{erroNovo}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={criando}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">
              {criando ? 'Criando...' : 'Criar'}
            </button>
            <button onClick={() => { setAddingNew(false); resetNovo() }}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {vinculadas.length === 0 && !addingNew && (
        <p className="text-purple-700 text-xs italic">Nenhuma habilidade vinculada ainda.</p>
      )}
      {vinculadas.map(h => (
        <HabilidadeVinculadaCard
          key={h.id}
          habilidade={h}
          atributos={atributos}
          camposCombate={camposCombate}
          pericias={pericias} classes={classes}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onAddMod={mod => onAddMod({ habilidade_id: h.id, ...mod })}
          onRemoveMod={onRemoveMod}
        />
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Raças & Classes
// ──────────────────────────────────────────────────────────

function ItemCard({
  item, parentTipo,
  onUpdate, onDelete, onAddMod, onRemoveMod,
  atributos, camposCombate, pericias = [], classes = [],
  habilidades, onCreateHabilidade, onUpdateHabilidade, onDeleteHabilidade,
  onAddHabilidadeMod, onRemoveHabilidadeMod,
}) {
  const [expandido, setExpandido] = useState(false)
  const [editando, setEditando] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [erro, setErro] = useState('')

  async function handleUpdate() {
    if (!editNome.trim()) { setErro('Nome obrigatório.'); return }
    setSalvando(true); setErro('')
    try {
      await onUpdate(item.id, editNome, editDesc)
      setEditando(false)
    } catch (err) {
      setErro(err.message || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Remover "${item.nome}"?\nTodos os modificadores e habilidades vinculadas serão apagados.`)) return
    setDeleting(true)
    try { await onDelete(item.id) } catch { setDeleting(false) }
  }

  function startEdit() {
    setEditNome(item.nome); setEditDesc(item.descricao || ''); setErro(''); setEditando(true)
  }

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        {editando ? (
          <div className="flex-1 space-y-2">
            <input type="text" value={editNome} onChange={e => setEditNome(e.target.value)}
              placeholder="Nome" autoFocus
              className="w-full px-3 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)}
              placeholder="Descrição (opcional)"
              className="w-full px-3 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            {erro && <p className="text-red-400 text-xs">{erro}</p>}
            <div className="flex gap-2">
              <button onClick={handleUpdate} disabled={salvando}
                className="px-3 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">
                {salvando ? '...' : '✓ Salvar'}
              </button>
              <button onClick={() => setEditando(false)}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <button onClick={() => setExpandido(!expandido)} className="flex-1 text-left min-w-0">
              <p className="text-white font-medium text-sm truncate">{item.nome}</p>
              {item.descricao && (
                <p className="text-purple-400 text-xs truncate mt-0.5">{item.descricao}</p>
              )}
            </button>
            {item.modificadores.length > 0 && (
              <span className="text-purple-600 text-[11px] shrink-0">{item.modificadores.length} mod.</span>
            )}
            <button onClick={startEdit}
              className="p-1.5 text-purple-500 hover:text-purple-300 hover:bg-purple-900/40 rounded-lg transition-colors shrink-0"
              title="Editar">✎</button>
            <button onClick={handleDelete} disabled={deleting}
              className="p-1.5 text-red-600 hover:text-red-400 hover:bg-red-950/50 rounded-lg transition-colors shrink-0 disabled:opacity-50"
              title="Remover">🗑</button>
            <button onClick={() => setExpandido(!expandido)}
              className="p-1.5 text-purple-500 hover:text-purple-300 rounded-lg transition-colors shrink-0 text-xs">
              {expandido ? '▲' : '▼'}
            </button>
          </>
        )}
      </div>

      {expandido && !editando && (
        <>
          <ModificadoresExpandido
            modificadores={item.modificadores}
            onAddMod={onAddMod}
            onRemoveMod={onRemoveMod}
            atributos={atributos}
            camposCombate={camposCombate}
            pericias={pericias} classes={classes}
          />
          <HabilidadesVinculadas
            parentId={item.id}
            parentTipo={parentTipo}
            habilidades={habilidades}
            atributos={atributos}
            camposCombate={camposCombate}
            pericias={pericias} classes={classes}
            onCreate={onCreateHabilidade}
            onUpdate={onUpdateHabilidade}
            onDelete={onDeleteHabilidade}
            onAddMod={onAddHabilidadeMod}
            onRemoveMod={onRemoveHabilidadeMod}
          />
        </>
      )}
    </div>
  )
}

function SecaoRacaClasse({
  titulo, descTipo, itens, parentTipo,
  onCreate, onUpdate, onDelete, onAddMod, onRemoveMod,
  atributos, camposCombate, pericias = [], classes = [],
  habilidades, onCreateHabilidade, onUpdateHabilidade, onDeleteHabilidade,
  onAddHabilidadeMod, onRemoveHabilidadeMod,
}) {
  const [addingNew, setAddingNew] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novaDesc, setNovaDesc] = useState('')
  const [criando, setCriando] = useState(false)
  const [erroNovo, setErroNovo] = useState('')

  async function handleCreate() {
    if (!novoNome.trim()) { setErroNovo('Nome obrigatório.'); return }
    setCriando(true); setErroNovo('')
    try {
      await onCreate(novoNome, novaDesc)
      setAddingNew(false); setNovoNome(''); setNovaDesc('')
    } catch (err) {
      setErroNovo(err.message || 'Erro ao criar.')
    } finally {
      setCriando(false)
    }
  }

  function cancelarNovo() {
    setAddingNew(false); setNovoNome(''); setNovaDesc(''); setErroNovo('')
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-purple-200 text-sm font-semibold">{titulo}</p>
        {!addingNew && (
          <button onClick={() => setAddingNew(true)}
            className="text-sm px-3 py-1.5 bg-purple-800 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + Adicionar
          </button>
        )}
      </div>

      {addingNew && (
        <div className="bg-slate-800 border border-purple-700 rounded-xl p-4 space-y-3">
          <p className="text-purple-300 text-xs font-medium">Nova {descTipo}</p>
          <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)}
            placeholder={`Nome da ${descTipo} *`} autoFocus
            onKeyDown={e => e.key === 'Enter' && handleCreate()} className={inputClass} />
          <input type="text" value={novaDesc} onChange={e => setNovaDesc(e.target.value)}
            placeholder="Descrição (opcional)" className={inputClass} />
          {erroNovo && <p className="text-red-400 text-xs">{erroNovo}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={criando}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
              {criando ? 'Criando...' : 'Criar'}
            </button>
            <button onClick={cancelarNovo}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {itens.length === 0 && !addingNew ? (
        <div className="border border-dashed border-purple-800 rounded-xl py-4 px-4">
          <p className="text-purple-600 text-xs">
            Nenhuma {descTipo} definida. Crie uma para configurar seus modificadores e habilidades.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {itens.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              parentTipo={parentTipo}
              onUpdate={onUpdate}
              onDelete={onDelete}
              // Vincula item.id antes de repassar — garante que o modificador vai para a raça/classe correta
              onAddMod={mod => onAddMod(item.id, mod)}
              onRemoveMod={onRemoveMod}
              atributos={atributos}
              camposCombate={camposCombate}
              pericias={pericias} classes={classes}
              habilidades={habilidades}
              onCreateHabilidade={onCreateHabilidade}
              onUpdateHabilidade={onUpdateHabilidade}
              onDeleteHabilidade={onDeleteHabilidade}
              onAddHabilidadeMod={onAddHabilidadeMod}
              onRemoveHabilidadeMod={onRemoveHabilidadeMod}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Habilidades avulsas (sem raça nem classe)
// ──────────────────────────────────────────────────────────

function SecaoHabilidades({ habilidades, atributos, camposCombate, pericias = [], classes = [], onCreate, onUpdate, onDelete, onAddMod, onRemoveMod }) {
  const avulsas = habilidades.filter(h => !h.raca_id && !h.classe_id)

  const [addingNew, setAddingNew] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novaDesc, setNovaDesc] = useState('')
  const [novoTipo, setNovoTipo] = useState('passiva')
  const [novoRecNome, setNovoRecNome] = useState('')
  const [novoRecMax, setNovoRecMax] = useState('')
  const [novoNivelMin, setNovoNivelMin] = useState('') // 19.5
  const [criando, setCriando] = useState(false)
  const [erroNovo, setErroNovo] = useState('')

  function resetNovo() {
    setNovoNome(''); setNovaDesc(''); setNovoTipo('passiva')
    setNovoRecNome(''); setNovoRecMax(''); setNovoNivelMin(''); setErroNovo('')
  }

  async function handleCreate() {
    if (!novoNome.trim()) { setErroNovo('Nome obrigatório.'); return }
    if (novoTipo === 'ativavel' && novoRecNome.trim() &&
        (novoRecMax === '' || isNaN(Number(novoRecMax)) || Number(novoRecMax) < 1)) {
      setErroNovo('Informe um máximo de usos válido (número positivo).'); return
    }
    setCriando(true); setErroNovo('')
    try {
      await onCreate({
        nome: novoNome, descricao: novaDesc, tipo: novoTipo,
        recurso_nome: novoTipo === 'ativavel' ? novoRecNome : '',
        recurso_max: novoTipo === 'ativavel' && novoRecNome.trim() ? novoRecMax : null,
        nivel_minimo: novoNivelMin, // 19.5
        raca_id: null,
        classe_id: null,
      })
      setAddingNew(false); resetNovo()
    } catch (err) {
      setErroNovo(err.message || 'Erro ao criar.')
    } finally {
      setCriando(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-purple-200 text-sm font-semibold">Habilidades avulsas</p>
          <p className="text-purple-600 text-xs mt-0.5">
            Não vinculadas a raça ou classe — adicionadas manualmente às fichas.
          </p>
        </div>
        {!addingNew && (
          <button onClick={() => setAddingNew(true)}
            className="text-sm px-3 py-1.5 bg-purple-800 hover:bg-purple-700 text-white rounded-lg transition-colors shrink-0">
            + Adicionar
          </button>
        )}
      </div>

      {addingNew && (
        <div className="bg-slate-800 border border-purple-700 rounded-xl p-4 space-y-3">
          <p className="text-purple-300 text-xs font-medium">Nova habilidade avulsa</p>
          <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)}
            placeholder="Nome da habilidade *" autoFocus onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className={INP} />
          <input type="text" value={novaDesc} onChange={e => setNovaDesc(e.target.value)}
            placeholder="Descrição (opcional)" className={INP} />
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <p className="text-purple-400 text-xs mb-1">Tipo</p>
              <select value={novoTipo} onChange={e => setNovoTipo(e.target.value)} className={SEL}>
                <option value="passiva">Passiva (sempre ativa)</option>
                <option value="ativavel">Ativável (toggle on/off)</option>
              </select>
            </div>
            {novoTipo === 'ativavel' && (
              <>
                <div>
                  <p className="text-purple-400 text-xs mb-1">Recurso (opcional)</p>
                  <input type="text" value={novoRecNome} onChange={e => setNovoRecNome(e.target.value)}
                    placeholder="Ex: Pontos de Fúria" className={`${SEL} w-44`} />
                </div>
                {novoRecNome.trim() && (
                  <div>
                    <p className="text-purple-400 text-xs mb-1">Máximo</p>
                    <input type="number" value={novoRecMax} onChange={e => setNovoRecMax(e.target.value)}
                      min="1" placeholder="4" className={`${SEL} w-20 text-center`} />
                  </div>
                )}
              </>
            )}
            {/* 19.5 — requisito de nível */}
            <div>
              <p className="text-purple-400 text-xs mb-1">Nível mínimo</p>
              <input type="number" value={novoNivelMin} onChange={e => setNovoNivelMin(e.target.value)}
                min="1" placeholder="—" className={`${SEL} w-20 text-center`}
                title="Só é concedida a partir deste nível (da classe de origem; raça/avulsa usam o nível total)." />
            </div>
          </div>
          {erroNovo && <p className="text-red-400 text-xs">{erroNovo}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={criando}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
              {criando ? 'Criando...' : 'Criar'}
            </button>
            <button onClick={() => { setAddingNew(false); resetNovo() }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {avulsas.length === 0 && !addingNew ? (
        <div className="border border-dashed border-purple-800 rounded-xl py-4 px-4">
          <p className="text-purple-600 text-xs">
            Nenhuma habilidade avulsa. Crie uma passiva ou ativável que jogadores poderão adicionar manualmente às fichas.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {avulsas.map(h => (
            <HabilidadeVinculadaCard
              key={h.id}
              habilidade={h}
              atributos={atributos}
              camposCombate={camposCombate}
              pericias={pericias} classes={classes}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddMod={mod => onAddMod({ habilidade_id: h.id, ...mod })}
              onRemoveMod={onRemoveMod}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────

export default function RacasClassesEditor({ sistemaId, atributos, camposCombate, pericias = [] }) {
  const {
    racas, classes, loading, error,
    createRaca, updateRaca, deleteRaca,
    createClasse, updateClasse, deleteClasse,
    addModificador, removeModificador,
  } = useRacasClasses(sistemaId)

  const {
    habilidades, loading: loadingHabs, error: errorHabs,
    createHabilidade, updateHabilidade, deleteHabilidade,
    addModificador: addHabMod, removeModificador: removeHabMod,
    refetch: refetchHabilidades,
  } = useHabilidades(sistemaId)

  if (!sistemaId) {
    return (
      <div className="border border-dashed border-purple-800 rounded-xl py-6 px-4 text-center">
        <p className="text-purple-500 text-sm">Salve o sistema antes de criar raças e classes.</p>
        <p className="text-purple-600 text-xs mt-1">
          Clique em "Salvar sistema" acima e volte a esta aba.
        </p>
      </div>
    )
  }

  if (loading || loadingHabs) {
    return <div className="py-8 text-center text-purple-400 text-sm">Carregando...</div>
  }

  if (error || errorHabs) {
    return <div className="py-8 text-center text-red-400 text-sm">{error || errorHabs}</div>
  }

  const atributosSalvos = atributos.filter(a => a.id && !a.id.startsWith('temp_'))
  const periciasSalvas = pericias.filter(p => p.id && !p.id.startsWith('temp_'))

  // Após deletar raça/classe, o CASCADE do banco remove as habilidades vinculadas.
  // Fazemos refetch para sincronizar o estado local.
  async function handleDeleteRaca(id) {
    await deleteRaca(id)
    refetchHabilidades()
  }

  async function handleDeleteClasse(id) {
    await deleteClasse(id)
    refetchHabilidades()
  }

  return (
    <div className="space-y-8">
      <SecaoRacaClasse
        titulo="Raças"
        descTipo="raça"
        itens={racas}
        parentTipo="raca"
        onCreate={createRaca}
        onUpdate={updateRaca}
        onDelete={handleDeleteRaca}
        onAddMod={(itemId, mod) => addModificador({ raca_id: itemId, ...mod })}
        onRemoveMod={removeModificador}
        atributos={atributosSalvos}
        camposCombate={camposCombate}
        pericias={periciasSalvas}
        classes={classes}
        habilidades={habilidades}
        onCreateHabilidade={createHabilidade}
        onUpdateHabilidade={updateHabilidade}
        onDeleteHabilidade={deleteHabilidade}
        onAddHabilidadeMod={addHabMod}
        onRemoveHabilidadeMod={removeHabMod}
      />

      <div className="border-t border-purple-900" />

      <SecaoRacaClasse
        titulo="Classes"
        descTipo="classe"
        itens={classes}
        parentTipo="classe"
        onCreate={createClasse}
        onUpdate={updateClasse}
        onDelete={handleDeleteClasse}
        onAddMod={(itemId, mod) => addModificador({ classe_id: itemId, ...mod })}
        onRemoveMod={removeModificador}
        atributos={atributosSalvos}
        camposCombate={camposCombate}
        pericias={periciasSalvas}
        classes={classes}
        habilidades={habilidades}
        onCreateHabilidade={createHabilidade}
        onUpdateHabilidade={updateHabilidade}
        onDeleteHabilidade={deleteHabilidade}
        onAddHabilidadeMod={addHabMod}
        onRemoveHabilidadeMod={removeHabMod}
      />

      <div className="border-t border-purple-900" />

      <SecaoHabilidades
        habilidades={habilidades}
        atributos={atributosSalvos}
        camposCombate={camposCombate}
        pericias={periciasSalvas}
        classes={classes}
        onCreate={createHabilidade}
        onUpdate={updateHabilidade}
        onDelete={deleteHabilidade}
        onAddMod={addHabMod}
        onRemoveMod={removeHabMod}
      />

      <div className="border-t border-purple-900" />

      {/* Fase 19.6 — recompensas por nível (checklist-guia) */}
      <RecompensasEditor sistemaId={sistemaId} classes={classes} />
    </div>
  )
}
