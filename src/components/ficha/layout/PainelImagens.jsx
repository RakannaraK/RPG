import ImagensTab from '../ImagensTab'

export default function PainelImagens({ fichaId, donoId, isDono }) {
  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-purple-900">
        <p className="text-purple-200 text-sm font-semibold">Imagens</p>
      </div>
      <div className="p-3">
        <ImagensTab fichaId={fichaId} donoId={donoId} isDono={isDono} />
      </div>
    </div>
  )
}
