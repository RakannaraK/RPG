import { juntarRecompensas, contarPendentes } from '../../lib/recompensas'

/**
 * Fase 19.6 — checklist de recompensas de nível.
 *
 * São TEXTO-GUIA: o app não aplica nada. "+2 pontos de atributo" continua sendo
 * aplicado à mão nos atributos; aqui o jogador só marca que já fez.
 */
export default function PainelRecompensas({
  recompensasFicha = [],
  recompensas = [],
  classes = [],
  isDono,
  onMarcar,
}) {
  const lista = juntarRecompensas(recompensasFicha, recompensas)
  if (lista.length === 0) return null

  const pendentes = contarPendentes(recompensasFicha)

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-purple-200 text-sm font-semibold">Recompensas de nível</p>
        {pendentes > 0 && (
          <span className="text-amber-400 text-xs font-semibold bg-amber-950/50 border border-amber-800/60 px-2 py-0.5 rounded-full">
            {pendentes} pendente{pendentes > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {pendentes > 0 && (
        <p className="text-purple-600 text-xs">
          Aplique cada uma nas telas normais da ficha e marque aqui quando terminar.
        </p>
      )}

      <div className="space-y-1.5">
        {lista.map(rf => {
          const r = rf.recompensa
          const classe = r.classe_id ? classes.find(c => c.id === r.classe_id) : null
          const escala = classe ? `${classe.nome} ${r.nivel}` : `nível ${r.nivel}`
          return (
            <label
              key={rf.id}
              className={`flex items-start gap-2.5 rounded-lg px-2.5 py-2 border transition-colors ${
                rf.concluida
                  ? 'bg-slate-800/40 border-purple-900/50 opacity-60'
                  : 'bg-purple-950/40 border-purple-800'
              } ${isDono ? 'cursor-pointer hover:border-purple-600' : ''}`}
            >
              <input
                type="checkbox"
                checked={!!rf.concluida}
                disabled={!isDono}
                onChange={e => onMarcar(rf.id, e.target.checked)}
                className="mt-0.5 accent-purple-500 shrink-0 disabled:opacity-50"
              />
              <span className="min-w-0 flex-1">
                <span className={`text-sm block ${rf.concluida ? 'text-purple-500 line-through' : 'text-white'}`}>
                  {r.titulo}
                </span>
                {r.descricao && (
                  <span className="text-purple-500 text-xs block mt-0.5">{r.descricao}</span>
                )}
              </span>
              <span className="text-purple-600 text-[11px] font-mono shrink-0 mt-0.5">{escala}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
