const COR_CHIP = {
  resistencia:     'bg-temp/15 border-temp/50 text-temp',
  imunidade:       'bg-ok/15 border-ok/50 text-ok',
  vulnerabilidade: 'bg-harm/60 border-harm/60 text-harm',
}

function Chips({ itens, tipo }) {
  if (itens.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="text-ink-dim text-[10px] uppercase tracking-[.12em] font-medium">
        {tipo === 'resistencia' && 'Resistências'}
        {tipo === 'imunidade' && 'Imunidades'}
        {tipo === 'vulnerabilidade' && 'Vulnerabilidades'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {itens.map(item => (
          <span
            key={item}
            className={`px-2.5 py-0.5 rounded-full border text-xs font-medium capitalize ${COR_CHIP[tipo]}`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function PainelDefesas({
  resistencias = [],
  imunidades = [],
  vulnerabilidades = [],
  vidaTemp = 0,
}) {
  const vazio = resistencias.length === 0 && imunidades.length === 0 && vulnerabilidades.length === 0 && vidaTemp === 0

  return (
    <div className="bg-raised border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-ink text-sm font-semibold">Defesas</p>
      </div>
      <div className="px-4 py-3 space-y-3">
        {vazio ? (
          <p className="text-ink-dim text-xs py-2">
            Nenhuma resistência ou imunidade. Atribua raça/classe com modificadores de defesa.
          </p>
        ) : (
          <>
            {vidaTemp > 0 && (
              <div>
                <p className="text-ink-dim text-[10px] uppercase tracking-[.12em] font-medium mb-1">Vida Temporária</p>
                <span className="px-2.5 py-0.5 rounded-full border border-temp/60 bg-temp/60 text-temp text-xs font-medium">
                  +{vidaTemp}
                </span>
              </div>
            )}
            <Chips itens={resistencias}     tipo="resistencia" />
            <Chips itens={imunidades}       tipo="imunidade" />
            <Chips itens={vulnerabilidades} tipo="vulnerabilidade" />
          </>
        )}
      </div>
    </div>
  )
}
