import { useState, useEffect, useRef } from 'react'
import { useUpdateFicha } from '../../../hooks/useFicha'
import ClassesFicha, { resumoClasses } from './ClassesFicha'
import BarraVida from '../../ui/BarraVida'
import Botao from '../../ui/Botao'
import Icone from '../../ui/Icone'
import Ilustra from '../../arte/Ilustra'

export default function CabecalhoPersonagem({
  ficha,
  rotuloVida,
  isDono,
  onRefetch,
  racas = [],
  classes = [],
  racaId,
  onRacaChange,
  // Fase 19.1 — multiclasse
  classesFicha = [],
  nivelTotal,
  classeFallbackNome = null,
  onAddClasse,
  onRemoveClasse,
  onSetNivel,
  vidaMaxFinal,
  vidaTemp = 0,
  vidaTempPontual = 0,
  esconderVida = false, // 24.2 — uma trilha substitui a vida (o painel dela assume)
}) {
  const { updateFicha } = useUpdateFicha()
  const [hpAtual, setHpAtual] = useState(ficha.hp_atual ?? '')
  const [hpMaximo, setHpMaximo] = useState(ficha.hp_maximo ?? '')
  const [hpSalvo, setHpSalvo] = useState(false)
  const [hpErro, setHpErro] = useState('')
  const [editandoHpBase, setEditandoHpBase] = useState(false)
  const [hpBaseTemp, setHpBaseTemp] = useState('')

  // Campos texto legados (quando sistema não tem raças/classes)
  const [racaTexto, setRacaTexto] = useState(ficha.raca || '')
  const [classeTexto, setClasseTexto] = useState(ficha.classe || '')

  async function salvarHP() {
    setHpErro('')
    try {
      await updateFicha(ficha.id, {
        hp_atual: hpAtual !== '' ? Number(hpAtual) : null,
        hp_maximo: hpMaximo !== '' ? Number(hpMaximo) : null,
      })
      setHpSalvo(true)
      setTimeout(() => setHpSalvo(false), 2000)
      onRefetch()
    } catch (err) {
      setHpErro(err.message || 'Erro ao salvar.')
    }
  }

  async function salvarHpBase() {
    const v = Number(hpBaseTemp)
    if (isNaN(v)) { setEditandoHpBase(false); return }
    setHpMaximo(v)
    setEditandoHpBase(false)
    try {
      await updateFicha(ficha.id, { hp_maximo: v })
      onRefetch()
    } catch {}
  }

  async function salvarTextoLegado(campo, valor) {
    try { await updateFicha(ficha.id, { [campo]: valor || null }) } catch {}
  }

  // Vida temporária efetiva: não acumula, fica a maior entre a pontual
  // (armazenada, Fase 12.4) e a contínua (do motor de modificadores).
  const vidaTempEfetiva = Math.max(Number(vidaTemp) || 0, Number(vidaTempPontual) || 0)

  async function limparVidaTemp() {
    try {
      await updateFicha(ficha.id, { vida_temp_atual: 0 })
      onRefetch()
    } catch {}
  }

  const hpNum = Number(hpAtual || 0)
  // vidaMaxFinal inclui modificadores de raça/classe; hpMaximo é o valor base editável
  const hpMaxBase = Number(hpMaximo || 0)
  const hpMaxDisplay = vidaMaxFinal !== undefined ? vidaMaxFinal : hpMaxBase
  const temModVida = vidaMaxFinal !== undefined && vidaMaxFinal !== hpMaxBase

  // FV.3 — flash âmbar-esmeralda (--ok) de 300ms ao subir o HP exibido (cura)
  const prevHpAtualRef = useRef(ficha.hp_atual)
  const [curando, setCurando] = useState(false)
  useEffect(() => {
    const prev = Number(prevHpAtualRef.current ?? 0)
    const atual = Number(ficha.hp_atual ?? 0)
    if (atual > prev) {
      setCurando(true)
      const t = setTimeout(() => setCurando(false), 300)
      prevHpAtualRef.current = ficha.hp_atual
      return () => clearTimeout(t)
    }
    prevHpAtualRef.current = ficha.hp_atual
  }, [ficha.hp_atual])

  const temSistemaRacas = racas.length > 0
  const temSistemaClasses = classes.length > 0

  const racaAtiva = racas.find(r => r.id === racaId)
  const racaNome = racaAtiva?.nome || ficha.raca || null

  // Fase 19.1 — classe no subtítulo:
  //   2+ classes → "Bárbaro 9 / Paladino 4" + "Nível 13" (total)
  //   1 classe   → "Bárbaro" + "Nível 9" (idêntico ao layout antigo)
  //   nenhuma linha → fallback legado (classe_id → nome, ou texto ficha.classe)
  const temClasses = classesFicha.length > 0
  const classeLabel = classesFicha.length > 1
    ? resumoClasses(classesFicha)
    : temClasses
      ? (classesFicha[0].classe?.nome || null)
      : (classeFallbackNome || ficha.classe || null)
  const nivelLabel = temClasses ? nivelTotal : ficha.nivel

  const subtituloSemNivel = [racaNome, classeLabel].filter(Boolean)

  return (
    <section className="cabecalho-personagem relative rounded-2xl bg-gradient-to-br from-raised/90 via-raised/60 to-transparent p-5 sm:p-6" aria-label="Personagem">
      <div className="flex flex-col sm:flex-row gap-5 sm:items-start">

        {/* Retrato */}
        <div className="retrato shrink-0 self-start w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden ring-2 ring-accent-500/70 bg-void flex items-center justify-center">
          {ficha.imagem_url
            ? <img src={ficha.imagem_url} alt={ficha.nome_personagem} className="w-full h-full object-cover" />
            : <Ilustra nome="elmo" tamanho={64} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-3xl sm:text-4xl font-bold font-sora text-ink leading-tight tracking-tight break-words">{ficha.nome_personagem}</h2>
              {!isDono && (
                subtituloSemNivel.length > 0
                  ? <p className="text-ink-dim mt-1">{subtituloSemNivel.join(' • ')}</p>
                  : <p className="text-ink-dim text-sm mt-1 italic">Sem raça ou classe definida</p>
              )}
            </div>
            {/* Nível: medalhão à direita (com classes, é o total) */}
            {nivelLabel ? (
              <div className="medalhao-nivel shrink-0 text-center" aria-label={`Nível ${nivelLabel}`}>
                <span className="block text-ink-dim text-xs font-semibold uppercase tracking-wider">Nível</span>
                <span className="block font-sora text-3xl font-bold text-ink tabular-nums leading-none mt-0.5">{nivelLabel}</span>
              </div>
            ) : null}
          </div>

          {/* Seletores de raça/classe — apenas para o dono */}
          {isDono && (
            <div className="space-y-2 mt-3">
              <div className="flex flex-wrap gap-2 items-center">
                {temSistemaRacas ? (
                  <select
                    value={racaId || ''}
                    onChange={e => onRacaChange(e.target.value || null)}
                    className="campo !min-h-[36px] !py-1"
                    aria-label="Raça"
                  >
                    <option value="">Sem raça</option>
                    {racas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={racaTexto}
                    onChange={e => setRacaTexto(e.target.value)}
                    onBlur={e => salvarTextoLegado('raca', e.target.value)}
                    placeholder="Raça" aria-label="Raça"
                    className="campo !min-h-[36px] !py-1 w-32"
                  />
                )}

                {/* Sistemas sem classes estruturadas: mantém o campo texto legado */}
                {!temSistemaClasses && (
                  <input
                    type="text"
                    value={classeTexto}
                    onChange={e => setClasseTexto(e.target.value)}
                    onBlur={e => salvarTextoLegado('classe', e.target.value)}
                    placeholder="Classe" aria-label="Classe"
                    className="campo !min-h-[36px] !py-1 w-32"
                  />
                )}
              </div>

              {/* Fase 19.1 — multiclasse (sistemas com classes) */}
              {temSistemaClasses && (
                <ClassesFicha
                  classesFicha={classesFicha}
                  classesSistema={classes}
                  onAdd={onAddClasse}
                  onRemove={onRemoveClasse}
                  onSetNivel={onSetNivel}
                />
              )}
            </div>
          )}

          {/* Vida — escondida quando uma trilha substitui a vida (24.2) */}
          <div className={`mt-5 max-w-md ${esconderVida ? 'hidden' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-2">
              <p className="text-ink-dim text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Icone nome="coracao" tamanho={14} className="text-harm" /> {rotuloVida}
                {temModVida && (
                  <span className="text-ok font-mono normal-case tracking-normal font-normal">
                    (base {hpMaxBase}{vidaMaxFinal > hpMaxBase ? ` +${vidaMaxFinal - hpMaxBase}` : ` ${vidaMaxFinal - hpMaxBase}`})
                  </span>
                )}
              </p>

              {isDono ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-baseline gap-1 rounded-lg bg-void/80 border border-border px-2 py-1">
                    <input
                      type="number" value={hpAtual} onChange={e => setHpAtual(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && salvarHP()}
                      aria-label="Vida atual" placeholder="0"
                      className="w-14 bg-transparent text-ink text-right text-lg font-mono font-bold focus:outline-none"
                    />
                    <span className="text-ink-dim">/</span>
                    {/* Exibe o max final; clique para editar o base */}
                    {editandoHpBase ? (
                      <input
                        type="number" value={hpBaseTemp} onChange={e => setHpBaseTemp(e.target.value)}
                        onBlur={salvarHpBase} onKeyDown={e => e.key === 'Enter' && salvarHpBase()}
                        autoFocus aria-label="Vida máxima base"
                        className="w-14 bg-transparent text-dice-400 text-sm font-mono font-semibold focus:outline-none border-b border-dice-500"
                      />
                    ) : (
                      <button
                        onClick={() => { setHpBaseTemp(String(hpMaxBase)); setEditandoHpBase(true) }}
                        className="min-w-[2.5rem] text-ink-dim text-sm font-mono font-semibold hover:text-dice-400 transition-colors duration-rapida"
                        title={`Vida máxima base: ${hpMaxBase}${temModVida ? ` (+${vidaMaxFinal - hpMaxBase} de modificadores) = ${hpMaxDisplay}` : ''}. Clique para mudar.`}
                        aria-label="Mudar a vida máxima base"
                      >
                        {hpMaxDisplay || '—'}
                      </button>
                    )}
                  </div>
                  <Botao variante={hpSalvo ? 'secundario' : 'primario'} tamanho="sm" onClick={salvarHP}>
                    {hpSalvo ? <><Icone nome="check" tamanho={14} /> Salvo</> : 'Salvar'}
                  </Botao>
                </div>
              ) : ficha.hp_atual == null && !hpMaxDisplay ? null : (
                <p className="text-ink text-2xl font-bold font-mono tabular-nums leading-none">
                  {ficha.hp_atual ?? '—'}
                  <span className="text-ink-dim font-normal text-base"> / {hpMaxDisplay || '—'}</span>
                </p>
              )}
            </div>

            {!isDono && ficha.hp_atual == null && !hpMaxDisplay ? (
              /* Antes aparecia "? / ?" sem explicação — quem olhava não sabia se
                 era erro, se faltava dado ou se a ficha estava quebrada. */
              <p className="text-ink-dim text-sm">Vida ainda não definida neste sistema.</p>
            ) : hpMaxDisplay > 0 && (
              <BarraVida
                atual={hpNum} maximo={hpMaxDisplay} temp={vidaTempEfetiva} rotulo={rotuloVida}
                mostrarTexto={false} altura="h-3" className={curando ? 'cura-brilho rounded-full' : ''}
              />
            )}

            {hpErro && <p className="aviso-erro mt-2 !text-xs" role="alert">{hpErro}</p>}

            {vidaTempEfetiva > 0 && (
              <p className="text-temp text-sm mt-2 font-medium flex items-center gap-1.5">
                <Icone nome="escudo" tamanho={14} /> +{vidaTempEfetiva} de vida temporária
                {isDono && vidaTempPontual > 0 && (
                  <button onClick={limparVidaTemp} className="botao-icone !min-w-[28px] !min-h-[28px] !text-temp" aria-label="Limpar vida temporária" data-dica="Limpar">
                    <Icone nome="x" tamanho={14} />
                  </button>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
