import { useState } from 'react'
import { useRolagem } from '../../hooks/useRolagem'
import { useSistema } from '../../hooks/useSistema'
import { validarNotacao } from '../../lib/diceNotation'
import { descreverResultado } from '../../lib/resolutionEngine'
import { tocarSomDado, estimarNumDados } from '../../lib/diceSounds'
import { usePreferencias } from '../../context/PreferenciasContext'
import Dice3D from './Dice3D'
import Botao from '../ui/Botao'
import Icone from '../ui/Icone'
import { montarNotacao, naturalD20 } from '../../lib/natural'

const LADOS = [4, 6, 8, 10, 12, 20, 100]

/** Número com − e + (quantidade, modificador). */
function Passo({ rotulo, valor, min, max, sinal = false, onMudar }) {
  const mudar = v => onMudar(Math.max(min, Math.min(max, v)))
  return (
    <div>
      <span className="block text-ink-dim text-xs font-semibold uppercase tracking-wider mb-1">{rotulo}</span>
      <div className="inline-flex items-center rounded-xl border border-border bg-void/60">
        <button type="button" onClick={() => mudar(valor - 1)} disabled={valor <= min} aria-label={`${rotulo}: menos um`} className="botao-icone !rounded-l-xl !rounded-r-none disabled:opacity-40"><Icone nome="menos" tamanho={16} /></button>
        <span className="w-12 text-center font-mono font-semibold text-ink tabular-nums" aria-live="polite" aria-label={rotulo}>{sinal && valor > 0 ? `+${valor}` : valor}</span>
        <button type="button" onClick={() => mudar(valor + 1)} disabled={valor >= max} aria-label={`${rotulo}: mais um`} className="botao-icone !rounded-r-xl !rounded-l-none disabled:opacity-40"><Icone nome="mais" tamanho={16} /></button>
      </div>
    </div>
  )
}

const COR_TXT = { verde: 'text-ok', ambar: 'text-dice-400', vermelho: 'text-harm', roxo: 'text-ink' }

function ResultadoDisplay({ resultado, rotulo, rolando, skin }) {
  const { notacao, dados, mantidos, descartados, modificador, total } = resultado
  const natural = rolando ? null : naturalD20(dados)

  return (
    <div className={`resultado-rolagem rounded-2xl border p-5 space-y-4 ${
      natural === 'critico' ? 'rolagem-critica border-dice-400/70 bg-dice-700/10'
        : natural === 'falha' ? 'rolagem-falha border-harm/60 bg-harm/5'
        : 'border-border/70 bg-raised/60'
    }`}>
      <div className="flex items-baseline gap-2 flex-wrap">
        {rotulo && <span className="text-ink font-semibold">{rotulo}</span>}
        <span className="text-ink-dim font-mono text-sm">{notacao}</span>
        {natural && (
          <span className={`ml-auto text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${natural === 'critico' ? 'text-dice-200 border-dice-400/70 bg-dice-700/30' : 'text-harm border-harm/60 bg-harm/10'}`}>
            {natural === 'critico' ? 'Crítico natural' : 'Falha natural'}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        {dados.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Dice3D lados={d.lados} resultado={d.valor} rolando={rolando} descartado={d.descartado} skin={skin} />
            {d.descartado && <span className="text-harm text-xs leading-none">descartado</span>}
          </div>
        ))}
      </div>
      <div className="flex items-end gap-4 flex-wrap pt-3 border-t border-border/60">
        <div>
          <span className="block text-ink-dim text-xs font-semibold uppercase tracking-wider">Total</span>
          <span key={rolando ? 'r' : total} className={`block font-sora text-5xl font-bold leading-none tabular-nums ${rolando ? 'text-ink-dim' : 'total-salta'} ${natural === 'critico' ? 'text-dice-400' : natural === 'falha' ? 'text-harm' : 'text-ink'}`} aria-live="polite">
            {rolando ? '…' : total}
          </span>
        </div>
        {(mantidos.length > 1 || modificador !== 0) && (
          <span className="text-ink-dim text-sm pb-1 font-mono">
            {mantidos.join(' + ')}{modificador > 0 && ` + ${modificador}`}{modificador < 0 && ` − ${Math.abs(modificador)}`}
          </span>
        )}
        {descartados.length > 0 && <span className="text-harm text-xs ml-auto pb-1">descartados: {descartados.join(', ')}</span>}
      </div>
    </div>
  )
}

