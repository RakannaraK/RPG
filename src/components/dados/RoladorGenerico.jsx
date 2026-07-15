import { useState } from 'react'
import { useRolagem } from '../../hooks/useRolagem'
import { useSistema } from '../../hooks/useSistema'
import { validarNotacao } from '../../lib/diceNotation'
import { descreverResultado } from '../../lib/resolutionEngine'
import { tocarSomDado, estimarNumDados } from '../../lib/diceSounds'
import { usePreferencias } from '../../context/PreferenciasContext'
import Dice3D from './Dice3D'

const ATALHOS = [
  { label: 'd4', notacao: '1d4' }, { label: 'd6', notacao: '1d6' }, { label: 'd8', notacao: '1d8' },
  { label: 'd10', notacao: '1d10' }, { label: 'd12', notacao: '1d12' }, { label: 'd20', notacao: '1d20' }, { label: 'd100', notacao: '1d100' },
]

const COR_TXT = { verde: 'text-green-300', ambar: 'text-amber-300', vermelho: 'text-red-300', roxo: 'text-purple-200' }

function ResultadoDisplay({ resultado, rotulo, rolando, skin }) {
  const { notacao, dados, mantidos, descartados, modificador, total } = resultado

  return (
    <div className="bg-slate-800/60 border border-purple-800/50 rounded-2xl p-5 space-y-4">
      <div className="flex items-baseline gap-2 flex-wrap">
        {rotulo && <span className="text-white font-semibold">{rotulo}</span>}
        <span className="text-purple-400 font-mono text-sm">{notacao}</span>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        {dados.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Dice3D lados={d.lados} resultado={d.valor} rolando={rolando} descartado={d.descartado} skin={skin} />
            {d.descartado && <span className="text-red-500 text-[10px] leading-none">descartado</span>}
          </div>
        ))}
      </div>
      <div className="flex items-baseline gap-3 flex-wrap pt-1 border-t border-purple-900/60">
        <span className="text-purple-400 text-sm">Total</span>
        <span className="text-4xl font-bold text-white leading-none">{total}</span>
        {(mantidos.length > 1 || modificador !== 0) && (
          <span className="text-purple-500 text-sm">
            ({mantidos.join(' + ')}{modificador > 0 && ` + ${modificador}`}{modificador < 0 && ` − ${Math.abs(modificador)}`})
          </span>
        )}
        {descartados.length > 0 && <span className="text-red-500 text-xs ml-auto">descartados: {descartados.join(', ')}</span>}
      </div>
    </div>
  )
}

// 23.3 — resultado dos modos de resolução no próprio rolador
function ResultadoModoDisplay({ resultado, rotulo, rolando, skin }) {
  const desc = descreverResultado(resultado.estruturado)
  const cor = COR_TXT[desc?.cor] || COR_TXT.roxo
  return (
    <div className="bg-slate-800/60 border border-purple-800/50 rounded-2xl p-5 space-y-3">
      <div className="flex items-baseline gap-2 flex-wrap">
        {rotulo && <span className="text-white font-semibold">{rotulo}</span>}
        <span className="text-purple-400 font-mono text-sm">{resultado.notacao}</span>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {resultado.dados.map((d, i) => (
          <div key={i} className={`rounded-lg ${d.sucesso ? 'ring-1 ring-green-500/70' : ''} ${d.especial ? 'ring-1 ring-red-500/80' : ''}`}>
            <Dice3D lados={d.lados} resultado={d.valor} rolando={rolando} descartado={d.descartado} skin={skin} />
          </div>
        ))}
      </div>
      {desc && <p className={`text-lg font-bold ${cor}`}>{desc.texto}</p>}
      {desc?.textoFaixa && <p className="text-purple-300 text-sm italic">"{desc.textoFaixa}"</p>}
      {desc?.marcacao && (
        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-md border bg-red-950/60 border-red-600/70 text-red-200">
          ⚡ {desc.marcacao.rotulo}{desc.marcacao.texto ? ` — ${desc.marcacao.texto}` : ''}
        </span>
      )}
    </div>
  )
}

