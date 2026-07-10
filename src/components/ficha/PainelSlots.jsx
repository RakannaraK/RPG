import { useState } from 'react'
import { gastarSlot, devolverSlot, slotsDisponiveis } from '../../lib/slotsEngine'

/**
 * Fase 20.3 — painel de slots por círculo.
 * Adaptativo: some se o sistema não usa slots ou se a ficha não tem nenhum.
 * O total é DERIVADO da grade; aqui só se mexe em `usados`.
 */
export default function PainelSlots({
  rotulo = 'Espaços',
  totais = {},
  usados = {},
  isDono,
  onDefinirUsados,
}) {
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const circulos = Object.keys(totais).map(Number).sort((a, b) => a - b)
  if (circulos.length === 0) return null

  const disp = slotsDisponiveis(totais, usados)

  async function aplicar(circulo, novoUsados) {
    setOcupado(true)
    setErro('')
    try {
      await onDefinirUsados(circulo, novoUsados)
    } catch (e) {
      setErro(e.message || 'Erro ao atualizar slots.')
    } finally {
      setOcupado(false)
    }
  }

  async function gastar(circulo) {
    const r = gastarSlot(circulo, totais, usados)
    if (!r.ok) { setErro(r.motivo); return }
    await aplicar(circulo, r.usados)
  }

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-2xl p-4 space-y-2.5">
      <p className="text-purple-200 text-sm font-semibold">{rotulo}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {circulos.map(c => {
          const total = totais[c]
          const usadosC = Number(usados[c]) || 0
          const disponivel = disp[c]
          const esgotado = disponivel === 0
          return (
            <div key={c} className="flex items-center gap-2 bg-purple-950/40 border border-purple-800 rounded-xl px-3 py-2">
              <span className="text-amber-400 text-xs font-mono shrink-0 w-8">{c}º</span>

              {/* Bolinhas: preenchidas = disponíveis */}
              <div className="flex gap-1 flex-wrap flex-1 min-w-0">
                {Array.from({ length: total }, (_, i) => (
                  <span
                    key={i}
                    className={`w-3 h-3 rounded-full border ${
                      i < disponivel
                        ? 'bg-amber-500 border-amber-400'
                        : 'bg-transparent border-purple-700'
                    }`}
                  />
                ))}
              </div>

              <span className={`text-xs font-mono shrink-0 ${esgotado ? 'text-red-400' : 'text-purple-300'}`}>
                {disponivel}/{total}
              </span>

              {isDono && (
                <span className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => gastar(c)}
                    disabled={ocupado || esgotado}
                    className="w-6 h-6 flex items-center justify-center rounded-lg border border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors disabled:opacity-30"
                    title="Gastar um slot"
                  >
                    −
                  </button>
                  <button
                    onClick={() => aplicar(c, devolverSlot(c, usados))}
                    disabled={ocupado || usadosC === 0}
                    className="w-6 h-6 flex items-center justify-center rounded-lg border border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors disabled:opacity-30"
                    title="Devolver um slot"
                  >
                    +
                  </button>
                </span>
              )}
            </div>
          )
        })}
      </div>

      {erro && <p className="text-red-400 text-xs">{erro}</p>}
    </div>
  )
}