// 23.3 — resultado dos modos de resolução no próprio rolador
function ResultadoModoDisplay({ resultado, rotulo, rolando, skin }) {
  const desc = descreverResultado(resultado.estruturado)
  const cor = COR_TXT[desc?.cor] || COR_TXT.roxo
  return (
    <div className="bg-raised/60 border border-border/50 rounded-2xl p-5 space-y-3">
      <div className="flex items-baseline gap-2 flex-wrap">
        {rotulo && <span className="text-ink font-semibold">{rotulo}</span>}
        <span className="text-ink-dim font-mono text-sm">{resultado.notacao}</span>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {resultado.dados.map((d, i) => (
          <div key={i} className={`rounded-lg ${d.sucesso ? 'ring-1 ring-ok/70' : ''} ${d.especial ? 'ring-1 ring-harm/80' : ''}`}>
            <Dice3D lados={d.lados} resultado={d.valor} rolando={rolando} descartado={d.descartado} skin={skin} />
          </div>
        ))}
      </div>
      {desc && <p className={`text-lg font-bold ${cor}`}>{desc.texto}</p>}
      {desc?.textoFaixa && <p className="text-accent-300 text-sm italic">"{desc.textoFaixa}"</p>}
      {desc?.marcacao && (
        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-lg border bg-harm/10 border-harm/60 text-harm">
          ⚡ {desc.marcacao.rotulo}{desc.marcacao.texto ? ` — ${desc.marcacao.texto}` : ''}
        </span>
      )}
    </div>
  )
}

const INP = 'px-3 py-2 rounded-xl bg-void border border-border text-ink placeholder:text-ink-dim focus:outline-none focus:ring-2 focus:ring-accent-500'
const ROTULOS_VALOR = { sucessos: 'Parada (nº de dados)', roll_under: 'Alvo', faixas: 'Modificador' }

/**
 * Rolador genérico. Segue o MODO de resolução do sistema (23.3): soma usa notação
 * livre; sucessos/roll_under/faixas pedem parada/alvo/modificador + dif ad-hoc.
 */