const INP = 'px-3 py-2 rounded-xl bg-purple-950/70 border border-purple-700/70 text-white placeholder-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500'
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

  const [notacao, setNotacao] = useState('')
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
    const n = notacao.trim()
    if (!n) { setErroLocal('Digite uma notação de dados.'); return }
    if (!validarNotacao(n)) { setErroLocal(`Notação inválida: "${n}". Exemplos: 1d20, 2d6+3, 4d6kh3`); return }
    setErroLocal('')
    tocarSomDado(preferencias.dado_skin, { ativo: preferencias.som_ativo, volume: preferencias.som_volume, numDados: estimarNumDados(n) })
    try {
      const res = await registrarRolagem({ mesaId, fichaId, rotulo: rotulo.trim() || null, notacao: n })
      setResultado({ ...res, _soma: true }); setRotuloDisplay(rotulo.trim()); setRolando(true); setTimeout(() => setRolando(false), 1400)
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

  // ── Modo soma: notação livre (o de sempre) ──────────────────────────────────
  if (modo === 'soma') {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {ATALHOS.map(a => (
            <button key={a.label} onClick={() => { setNotacao(a.notacao); setErroLocal('') }}
              className={`px-3 py-1.5 text-sm font-mono font-semibold rounded-lg border transition-colors ${
                notacao === a.notacao ? 'bg-purple-600 border-purple-500 text-white' : 'bg-purple-950/50 border-purple-800 text-purple-300 hover:border-purple-600 hover:text-white'
              }`}>{a.label}</button>
          ))}
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input type="text" value={notacao} onChange={e => { setNotacao(e.target.value); setErroLocal('') }}
              onKeyDown={e => e.key === 'Enter' && handleRolarSoma()} placeholder="Ex: 2d6+3, 4d6kh3, 1d20"
              className={`${INP} flex-1 font-mono`} />
            <button onClick={handleRolarSoma} disabled={rolando || salvando}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-lg shadow-purple-900/40">
              {rolando ? '🎲' : 'Rolar'}
            </button>
          </div>
          <input type="text" value={rotulo} onChange={e => setRotulo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRolarSoma()}
            placeholder="Rótulo opcional — Ex: Iniciativa, Ataque, Dano" className={`${INP} w-full text-sm`} />
        </div>
        {erro && <div className="flex items-start gap-2 text-red-400 text-sm bg-red-950/60 border border-red-800/60 rounded-xl px-4 py-3"><span>⚠</span><span>{erro}</span></div>}
        {resultado && <ResultadoDisplay resultado={resultado} rotulo={rotuloDisplay} rolando={rolando} skin={preferencias.dado_skin} />}
      </div>
    )
  }

  // ── Modos de resolução: parada / alvo / modificador ─────────────────────────
  const dificuldadePlaceholder = modo === 'sucessos' ? String(resolucao.dificuldade_padrao ?? 6) : ''
  return (
    <div className="space-y-4">
      <div className="text-xs text-purple-400 bg-purple-950/40 border border-purple-800/50 rounded-lg px-3 py-2">
        Modo <span className="font-semibold text-purple-200">{modo}</span> —
        {modo === 'sucessos' && ` parada de d${resolucao.dado || 10}, cada ≥ dificuldade conta 1 sucesso.`}
        {modo === 'roll_under' && ` role 1d${resolucao.dado || 100} ≤ o alvo.`}
        {modo === 'faixas' && ` ${resolucao.notacao_base || '2d6'} + modificador cai numa faixa.`}
      </div>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-purple-300 text-sm flex flex-col gap-1">
          {ROTULOS_VALOR[modo]}
          <input type="number" value={valor} onChange={e => { setValor(e.target.value); setErroLocal('') }}
            onKeyDown={e => e.key === 'Enter' && handleRolarModo()} placeholder="0" className={`${INP} w-32`} autoFocus />
        </label>
        {modo === 'sucessos' && (
          <label className="text-purple-300 text-sm flex flex-col gap-1">
            Dificuldade (ad-hoc)
            <input type="number" value={dificuldade} onChange={e => setDificuldade(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRolarModo()} placeholder={dificuldadePlaceholder} className={`${INP} w-28`} />
          </label>
        )}
        {modo === 'roll_under' && (
          <label className="text-purple-300 text-sm flex flex-col gap-1">
            Ajuste do alvo
            <input type="number" value={dificuldade} onChange={e => setDificuldade(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRolarModo()} placeholder="usa o valor" className={`${INP} w-28`} title="Deixe vazio p/ usar o valor acima como alvo" />
          </label>
        )}
        {especiaisAtivo && (
          <label className="text-purple-300 text-sm flex flex-col gap-1">
            {resolucao.dados_especiais.nome || 'Especiais'}
            <input type="number" value={especiaisQtd} onChange={e => setEspeciaisQtd(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRolarModo()} placeholder="0" className={`${INP} w-24`} />
          </label>
        )}
        <button onClick={handleRolarModo} disabled={rolando || salvando}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-lg shadow-purple-900/40">
          {rolando ? '🎲' : 'Rolar'}
        </button>
      </div>
      <input type="text" value={rotulo} onChange={e => setRotulo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRolarModo()}
        placeholder="Rótulo opcional — Ex: Força + Briga, Investigar" className={`${INP} w-full text-sm`} />
      {erro && <div className="flex items-start gap-2 text-red-400 text-sm bg-red-950/60 border border-red-800/60 rounded-xl px-4 py-3"><span>⚠</span><span>{erro}</span></div>}
      {resultado && <ResultadoModoDisplay resultado={resultado} rotulo={rotuloDisplay} rolando={rolando} skin={preferencias.dado_skin} />}
    </div>
  )
}
