import { useState, useEffect, useRef } from 'react'
import DiceRoller from './DiceRoller'
import Dice3D from '../dados/Dice3D'
import { tocarSomDado, estimarNumDados } from '../../lib/diceSounds'
import { resolverVantagem, aplicarVantagem } from '../../lib/rollModifiers'
import { avaliarFormula } from '../../lib/formulaEngine'
import { descreverResultado } from '../../lib/resolutionEngine'
import RerolagemBox from '../dados/RerolagemBox'
import Dots from './Dots'
import { usePreferencias } from '../../context/PreferenciasContext'

// Aviso visual de vantagem/desvantagem/anulada (Fase 12.3)
function AvisoVantagem({ estado }) {
  if (!estado || estado === 'normal') return null
  const cfg = {
    vantagem:    { txt: '⬆ Vantagem',    cls: 'bg-ok/15 text-ok border-ok/60' },
    desvantagem: { txt: '⬇ Desvantagem', cls: 'bg-harm/15 text-harm border-harm/60' },
    anulada:     { txt: 'Vant./Desv. anuladas', cls: 'bg-hover text-ink-dim border-border' },
  }[estado]
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cfg.cls}`}>
      {cfg.txt}
    </span>
  )
}

function formulaTexto(regra) {
  if (!regra) return ''
  if (regra.tipo === 'dados') {
    const partes = [`${regra.quantidade}d${regra.lados}`]
    if (regra.descartar_menores > 0) partes.push(`-${regra.descartar_menores}↓`)
    if (regra.descartar_maiores > 0) partes.push(`-${regra.descartar_maiores}↑`)
    if (regra.bonus_fixo > 0) partes.push(`+${regra.bonus_fixo}`)
    else if (regra.bonus_fixo < 0) partes.push(String(regra.bonus_fixo))
    return partes.join(' ')
  }
  if (regra.tipo === 'fixo') return `Fixo ${regra.valor}`
  if (regra.tipo === 'pontos') return `${regra.pool_total} pts`
  return ''
}

// Fase 18.4 — formata uma fonte do detalhamento (inclui percentual)
function sinalFonte(f) {
  const v = Number(f.valor)
  if (f.operacao === 'percentual')  return `${v >= 0 ? '+' : ''}${v}%`
  if (f.operacao === 'definir')     return `=${v}`
  if (f.operacao === 'multiplicar') return `×${v}`
  return v >= 0 ? `+${v}` : String(v)
}

function buildNotacaoTeste(valor, dadoPadrao) {
  const lados = dadoPadrao && dadoPadrao >= 2 ? dadoPadrao : 20
  if (valor === null || valor === undefined) return `1d${lados}`
  if (valor > 0) return `1d${lados}+${valor}`
  if (valor < 0) return `1d${lados}${valor}`
  return `1d${lados}`
}

export default function AtributoCard({
  atributo,
  valorAtributo,
  onSave,
  canEdit,
  mesaId,
  fichaId,
  registrarRolagem,
  dadoPadrao = 20,
  valorFinal,
  fontesMod,
  modificadoresAtivos = [],
  formulaMod = '',
  contextoFormula = null,
  resolucao = null,          // 23.3 — modo de resolução do sistema
  registrarResolvida = null,
  rerolagem = null,          // 23.4 — bundle de rerolagem (pool + débito)
  especiaisQtd = 0,          // 23.5 — dados especiais na parada (Fome)
  exibicaoAtributos = 'numero', // 24.3 — padrão do sistema ('numero' | 'dots')
  maximoDots = 5,
  compact = false,
}) {
  const { preferencias } = usePreferencias()
  const [rolando, setRolando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [valorManual, setValorManual] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [testeResultado, setTesteResultado] = useState(null)
  const [testeVantagem, setTesteVantagem] = useState('normal')
  const [testeRolando, setTesteRolando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [erroTeste, setErroTeste] = useState('')

  // Vantagem/desvantagem deste atributo, a partir dos modificadores ativos (12.3)
  const vantagemEstado = resolverVantagem({ alvo: atributo?.id, modificadoresAtivos })

  const valor = valorAtributo?.valor
  // valorFinal vem do motor de modificadores; valor é sempre o base (usado na edição)
  const display = valorFinal !== undefined ? valorFinal : valor
  const regra = atributo?.regra_rolagem

  // 17.3 — modificador calculado pela fórmula do sistema (reage aos buffs via display)
  let modAtributo = null
  if (formulaMod && display !== undefined && display !== null && display !== '') {
    try { modAtributo = avaliarFormula(formulaMod, { ...(contextoFormula || {}), _x: Number(display) }) }
    catch { modAtributo = null }
  }
  const temMod = modAtributo !== null && Number.isFinite(modAtributo)
  const fmtMod = m => (m >= 0 ? `+${m}` : String(m))

  // 24.3 — dots: exibição por atributo (override) ou padrão do sistema.
  // SÓ exibição: o valor segue número nos motores; o clique edita o BASE.
  const usaDots = (atributo?.exibicao || exibicaoAtributos) === 'dots'
  async function setDots(n) {
    if (salvando) return
    setSalvando(true)
    setErro('')
    try { await onSave(atributo.id, Math.max(0, n), null) }
    catch (err) { setErro(err.message || 'Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  // Flash de borda quando o valor final muda (feedback de toggle de habilidade)
  const [pulsando, setPulsando] = useState(false)
  const prevDisplay = useRef(display)
  useEffect(() => {
    if (prevDisplay.current !== display && prevDisplay.current !== undefined) {
      setPulsando(true)
      const t = setTimeout(() => setPulsando(false), 700)
      return () => clearTimeout(t)
    }
    prevDisplay.current = display
  }, [display])
  const podeRolar = canEdit && regra?.tipo !== 'fixo'

  async function handleConfirmar(resultado) {
    setSalvando(true)
    setErro('')
    try {
      await onSave(
        atributo.id,
        resultado.valor,
        resultado.resultados?.length > 0
          ? {
              resultados: resultado.resultados,
              mantidos: resultado.mantidos,
              descartados: resultado.descartados,
            }
          : null
      )
      setRolando(false)
    } catch (err) {
      setErro(err.message || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleSalvarManual() {
    const v = Number(valorManual)
    if (isNaN(v) || valorManual === '') return
    setSalvando(true)
    setErro('')
    try {
      await onSave(atributo.id, v, null)
      setEditando(false)
      setValorManual('')
    } catch (err) {
      setErro(err.message || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const modoResolucao = resolucao?.modo || 'soma'

  async function handleTestar() {
    if (testando || !registrarRolagem) return

    // 23.3 — modos de resolução: o atributo vira parada (sucessos), alvo
    // (roll_under) ou modificador (faixas). Vantagem por modo (23.6).
    if (modoResolucao !== 'soma' && registrarResolvida) {
      setTestando(true); setErroTeste('')
      const valorModo = modoResolucao === 'faixas' ? (temMod ? modAtributo : display) : display
      try {
        const res = await registrarResolvida({ mesaId, fichaId, rotulo: `Teste de ${atributo.nome}`, resolucao, valor: Number(valorModo) || 0, especiaisQtd, vantagem: vantagemEstado })
        setTesteResultado(res); setTesteVantagem(vantagemEstado); setTesteRolando(true)
        setTimeout(() => { setTesteRolando(false); setTestando(false) }, 1400)
      } catch (err) { setErroTeste(err.message || 'Erro ao rolar.'); setTestando(false) }
      return
    }

    setTestando(true)
    setErroTeste('')
    // Com fórmula de modificador, o teste usa o MODIFICADOR (ex: 1d20+mod), não o valor
    const valorTeste = temMod ? modAtributo : display
    const notacaoBase = buildNotacaoTeste(valorTeste, dadoPadrao)
    const notacao = aplicarVantagem(notacaoBase, vantagemEstado)
    const sufixo = vantagemEstado === 'vantagem' ? ' (vantagem)'
      : vantagemEstado === 'desvantagem' ? ' (desvantagem)' : ''
    tocarSomDado(preferencias.dado_skin, {
      ativo: preferencias.som_ativo,
      volume: preferencias.som_volume,
      numDados: estimarNumDados(notacao),
    })
    try {
      const res = await registrarRolagem({
        mesaId,
        fichaId,
        rotulo: `Teste de ${atributo.nome}${sufixo}`,
        notacao,
      })
      setTesteResultado(res)
      setTesteVantagem(vantagemEstado)
      setTesteRolando(true)
      setTimeout(() => { setTesteRolando(false); setTestando(false) }, 1400)
    } catch (err) {
      setErroTeste(err.message || 'Erro ao rolar.')
      setTestando(false)
    }
  }

  // ── Modo compacto ────────────────────────────────────────────────────────────
  const buffado = fontesMod && fontesMod.length > 0
  // 23.3 — resumo do teste quando o sistema usa um modo de resolução
  const descTeste = testeResultado?.modo && testeResultado.modo !== 'soma'
    ? descreverResultado(testeResultado.estruturado) : null

  if (compact) {
    return (
      <div className={`bg-raised border rounded-xl p-3 flex flex-col items-center transition-all duration-300 ${
        pulsando ? 'border-dice-500 ring-2 ring-dice-500/25' : 'border-border'
      }`}>
        {/* Nome */}
        <p className="text-ink-dim text-[11px] font-medium uppercase tracking-[.12em] truncate w-full text-center mb-1">
          {atributo.nome}
        </p>

        {/* Valor com tooltip de rastreabilidade */}
        <div className="relative group/val w-full flex flex-col items-center">
          {usaDots ? (
            <Dots
              valor={Number(display) || 0}
              valorBase={Number(valor) || 0}
              max={maximoDots}
              canEdit={canEdit}
              onSet={setDots}
              size="sm"
            />
          ) : (
            <p className={`font-mono font-bold text-4xl leading-none transition-colors duration-300 ${buffado ? 'text-ok' : 'text-ink'}`}>
              {temMod ? fmtMod(modAtributo) : (display !== undefined && display !== null ? display : '—')}
            </p>
          )}
          {!usaDots && (temMod ? (
            <p className="text-ink-dim text-[10px] leading-none mt-0.5">valor {display}</p>
          ) : fontesMod && fontesMod.length > 0 && (
            <p className="text-ink-dim text-[9px] leading-none mt-0.5">base {valor}</p>
          ))}
          {/* Tooltip de rastreabilidade */}
          {fontesMod && fontesMod.length > 0 && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50
                            pointer-events-none opacity-0 group-hover/val:opacity-100
                            transition-opacity duration-150
                            bg-void border border-accent-700/60 rounded-lg px-3 py-2
                            shadow-2xl w-max">
              <p className="text-accent-300 text-[11px] font-semibold mb-1">{atributo.nome}</p>
              <p className="text-ink-dim text-[10px]">Base: {valor ?? '—'}</p>
              {fontesMod.map((f, i) => {
                const sinal = sinalFonte(f)
                return (
                  <p key={i} className="text-ink text-[10px]">
                    {sinal} <span className="text-ink-dim">{f.fonte}</span>
                  </p>
                )
              })}
              <p className="text-ok text-[10px] font-semibold border-t border-border mt-1 pt-1">
                = {display}
              </p>
            </div>
          )}
        </div>

        {/* Fórmula */}
        <p className="text-dice-500 text-[10px] font-mono mt-1 opacity-70">
          {formulaTexto(regra)}
        </p>

        {/* Botões */}
        <div className="flex items-center gap-2 mt-2.5">
          {mesaId && registrarRolagem && (
            <button
              type="button"
              onClick={handleTestar}
              disabled={testando}
              title={`Teste de ${atributo.nome}`}
              className="text-xs text-dice-500 hover:text-dice-400 disabled:opacity-40 transition-colors px-1.5 py-0.5 rounded hover:bg-dice-700/20"
            >
              🎲 Testar
            </button>
          )}
          {canEdit && !rolando && !editando && (
            <button
              type="button"
              onClick={() => { setEditando(true); setValorManual(valor !== undefined ? String(valor) : '') }}
              className="text-[11px] text-ink-dim hover:text-accent-300 transition-colors"
              title="Editar valor"
            >
              ✎
            </button>
          )}
        </div>

        {/* Resultado do teste inline (compacto) */}
        {testeResultado && (
          <div className="w-full mt-2 border-t border-border pt-2 space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-ink-dim font-mono text-[10px]">{testeResultado.notacao}</span>
              <div className="flex items-center gap-1">
                <AvisoVantagem estado={testeVantagem} />
                <button
                  type="button"
                  onClick={() => setTesteResultado(null)}
                  className="text-ink-dim hover:text-ink text-[10px] transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 items-center justify-center">
              {testeResultado.dados.map((d, i) => (
                <div key={i} className={`rounded-lg ${d.sucesso ? 'ring-1 ring-ok/70' : ''} ${d.especial ? 'ring-1 ring-harm/80' : ''}`}>
                  <Dice3D lados={d.lados} resultado={d.valor} rolando={testeRolando} descartado={d.descartado} skin={preferencias.dado_skin} />
                </div>
              ))}
              {!descTeste && (
                <span className="text-dice-400 font-mono font-bold text-xl leading-none ml-1">{testeResultado.total}</span>
              )}
            </div>
            {descTeste && <p className="text-center text-sm font-bold text-accent-300">{descTeste.texto}</p>}
            {descTeste?.textoFaixa && <p className="text-accent-300 text-[10px] text-center italic">"{descTeste.textoFaixa}"</p>}
            {descTeste?.marcacao && (
              <p className="text-center text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-harm/10 border-harm/60 text-harm">⚡ {descTeste.marcacao.rotulo}</p>
            )}
            <RerolagemBox resultado={testeResultado} rerolagem={rerolagem} mesaId={mesaId} fichaId={fichaId} rotulo={`Teste de ${atributo.nome}`} onRerolado={setTesteResultado} />
            {erroTeste && <p className="text-harm text-[10px] text-center">{erroTeste}</p>}
          </div>
        )}

        {/* Rolar para definir valor */}
        {rolando && (
          <div className="w-full mt-2 border-t border-border pt-2">
            <DiceRoller regra={regra} onConfirmar={handleConfirmar} />
            <button
              type="button"
              onClick={() => setRolando(false)}
              className="mt-1 text-[11px] text-ink-dim hover:text-accent-300 transition-colors w-full text-center"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Edição manual */}
        {editando && !rolando && (
          <div className="w-full mt-2 border-t border-border pt-2">
            <div className="flex gap-1.5">
              <input
                type="number"
                value={valorManual}
                onChange={e => setValorManual(e.target.value)}
                placeholder={valor !== undefined ? String(valor) : '0'}
                autoFocus
                className="flex-1 px-2 py-1 bg-void border border-border text-ink rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent-500"
              />
              <button
                type="button"
                onClick={handleSalvarManual}
                disabled={salvando}
                className="px-2 py-1 bg-ok/80 hover:bg-ok disabled:opacity-50 text-ink text-sm rounded transition-colors"
              >
                ✓
              </button>
              <button
                type="button"
                onClick={() => { setEditando(false); setValorManual('') }}
                className="px-2 py-1 bg-hover hover:bg-border text-ink text-sm rounded transition-colors"
              >
                ✕
              </button>
            </div>
            {podeRolar && (
              <button
                type="button"
                onClick={() => { setEditando(false); setRolando(true) }}
                className="mt-1.5 w-full py-1 text-[11px] bg-dice-700 hover:bg-dice-500 text-ink rounded transition-colors"
              >
                🎲 Rolar dados
              </button>
            )}
          </div>
        )}

        {erro && <p className="mt-1 text-harm text-[10px] text-center">{erro}</p>}
      </div>
    )
  }

  // ── Modo normal (sem compact) ────────────────────────────────────────────────
  return (
    <div className={`bg-raised border rounded-xl p-4 transition-all duration-300 ${
      pulsando ? 'border-dice-500 ring-2 ring-dice-500/25' : 'border-border'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-ink font-semibold">{atributo.nome}</p>
          {atributo.descricao && (
            <p className="text-ink-dim text-xs mt-0.5">{atributo.descricao}</p>
          )}
          <p className="text-dice-500 text-xs font-mono mt-1">{formulaTexto(regra)}</p>
        </div>
        <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
          <div className="relative group/val flex flex-col items-end">
            {usaDots ? (
              <Dots
                valor={Number(display) || 0}
                valorBase={Number(valor) || 0}
                max={maximoDots}
                canEdit={canEdit}
                onSet={setDots}
              />
            ) : (
              <p className={`font-mono font-bold text-3xl leading-none transition-colors duration-300 ${buffado ? 'text-ok' : 'text-ink'}`}>
                {temMod ? fmtMod(modAtributo) : (display !== undefined && display !== null ? display : '—')}
              </p>
            )}
            {!usaDots && (temMod ? (
              <p className="text-ink-dim text-[10px] leading-none">valor {display}</p>
            ) : fontesMod && fontesMod.length > 0 && (
              <p className="text-ink-dim text-[10px] leading-none">base {valor}</p>
            ))}
            {fontesMod && fontesMod.length > 0 && (
              <div className="absolute right-0 bottom-full mb-1.5 z-50
                              pointer-events-none opacity-0 group-hover/val:opacity-100
                              transition-opacity duration-150
                              bg-void border border-accent-700/60 rounded-lg px-3 py-2
                              shadow-2xl w-max">
                <p className="text-accent-300 text-[11px] font-semibold mb-1">{atributo.nome}</p>
                <p className="text-ink-dim text-[10px]">Base: {valor ?? '—'}</p>
                {fontesMod.map((f, i) => {
                  const sinal = sinalFonte(f)
                  return (
                    <p key={i} className="text-ink text-[10px]">
                      {sinal} <span className="text-ink-dim">{f.fonte}</span>
                    </p>
                  )
                })}
                <p className="text-ok text-[10px] font-semibold border-t border-border mt-1 pt-1">
                  = {display}
                </p>
              </div>
            )}
          </div>
          {mesaId && registrarRolagem && (
            <button
              type="button"
              onClick={handleTestar}
              disabled={testando}
              title={`Teste de ${atributo.nome}`}
              className="text-xs text-dice-500 hover:text-dice-400 disabled:opacity-40 transition-colors px-2 py-0.5 rounded hover:bg-dice-700/20"
            >
              🎲 Testar
            </button>
          )}
        </div>
      </div>

      {testeResultado && (
        <div className="border-t border-border pt-3 mb-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-ink-dim font-mono text-xs">{testeResultado.notacao}</span>
            <div className="flex items-center gap-2">
              <AvisoVantagem estado={testeVantagem} />
              <button
                type="button"
                onClick={() => setTesteResultado(null)}
                className="text-ink-dim hover:text-ink text-xs transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {testeResultado.dados.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <Dice3D
                  lados={d.lados}
                  resultado={d.valor}
                  rolando={testeRolando}
                  descartado={d.descartado}
                  skin={preferencias.dado_skin}
                />
                {d.descartado && <span className="text-harm text-[9px]">desc.</span>}
              </div>
            ))}
            <div className="flex items-baseline gap-1.5 ml-1">
              <span className="text-ink-dim text-xs">{descTeste ? '' : 'Total:'}</span>
              {descTeste
                ? <span className="text-xl font-bold text-accent-300 leading-none">{descTeste.texto}</span>
                : <span className="text-2xl font-mono font-bold text-dice-400 leading-none">{testeResultado.total}</span>}
            </div>
          </div>
          {descTeste?.textoFaixa && <p className="text-accent-300 text-xs italic">"{descTeste.textoFaixa}"</p>}
          {descTeste?.marcacao && (
            <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md border bg-harm/10 border-harm/60 text-harm">⚡ {descTeste.marcacao.rotulo}{descTeste.marcacao.texto ? ` — ${descTeste.marcacao.texto}` : ''}</span>
          )}
          <RerolagemBox resultado={testeResultado} rerolagem={rerolagem} mesaId={mesaId} fichaId={fichaId} rotulo={`Teste de ${atributo.nome}`} onRerolado={setTesteResultado} />
          {!descTeste && (testeResultado.mantidos.length > 1 || testeResultado.modificador !== 0) && (
            <p className="text-ink-dim text-xs">
              ({testeResultado.mantidos.join(' + ')}
              {testeResultado.modificador > 0 && ` + ${testeResultado.modificador}`}
              {testeResultado.modificador < 0 && ` − ${Math.abs(testeResultado.modificador)}`})
            </p>
          )}
          {erroTeste && <p className="text-harm text-xs">{erroTeste}</p>}
        </div>
      )}

      {rolando && (
        <div className="border-t border-border pt-3">
          <DiceRoller regra={regra} onConfirmar={handleConfirmar} />
          <button
            type="button"
            onClick={() => setRolando(false)}
            className="mt-2 text-xs text-ink-dim hover:text-accent-300 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {editando && !rolando && (
        <div className="border-t border-border pt-3">
          <div className="flex gap-2">
            <input
              type="number"
              value={valorManual}
              onChange={e => setValorManual(e.target.value)}
              placeholder={valor !== undefined ? String(valor) : '0'}
              autoFocus
              className="flex-1 px-3 py-1.5 bg-void border border-border text-ink rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
            <button
              type="button"
              onClick={handleSalvarManual}
              disabled={salvando}
              className="px-3 py-1.5 bg-ok/80 hover:bg-ok disabled:opacity-50 text-ink text-sm rounded-lg transition-colors"
            >
              ✓
            </button>
            <button
              type="button"
              onClick={() => { setEditando(false); setValorManual('') }}
              className="px-3 py-1.5 bg-hover hover:bg-border text-ink text-sm rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {canEdit && !rolando && !editando && (
        <div className="flex gap-2 mt-1">
          {podeRolar && (
            <button
              type="button"
              onClick={() => setRolando(true)}
              className="flex-1 py-1.5 text-xs bg-dice-700 hover:bg-dice-500 text-ink rounded-lg transition-colors"
            >
              🎲 {valor !== undefined ? 'Rolar novamente' : 'Rolar'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setEditando(true)
              setValorManual(valor !== undefined ? String(valor) : '')
            }}
            className="flex-1 py-1.5 text-xs bg-hover hover:bg-border text-ink rounded-lg transition-colors"
          >
            ✎ Editar
          </button>
        </div>
      )}

      {erro && <p className="mt-2 text-harm text-xs">{erro}</p>}
    </div>
  )
}