export default function RoladorGenerico({ mesaId, fichaId = null }) {
  const { registrarRolagem, registrarResolvida, rolando: salvando, erro: erroHook } = useRolagem()
  const { sistema } = useSistema(mesaId)
  const { preferencias } = usePreferencias()
  const resolucao = sistema?.config_layout?.resolucao || null
  const modo = resolucao?.modo || 'soma'

  const [lados, setLados] = useState(20)   // F52 — rolador rápido
  const [qtd, setQtd] = useState(1)
  const [mod, setMod] = useState(0)
  const [livre, setLivre] = useState('')   // notação escrita à mão (tem prioridade)
  const [vez, setVez] = useState(0)
  const [rotulo, setRotulo] = useState('')
  const [valor, setValor] = useState('')       // parada / alvo / modificador
  const [dificuldade, setDificuldade] = useState('')
  const [especiaisQtd, setEspeciaisQtd] = useState('')
  const [resultado, setResultado] = useState(null)
  const [rotuloDisplay, setRotuloDisplay] = useState('')
  const [rolando, setRolando] = useState(false)
  const [erroLocal, setErroLocal] = useState('')

  const especiaisAtivo = modo === 'sucessos' && resolucao?.dados_especiais?.ativo

  async function handleRolarSoma() {
    const n = livre.trim() || montarNotacao(qtd, lados, mod)
    if (!validarNotacao(n)) { setErroLocal(`Notação inválida: "${n}". Exemplos: 1d20, 2d6+3, 4d6kh3`); return }
    setErroLocal('')
    tocarSomDado(preferencias.dado_skin, { ativo: preferencias.som_ativo, volume: preferencias.som_volume, numDados: estimarNumDados(n) })
    try {
      const res = await registrarRolagem({ mesaId, fichaId, rotulo: rotulo.trim() || null, notacao: n })
      setResultado({ ...res, _soma: true }); setVez(v => v + 1); setRotuloDisplay(rotulo.trim()); setRolando(true); setTimeout(() => setRolando(false), 900)
    } catch { /* erroHook */ }
  }

  async function handleRolarModo() {
    const v = Number(valor)
    if (valor === '' || Number.isNaN(v)) { setErroLocal(`Informe ${ROTULOS_VALOR[modo].toLowerCase()}.`); return }
    setErroLocal('')
    tocarSomDado(preferencias.dado_skin, { ativo: preferencias.som_ativo, volume: preferencias.som_volume, numDados: modo === 'sucessos' ? v : 2 })
    try {
      const res = await registrarResolvida({
        mesaId, fichaId, rotulo: rotulo.trim() || null, resolucao,
        valor: v,
        dificuldade: dificuldade === '' ? null : Number(dificuldade),
        especiaisQtd: especiaisAtivo && especiaisQtd !== '' ? Number(especiaisQtd) : 0,
      })
      setResultado({ ...res, _soma: false }); setRotuloDisplay(rotulo.trim()); setRolando(true); setTimeout(() => setRolando(false), 1400)
    } catch { /* erroHook */ }
  }

  const erro = erroLocal || erroHook

  // ── Modo soma: escolha o dado, quantos e o modificador (ou escreva a notação) ──
  if (modo === 'soma') {
    const montada = montarNotacao(qtd, lados, mod)
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2" role="radiogroup" aria-label="Dado">
          {LADOS.map(l => {
            const ativo = !livre && lados === l
            return (
              <button
                key={l} type="button" role="radio" aria-checked={ativo}
                onClick={() => { setLados(l); setLivre(''); setErroLocal('') }}
                className={`cartao flex flex-col items-center gap-1 rounded-xl border py-2.5 font-mono font-semibold ${ativo ? 'selecionado text-ink' : 'border-border bg-void/40 text-ink-dim hover:text-ink'}`}
              >
                <Icone nome="dado" tamanho={20} className={ativo ? 'text-dice-400' : ''} />
                d{l}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <Passo rotulo="Quantidade" valor={qtd} min={1} max={30} onMudar={v => { setQtd(v); setLivre('') }} />
          <Passo rotulo="Modificador" valor={mod} min={-30} max={30} sinal onMudar={v => { setMod(v); setLivre('') }} />
          <div className="ml-auto flex items-center gap-3">
            <span className="font-mono text-lg text-ink" aria-label="Notação que vai rolar">{livre.trim() || montada}</span>
            <Botao variante="primario" tamanho="lg" onClick={handleRolarSoma} disabled={rolando || salvando} className="px-6">
              <Icone nome="dado" tamanho={18} className={rolando ? 'animate-spin' : ''} /> Rolar
            </Botao>
          </div>
        </div>

        <details className="group/livre rounded-xl border border-border/70 px-4 py-3">
          <summary className="cursor-pointer text-sm text-ink-dim hover:text-ink list-none flex items-center gap-2">
            <Icone nome="chevron-dir" tamanho={14} className="transition-transform duration-normal group-open/livre:rotate-90" />
            Notação livre e rótulo <span className="text-xs">(2d6+3, 4d6kh3, 1d20…)</span>
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input type="text" value={livre} onChange={e => { setLivre(e.target.value); setErroLocal('') }}
              onKeyDown={e => e.key === 'Enter' && handleRolarSoma()} placeholder="Ex.: 2d6+3, 4d6kh3"
              aria-label="Notação livre" className="campo font-mono" />
            <input type="text" value={rotulo} onChange={e => setRotulo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRolarSoma()}
              placeholder="Rótulo: Iniciativa, Ataque…" aria-label="Rótulo da rolagem" className="campo" />
          </div>
        </details>

        {erro && <p className="aviso-erro" role="alert">{erro}</p>}
        {resultado && <ResultadoDisplay key={vez} resultado={resultado} rotulo={rotuloDisplay} rolando={rolando} skin={preferencias.dado_skin} />}
      </div>
    )
  }

  // ── Modos de resolução: parada / alvo / modificador ─────────────────────────
  const dificuldadePlaceholder = modo === 'sucessos' ? String(resolucao.dificuldade_padrao ?? 6) : ''
  return (
    <div className="space-y-4">
      <div className="text-xs text-ink-dim bg-void/40 border border-border/50 rounded-lg px-3 py-2">
        Modo <span className="font-semibold text-ink">{modo}</span> —
        {modo === 'sucessos' && ` parada de d${resolucao.dado || 10}, cada ≥ dificuldade conta 1 sucesso.`}
        {modo === 'roll_under' && ` role 1d${resolucao.dado || 100} ≤ o alvo.`}
        {modo === 'faixas' && ` ${resolucao.notacao_base || '2d6'} + modificador cai numa faixa.`}
      </div>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-accent-300 text-sm flex flex-col gap-1">
          {ROTULOS_VALOR[modo]}
          <input type="number" value={valor} onChange={e => { setValor(e.target.value); setErroLocal('') }}
            onKeyDown={e => e.key === 'Enter' && handleRolarModo()} placeholder="0" className={`${INP} w-32`} autoFocus />
        </label>
        {modo === 'sucessos' && (
          <label className="text-accent-300 text-sm flex flex-col gap-1">
            Dificuldade (ad-hoc)
            <input type="number" value={dificuldade} onChange={e => setDificuldade(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRolarModo()} placeholder={dificuldadePlaceholder} className={`${INP} w-28`} />
          </label>
        )}
        {modo === 'roll_under' && (
          <label className="text-accent-300 text-sm flex flex-col gap-1">
            Ajuste do alvo
            <input type="number" value={dificuldade} onChange={e => setDificuldade(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRolarModo()} placeholder="usa o valor" className={`${INP} w-28`} title="Deixe vazio p/ usar o valor acima como alvo" />
          </label>
        )}
        {especiaisAtivo && (
          <label className="text-accent-300 text-sm flex flex-col gap-1">
            {resolucao.dados_especiais.nome || 'Especiais'}
            <input type="number" value={especiaisQtd} onChange={e => setEspeciaisQtd(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRolarModo()} placeholder="0" className={`${INP} w-24`} />
          </label>
        )}
        <button onClick={handleRolarModo} disabled={rolando || salvando}
          className="px-6 py-3 bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-sobre-acento font-bold rounded-xl transition-colors shadow-lg shadow-void/40">
          {rolando ? '🎲' : 'Rolar'}
        </button>
      </div>
      <input type="text" value={rotulo} onChange={e => setRotulo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRolarModo()}
        placeholder="Rótulo opcional — Ex: Força + Briga, Investigar" className={`${INP} w-full text-sm`} />
      {erro && <div className="flex items-start gap-2 text-harm text-sm bg-harm/60 border border-harm/60 rounded-xl px-4 py-3"><span>⚠</span><span>{erro}</span></div>}
      {resultado && <ResultadoModoDisplay resultado={resultado} rotulo={rotuloDisplay} rolando={rolando} skin={preferencias.dado_skin} />}
    </div>
  )
}
