import { useState } from 'react'
import Dots from './Dots'

const NIVEL_LABEL = n => `Nível ${n}`

/**
 * Fase 25.3c — linhas de poder na ficha: rating em dots (F24.3) + poderes da
 * linha agrupados por nível, desbloqueados (rating >= nível) vs bloqueados
 * ("req. <linha> N"). Aprender reusa o fluxo F20.4 (onAprender = aprenderPoder).
 * Único caminho de aprendizado de poder de linha (o catálogo geral de Poderes
 * exclui poderes com linha_id).
 */
export default function PainelLinhas({
  linhas = [],
  catalogoPoderes = [],
  poderesFicha = [],
  ratingDe,
  onDefinirRating,
  isDono,
  onAprender,
}) {
  const [erro, setErro] = useState('')

  if (linhas.length === 0) return null

  const jaTem = new Set(poderesFicha.map(l => l.poder_id))

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-2xl p-4 space-y-3">
      <p className="text-purple-200 text-sm font-semibold">Linhas de poder</p>
      {linhas.map(linha => {
        const rating = ratingDe(linha.id)
        const poderesDaLinha = catalogoPoderes.filter(p => p.linha_id === linha.id)
        const porNivel = {}
        for (const p of poderesDaLinha) {
          const n = p.nivel_linha ?? 0
          if (!porNivel[n]) porNivel[n] = []
          porNivel[n].push(p)
        }
        const niveis = Object.keys(porNivel).map(Number).sort((a, b) => a - b)

        return (
          <div key={linha.id} className="border-t border-purple-900/60 pt-2.5 first:border-t-0 first:pt-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white text-sm font-medium">{linha.nome}</span>
              <Dots
                valor={rating}
                max={linha.maximo || 5}
                canEdit={isDono}
                onSet={n => onDefinirRating(linha.id, n)}
                size="sm"
              />
            </div>
            {linha.descricao && <p className="text-purple-600 text-[11px]">{linha.descricao}</p>}

            {niveis.length === 0 ? (
              <p className="text-purple-700 text-[11px]">Nenhum poder cadastrado nesta linha.</p>
            ) : (
              <div className="space-y-1.5 pl-1">
                {niveis.map(n => (
                  <div key={n}>
                    <p className="text-purple-500 text-[11px] uppercase tracking-wide">{NIVEL_LABEL(n)}</p>
                    <div className="space-y-1">
                      {porNivel[n].map(poder => {
                        const desbloqueado = rating >= n
                        const aprendido = jaTem.has(poder.id)
                        return (
                          <div key={poder.id} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${
                            desbloqueado ? 'bg-purple-950/40' : 'bg-slate-900/40 opacity-60'
                          }`}>
                            <span className={`text-xs flex-1 truncate ${desbloqueado ? 'text-white' : 'text-purple-600'}`}>
                              {poder.nome}
                            </span>
                            {aprendido ? (
                              <span className="text-green-400 text-[11px] shrink-0">✓ aprendido</span>
                            ) : desbloqueado ? (
                              isDono && (
                                <button
                                  onClick={() => onAprender(poder.id, 'linha').catch(e => setErro(e.message || 'Erro ao aprender.'))}
                                  className="text-[11px] px-2 py-0.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white transition-colors shrink-0"
                                >
                                  Aprender
                                </button>
                              )
                            ) : (
                              <span className="text-purple-700 text-[11px] shrink-0" title={`Requer ${linha.nome} ${n}`}>
                                req. {linha.nome} {n}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
      {erro && <p className="text-red-400 text-[11px]">{erro}</p>}
    </div>
  )
}
