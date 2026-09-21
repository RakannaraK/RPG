/**
 * Ordenação de iniciativa (F14.3) — determinística, para todos os clientes verem
 * a mesma ordem de turnos. Por iniciativa (desc, nulos por último), desempate por
 * `ordem` (desempate manual, 14.7) e depois por criação. Reserva não entra.
 */
export function ordenarPorIniciativa(lista) {
  // F32.4 — quem está na reserva fica fora da ordem de turnos (volta ao trocar)
  return (lista || []).filter(c => !c.reserva).sort((a, b) => {
    const ia = a.iniciativa ?? -Infinity
    const ib = b.iniciativa ?? -Infinity
    if (ib !== ia) return ib - ia
    if ((a.ordem || 0) !== (b.ordem || 0)) return (a.ordem || 0) - (b.ordem || 0)
    return new Date(a.created_at) - new Date(b.created_at)
  })
}
