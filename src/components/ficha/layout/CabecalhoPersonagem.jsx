import { useState } from 'react'
import { useUpdateFicha } from '../../../hooks/useFicha'

export default function CabecalhoPersonagem({
  ficha,
  rotuloVida,
  isDono,
  onRefetch,
  racas = [],
  classes = [],
  racaId,
  classeId,
  onRacaChange,
  onClasseChange,
  vidaMaxFinal,
  vidaTemp = 0,
  vidaTempPontual = 0,
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
  const hpPercent = hpMaxDisplay > 0 ? Math.min(100, Math.max(0, (hpNum / hpMaxDisplay) * 100)) : 0
  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
  const temModVida = vidaMaxFinal !== undefined && vidaMaxFinal !== hpMaxBase

  const temSistemaRacas = racas.length > 0
  const temSistemaClasses = classes.length > 0

  const racaAtiva = racas.find(r => r.id === racaId)
  const classeAtiva = classes.find(c => c.id === classeId)
  const racaNome = racaAtiva?.nome || ficha.raca || null
  const classeNome = classeAtiva?.nome || ficha.classe || null
  const subtitulo = [racaNome, classeNome, ficha.nivel ? `Nível ${ficha.nivel}` : null]
    .filter(Boolean)
    .join(' · ')

  const selectCls = 'px-2 py-1 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500'
  const inputCls  = 'px-2 py-1 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500'

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-2xl p-5">
      <div className="flex gap-5 items-start">

        {/* Avatar */}
        {ficha.imagem_url ? (
          <img
            src={ficha.imagem_url}
            alt={ficha.nome_personagem}
            className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl shrink-0 border-2 border-purple-700"
          />
        ) : (
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl shrink-0 border-2 border-purple-800 bg-purple-950 flex items-center justify-center">
            <span className="text-3xl sm:text-4xl select-none">🧙</span>
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-3">
          {/* Nome */}
          <div>
            <h2 className="text-2xl font-bold text-white leading-tight">{ficha.nome_personagem}</h2>
            {!isDono && (
              subtitulo
                ? <p className="text-purple-400 text-sm mt-0.5">{subtitulo}</p>
                : <p className="text-purple-600 text-sm mt-0.5 italic">Sem raça ou classe definida</p>
            )}
          </div>

          {/* Seletores de raça/classe — apenas para o dono */}
          {isDono && (
            <div className="flex flex-wrap gap-2 items-center">
              {temSistemaRacas ? (
                <select
                  value={racaId || ''}
                  onChange={e => onRacaChange(e.target.value || null)}
                  className={selectCls}
                  title="Raça"
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
                  placeholder="Raça"
                  className={`${inputCls} w-28`}
                />
              )}

              {temSistemaClasses ? (
                <select
                  value={classeId || ''}
                  onChange={e => onClasseChange(e.target.value || null)}
                  className={selectCls}
                  title="Classe"
                >
                  <option value="">Sem classe</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={classeTexto}
                  onChange={e => setClasseTexto(e.target.value)}
                  onBlur={e => salvarTextoLegado('classe', e.target.value)}
                  placeholder="Classe"
                  className={`${inputCls} w-28`}
                />
              )}
            </div>
          )}

          {/* HP */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-purple-400 text-xs font-medium uppercase tracking-wider">
                {rotuloVida}
              </p>
              {temModVida && (
                <span className="text-green-400 text-[10px] font-mono">
                  (base {hpMaxBase}{vidaMaxFinal > hpMaxBase ? ` +${vidaMaxFinal - hpMaxBase}` : ` ${vidaMaxFinal - hpMaxBase}`})
                </span>
              )}
            </div>

            {isDono ? (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-purple-950 border border-purple-700 rounded-lg px-2 py-1">
                  <input
                    type="number"
                    value={hpAtual}
                    onChange={e => setHpAtual(e.target.value)}
                    className="w-14 bg-transparent text-white text-center text-sm font-semibold focus:outline-none"
                    placeholder="0"
                  />
                  <span className="text-purple-600 text-sm">/</span>
                  {/* Exibe o max final; clique para editar o base */}
                  {editandoHpBase ? (
                    <input
                      type="number"
                      value={hpBaseTemp}
                      onChange={e => setHpBaseTemp(e.target.value)}
                      onBlur={salvarHpBase}
                      onKeyDown={e => e.key === 'Enter' && salvarHpBase()}
                      autoFocus
                      className="w-14 bg-transparent text-amber-400 text-center text-sm font-semibold focus:outline-none border-b border-amber-500"
                    />
                  ) : (
                    <button
                      onClick={() => { setHpBaseTemp(String(hpMaxBase)); setEditandoHpBase(true) }}
                      className="w-14 text-white text-center text-sm font-semibold focus:outline-none hover:text-amber-300 transition-colors"
                      title={`HP máx base: ${hpMaxBase}${temModVida ? ` (+${vidaMaxFinal - hpMaxBase} de modificadores) = ${hpMaxDisplay}` : ''}`}
                    >
                      {hpMaxDisplay || '—'}
                    </button>
                  )}
                </div>
                <button
                  onClick={salvarHP}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    hpSalvo
                      ? 'bg-green-700 text-green-100'
                      : 'bg-purple-700 hover:bg-purple-600 text-white'
                  }`}
                >
                  {hpSalvo ? '✓ Salvo' : 'Salvar HP'}
                </button>
              </div>
            ) : (
              <p className="text-white text-lg font-semibold">
                {ficha.hp_atual ?? '?'}
                <span className="text-purple-500 font-normal text-sm"> / {hpMaxDisplay || '?'}</span>
              </p>
            )}

            {hpErro && <p className="text-red-400 text-xs mt-1">{hpErro}</p>}

            {hpMaxDisplay > 0 && (
              <div className="mt-2 h-2.5 bg-slate-700 rounded-full overflow-hidden max-w-xs">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${hpColor}`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            )}

            {vidaTempEfetiva > 0 && (
              <p className="text-sky-400 text-xs mt-1.5 font-medium flex items-center gap-1.5">
                +{vidaTempEfetiva} Vida Temporária
                {isDono && vidaTempPontual > 0 && (
                  <button
                    onClick={limparVidaTemp}
                    className="text-sky-600 hover:text-sky-300 transition-colors"
                    title="Limpar vida temporária"
                  >
                    ✕
                  </button>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
