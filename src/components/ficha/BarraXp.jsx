import { useState } from 'react'
import { progressoXp, modoProgressao } from '../../lib/progressaoEngine'

const fmt = n => Number(n || 0).toLocaleString('pt-BR')

/**
 * Fase 19.3 — XP, barra de progresso e subida de nível.
 *
 * Regras da spec:
 *   - Cruzar o limiar NÃO sobe sozinho: só avisa "Nível disponível!".
 *   - Subir é manual e confirmado; em multiclasse o jogador escolhe a classe.
 *   - Modo 'nenhum' (sistema sem XP): sem barra, botão de subir sempre livre.
 *
 * XP pode ser dado pelo dono da ficha ou por um gestor da mesa (RPC valida).
 * Subir de nível é só do dono.
 */
export default function BarraXp({
  xp = 0,
  nivelTotal,
  progressao,
  classesFicha = [],
  podeDarXp,
  isDono,
  onAddXp,
  onSubirNivel,
}) {
  const [delta, setDelta] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [escolhendo, setEscolhendo] = useState(false)
  const [subiuPara, setSubiuPara] = useState(null) // 19.7 — feedback visual

  const modo = modoProgressao(progressao)
  let prog
  try {
    prog = progressoXp(xp, nivelTotal, progressao)
  } catch (e) {
    // Fórmula de progressão quebrada: não derruba a ficha
    return (
      <div className="bg-raised border border-harm/60 rounded-2xl p-3 text-sm text-harm">
        ⚠ Curva de progressão inválida: {e.message}
      </div>
    )
  }

  const podeSubir = modo === 'nenhum' ? isDono : (prog.podeSubir && isDono)

  async function aplicarXp(valor) {
    const n = Math.trunc(Number(valor))
    if (!Number.isFinite(n) || n === 0) return
    setErro('')
    setOcupado(true)
    try {
      await onAddXp(n)
      setDelta('')
    } catch (e) {
      setErro(e.message || 'Não foi possível alterar o XP.')
    } finally {
      setOcupado(false)
    }
  }

  async function subir(rowId) {
    setErro('')
    setOcupado(true)
    setEscolhendo(false)
    try {
      const novo = await onSubirNivel(rowId)
      setSubiuPara(novo ?? null)
      setTimeout(() => setSubiuPara(null), 4000)
    } catch (e) {
      setErro(e.message || 'Não foi possível subir de nível.')
    } finally {
      setOcupado(false)
    }
  }

  function iniciarSubida() {
    // Multiclasse → escolher a classe. Uma classe (ou nenhuma) → direto.
    if (classesFicha.length > 1) setEscolhendo(true)
    else subir(classesFicha[0]?.id ?? null)
  }

  return (
    <div className="bg-raised border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-ink-dim text-xs font-medium uppercase tracking-[.12em]">Nível</span>
          <span className={`text-xl font-bold transition-colors duration-700 ${subiuPara ? 'text-dice-400' : 'text-ink'}`}>
            {nivelTotal}
          </span>
          {subiuPara && (
            <span className="text-dice-400 text-xs font-semibold bg-dice-700/60 border border-dice-500/60 px-2 py-0.5 rounded-full animate-pulse">
              ✨ Subiu para o nível {subiuPara}!
            </span>
          )}
          {modo !== 'nenhum' && (
            <span className="text-ink-dim text-sm font-mono ml-1">
              {fmt(xp)}
              {prog.prox != null && <span className="text-ink-dim"> / {fmt(prog.prox)} XP</span>}
              {prog.noMaximo && <span className="text-ink-dim"> XP (nível máximo)</span>}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {podeDarXp && modo !== 'nenhum' && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={delta}
                onChange={e => setDelta(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') aplicarXp(delta) }}
                placeholder="XP"
                disabled={ocupado}
                className="w-20 px-2 py-1 rounded-lg bg-void border border-border text-ink text-sm text-center placeholder-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-50"
              />
              <button
                onClick={() => aplicarXp(delta)}
                disabled={ocupado || !delta}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-accent-700 hover:bg-accent-600 text-ink transition-colors disabled:opacity-40"
                title="Adicionar XP (use negativo para remover)"
              >
                + XP
              </button>
            </div>
          )}

          {podeSubir && !escolhendo && (
            <button
              onClick={iniciarSubida}
              disabled={ocupado}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg text-ink transition-colors disabled:opacity-50 ${
                prog.podeSubir
                  ? 'bg-dice-500 hover:bg-dice-500 animate-pulse' // XP liberou: chama atenção
                  : 'bg-accent-700 hover:bg-accent-600'             // modo sem XP: botão discreto
              }`}
            >
              ⬆ Subir de nível
            </button>
          )}
        </div>
      </div>

      {/* Barra de progresso até o próximo nível */}
      {modo !== 'nenhum' && !prog.noMaximo && (
        <div>
          <div className="h-2.5 bg-hover rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                prog.podeSubir ? 'bg-dice-500' : 'bg-accent-500'
              }`}
              style={{ width: `${prog.pct}%` }}
            />
          </div>
          <p className="text-xs mt-1">
            {prog.podeSubir ? (
              <span className="text-dice-400 font-semibold">Nível disponível!</span>
            ) : (
              <span className="text-ink-dim">Faltam {fmt(prog.faltam)} XP para o nível {nivelTotal + 1}</span>
            )}
          </p>
        </div>
      )}

      {/* Escolha da classe que recebe o nível (multiclasse) */}
      {escolhendo && (
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-accent-300 text-sm">Em qual classe colocar o nível?</p>
          <div className="flex flex-wrap gap-2">
            {classesFicha.map(cf => (
              <button
                key={cf.id}
                onClick={() => subir(cf.id)}
                disabled={ocupado}
                className="px-3 py-1.5 text-sm rounded-lg bg-void border border-border text-ink hover:border-dice-500 hover:text-dice-400 transition-colors disabled:opacity-50"
              >
                {cf.classe?.nome || 'Classe'} <span className="text-ink-dim">{cf.nivel} → {cf.nivel + 1}</span>
              </button>
            ))}
            <button
              onClick={() => setEscolhendo(false)}
              className="px-2 py-1.5 text-sm text-ink-dim hover:text-ink transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {erro && <p className="text-harm text-xs">{erro}</p>}
    </div>
  )
}
