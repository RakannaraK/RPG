import ImagensTab from '../ImagensTab'

export default function PainelImagens({ fichaId, donoId, isDono }) {
  return (
    <div className="bg-raised border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-ink text-sm font-semibold">Imagens</p>
      </div>
      <div className="p-3">
        <ImagensTab fichaId={fichaId} donoId={donoId} isDono={isDono} />
      </div>
    </div>
  )
}
