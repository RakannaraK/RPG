/**
 * Ordenação de iniciativa (F14.3) — determinística, para todos os clientes verem
 * a mesma ordem de turnos. Por iniciativa (desc, nulos por último), desempate por
 * `ordem` (desempate manual, 14.7) e depois por criação.
 */
export function ordenarPorIniciativa(lista) {
  return [...(lista || [])].sort((a, b) => {
    const ia = a.iniciativa ?? -Infinity
    const ib = b.iniciativa ?? -Infinity
    if (ib !== ia) return ib - ia
    if ((a.ordem || 0) !== (b.ordem || 0)) return (a.ordem || 0) - (b.ordem || 0)
    return new Date(a.created_at) - new Date(b.created_at)
  })
}
