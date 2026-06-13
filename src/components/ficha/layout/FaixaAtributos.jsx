import AtributoCard from '../AtributoCard'

export default function FaixaAtributos({
  valoresAtributos,
  isDono,
  mesaId,
  fichaId,
  registrarRolagem,
  onSaveValor,
}) {
  if (!valoresAtributos || valoresAtributos.length === 0) return null

  return (
    <div>
      <p className="text-purple-400 text-xs font-medium uppercase tracking-wider mb-3">
        Atributos
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
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
          />
        ))}
      </div>
    </div>
  )
}
