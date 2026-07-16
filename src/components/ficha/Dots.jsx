/**
 * Fase 24.3 — dots (bolinhas). SÓ exibição: o valor é número em todo lugar
 * (banco, motores, fórmulas, paradas F23).
 *
 * UX consagrada: clicar na bolinha N define o valor N; clicar na bolinha mais
 * alta já cheia reduz para N−1. Buffs além do valor base (ou acima do máximo de
 * bolinhas) aparecem como ◆ de destaque — o clique edita sempre o valor BASE.
 */
export default function Dots({
  valor = 0,           // valor FINAL exibido (base + buffs)
  valorBase = null,    // valor BASE editável (null = igual ao valor)
  max = 5,
  canEdit = false,
  onSet,               // (novoValorBase) => void
  size = 'md',         // 'sm' | 'md'
}) {
  const v = Math.max(0, Math.floor(Number(valor) || 0))
  const base = valorBase == null ? v : Math.max(0, Math.floor(Number(valorBase) || 0))
  const m = Math.max(1, Math.min(10, Math.floor(Number(max) || 5)))
  const extras = Math.max(0, v - m)
  const dim = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  function clicar(n) {
    if (!canEdit || !onSet) return
    onSet(n === base ? n - 1 : n) // clicar na mais alta cheia reduz
  }

  return (
    <div className="flex items-center gap-1 flex-wrap" role="group">
      {Array.from({ length: m }, (_, i) => {
        const n = i + 1
        const cheia = n <= v
        const buffada = cheia && n > base // preenchida só por modificador
        return (
          // botão com área de toque generosa (mobile); a bolinha é o span interno
          <button
            key={n}
            type="button"
            onClick={() => clicar(n)}
            disabled={!canEdit}
            className={`p-1 -m-0.5 ${canEdit ? 'cursor-pointer group/dot' : 'cursor-default'}`}
            title={canEdit ? `Definir ${n === base ? n - 1 : n}` : `${v}`}
          >
            <span className={`block ${dim} rounded-full border-2 transition-all duration-150 ${
              buffada ? 'bg-green-400 border-green-300'
                : cheia ? 'bg-purple-200 border-purple-100'
                : 'bg-transparent border-purple-700'
            } ${canEdit ? 'group-hover/dot:scale-125 group-hover/dot:border-purple-300' : ''}`} />
          </button>
        )
      })}
      {extras > 0 && (
        <span className="text-green-400 text-xs font-bold ml-0.5" title={`+${extras} acima do máximo (modificadores)`}>
          +{extras}
        </span>
      )}
    </div>
  )
}
