import { useState } from 'react'
import { exportarMesaDoBanco } from '../../lib/fichaBanco'
import { nomeArquivoMesa } from '../../lib/exportMesa'
import { baixarJson } from '../../lib/baixarArquivo'
import Botao from '../ui/Botao'

/** F45 — a mesa inteira num .json: a cópia de quem joga, para nunca ficar preso ao site. */
export default function BaixarMesa({ mesaId, nome }) {
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState('')

  async function baixar() {
    setBaixando(true); setErro('')
    try { baixarJson(nomeArquivoMesa(nome), await exportarMesaDoBanco(mesaId)) }
    catch (e) { setErro(e.message || 'Não foi possível juntar a mesa.') }
    finally { setBaixando(false) }
  }

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl p-5">
      <p className="text-purple-300 text-sm font-medium mb-1">Baixar a mesa inteira</p>
      <p className="text-accent-300 text-xs mb-3">
        Um arquivo .json com o sistema, as fichas, a enciclopédia, o calendário, as notas e o chat —
        tudo o que você pode ver nesta mesa. É a sua cópia: a campanha é de vocês, não do site.
        O código de convite não vai junto.
      </p>
      <Botao variante="secundario" onClick={baixar} disabled={baixando}>{baixando ? 'Juntando tudo…' : 'Baixar (.json)'}</Botao>
      {erro && <p className="text-harm text-xs mt-2" role="alert">{erro}</p>}
    </div>
  )
}
