/**
 * Fase 13.2 — barra de presença: avatares (iniciais) de quem está conectado
 * à sessão agora. `meuId` destaca o próprio usuário.
 */
function iniciais(nome) {
  const partes = (nome || '?').trim().split(/\s+/)
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

// Cor determinística a partir do id, para o avatar
function corDe(id) {
  const cores = [
    'bg-purple-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600',
    'bg-rose-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-teal-600',
  ]
  let h = 0
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return cores[h % cores.length]
}

export default function PresencaBar({ conectados = [], meuId, conectado = true }) {
  return (
    <div className="flex items-center gap-2">
      {/* F38: um indicador só. Antes havia "Conectado ●" no cabeçalho e
          "● N online" aqui — dois pontos verdes colados dizendo coisas
          diferentes. O ponto agora é o estado da conexão; o texto, quem está. */}
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium shrink-0 ${conectado ? 'text-emerald-300' : 'text-amber-300'}`}
        title={conectado ? 'Tempo real conectado' : 'Reconectando ao tempo real…'}
      >
        <span className={`w-2 h-2 rounded-full ${conectado ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
        {conectado ? `${conectados.length} online` : 'reconectando…'}
      </span>
      <div className="flex -space-x-2">
        {conectados.map(c => {
          const titulo = `${c.nome}${c.id === meuId ? ' (você)' : ''}${c.conexoes > 1 ? ` · ${c.conexoes} abas` : ''}`
          const borda = c.id === meuId ? 'border-emerald-400' : 'border-slate-900'
          return c.avatar ? (
            <img
              key={c.id}
              src={c.avatar}
              alt={c.nome}
              title={titulo}
              className={`w-7 h-7 rounded-full object-cover border-2 ${borda}`}
            />
          ) : (
            <div
              key={c.id}
              title={titulo}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 ${borda} ${corDe(c.id)}`}
            >
              {iniciais(c.nome)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
