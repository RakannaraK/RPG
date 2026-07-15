import AtributoCard from '../AtributoCard'

export default function FaixaAtributos({
  valoresAtributos,
  isDono,
  mesaId,
  fichaId,
  registrarRolagem,
  registrarResolvida = null,
  resolucao = null,
  rerolagem = null,
  dadoPadrao,
  valoresFinaisMotor,
  detalhamentoMotor,
  onSaveValor,
  modificadoresAtivos = [],
  formulaModificador = '',
  contextoFormula = null,
}) {
  if (!valoresAtributos || valoresAtributos.length === 0) {
    return (
      <div className="border border-dashed border-purple-800 rounded-xl py-6 text-center">
        <p className="text-purple-500 text-sm">Nenhum atributo definido no sistema.</p>
        {isDono && (
          <p className="text-purple-600 text-xs mt-1">
            Configure os atributos em Sistema → Atributos.
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <p className="text-purple-400 text-xs font-medium uppercase tracking-wider mb-3">
        Atributos
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-2">
        {valoresAtributos.map(va => (
          <AtributoCard
            key={va.id}
            atributo={va.atributo}
            valorAtributo={va}
            onSave={onSaveValor}
            canEdit={isDono}
            mesaId={mesaId}
            fichaId={fichaId}
            registrarRolagem={registrarRolagem}
            registrarResolvida={registrarResolvida}
            resolucao={resolucao}
            rerolagem={rerolagem}
            dadoPadrao={dadoPadrao}
            valorFinal={valoresFinaisMotor ? valoresFinaisMotor[va.atributo?.id] : undefined}
            fontesMod={
              detalhamentoMotor?.atributos?.[va.atributo?.id]?.fontes?.length > 0
                ? detalhamentoMotor.atributos[va.atributo.id].fontes
                : undefined
            }
            modificadoresAtivos={modificadoresAtivos}
            formulaMod={formulaModificador}
            contextoFormula={contextoFormula}
            compact
          />
        ))}
      </div>
    </div>
  )
}
