import { useState } from 'react'
import { useCreateMesa } from '../../hooks/useMesa'
import Modal, { FecharModal } from '../ui/Modal'
import Botao from '../ui/Botao'
import { t } from '../../i18n'

export default function MesaCreate({ onClose, onCreated }) {
  const { createMesa, loading } = useCreateMesa()
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const mesa = await createMesa(nome, descricao)
      onCreated(mesa)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Modal
      onFechar={onClose} bloqueado={loading}
      titulo={t('Nova mesa')} subtitulo={t('O seu grupo de jogo. Depois você convida os jogadores.')}
      rodape={
        <>
          <FecharModal disabled={loading} />
          <Botao type="submit" form="form-nova-mesa" variante="primario" disabled={loading || !nome.trim()}>
            {loading ? t('Criando…') : t('Criar mesa')}
          </Botao>
        </>
      }
    >
      <form id="form-nova-mesa" onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="rotulo">{t('Nome da mesa')}</span>
          <input
            type="text" required maxLength={80} autoFocus
            value={nome} onChange={e => setNome(e.target.value)}
            className="campo w-full" placeholder={t('Ex.: A Masmorra dos Dragões')}
          />
        </label>
        <label className="block">
          <span className="rotulo">{t('Descrição')} <span className="text-ink-dim font-normal">{t('(opcional)')}</span></span>
          <textarea
            rows={3} maxLength={300}
            value={descricao} onChange={e => setDescricao(e.target.value)}
            className="campo w-full resize-none" placeholder={t('Uma breve descrição da campanha…')}
          />
        </label>
        {error && <p className="aviso-erro" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}
