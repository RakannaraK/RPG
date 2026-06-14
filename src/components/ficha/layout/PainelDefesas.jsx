const COR_CHIP = {
  resistencia:     'bg-blue-900/60 border-blue-700/60 text-blue-300',
  imunidade:       'bg-green-900/60 border-green-700/60 text-green-300',
  vulnerabilidade: 'bg-red-900/60 border-red-700/60 text-red-300',
}

function Chips({ itens, tipo }) {
  if (itens.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="text-purple-500 text-[10px] uppercase tracking-wider font-medium">
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
    <div className="bg-slate-800 border border-purple-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-purple-900">
        <p className="text-purple-200 text-sm font-semibold">Defesas</p>
      </div>
      <div className="px-4 py-3 space-y-3">
        {vazio ? (
          <p className="text-purple-600 text-xs py-2">
            Nenhuma resistência ou imunidade. Atribua raça/classe com modificadores de defesa.
          </p>
        ) : (
          <>
            {vidaTemp > 0 && (
              <div>
                <p className="text-purple-500 text-[10px] uppercase tracking-wider font-medium mb-1">Vida Temporária</p>
                <span className="px-2.5 py-0.5 rounded-full border border-sky-700/60 bg-sky-900/60 text-sky-300 text-xs font-medium">
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
