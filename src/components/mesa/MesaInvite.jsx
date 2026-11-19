import { useState } from 'react'
import { useJoinMesa } from '../../hooks/useMesa'
import { t, tx } from '../../i18n'
import Modal, { FecharModal } from '../ui/Modal'
import Botao from '../ui/Botao'

export default function MesaInvite({ onClose, onJoined }) {
  const { joinMesa, loading } = useJoinMesa()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const mesa = await joinMesa(codigo)
      onJoined(mesa)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Modal
      onFechar={onClose} bloqueado={loading} tamanho="sm"
      titulo={t('Entrar em uma mesa')} subtitulo={t('Peça o código (ou o link) de convite ao mestre da mesa.')}
      rodape={
        <>
          <FecharModal disabled={loading} />
          <Botao type="submit" form="form-convite" variante="primario" disabled={loading || codigo.trim().length < 6}>
            {loading ? t('Entrando…') : tx('mesa', 'Entrar')}
          </Botao>
        </>
      }
    >
      <form id="form-convite" onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="rotulo">{t('Código de convite')}</span>
          <input
            type="text" required maxLength={200} autoFocus
            value={codigo} onChange={e => setCodigo(e.target.value.toLowerCase())}
            className={`campo w-full font-mono tracking-widest text-center text-lg uppercase ${error ? 'tremer' : ''}`}
            placeholder={t('código ou link')}
            aria-invalid={!!error}
          />
        </label>
        {error && <p className="aviso-erro" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}
