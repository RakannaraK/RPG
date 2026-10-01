// Guia do mestre — onboarding. Conceitos + primeiros passos + dicas.
import Botao from '../ui/Botao'
import Modal from '../ui/Modal'
export default function GuiaMestre({ onFechar }) {
  return (
    <Modal
      onFechar={onFechar} tamanho="lg"
      titulo="Guia do mestre" subtitulo="Como montar e tocar a sua mesa"
      rodape={<Botao variante="primario" onClick={onFechar}>Entendi</Botao>}
    >
      <div className="space-y-6 text-sm">
          <section>
            <h3 className="text-purple-200 font-semibold mb-2">Os conceitos</h3>
            <ul className="space-y-1.5 text-purple-300">
              <li><strong className="text-white">Mesa</strong> — o seu grupo de jogo. Você (mestre) cria e convida os jogadores.</li>
              <li><strong className="text-white">Sistema</strong> — as regras da mesa: atributos, como o dado rola, perícias, poderes... Você monta como quiser.</li>
              <li><strong className="text-white">Ficha</strong> — o personagem de cada jogador, seguindo o sistema da mesa.</li>
              <li><strong className="text-white">Sessão</strong> — o jogo ao vivo: as rolagens de todos aparecem em tempo real, combate, etc.</li>
            </ul>
          </section>
          <section>
            <h3 className="text-purple-200 font-semibold mb-2">Primeiros passos</h3>
            <ol className="space-y-1.5 text-purple-300 list-decimal list-inside">
              <li><strong className="text-white">Monte o sistema.</strong> Na aba Sistema, comece de um <em>modelo pronto</em>, importe um <em>.json</em>, ou crie do zero. Dá pra ajustar tudo depois.</li>
              <li><strong className="text-white">Convide os jogadores</strong> pelo código de convite da mesa.</li>
              <li><strong className="text-white">Cada jogador cria a ficha</strong> seguindo o sistema.</li>
              <li><strong className="text-white">Abra uma sessão</strong> pra jogar: as rolagens aparecem para todos em tempo real.</li>
            </ol>
          </section>
          <section>
            <h3 className="text-purple-200 font-semibold mb-2">Dicas</h3>
            <ul className="space-y-1.5 text-purple-300">
              <li>Não precisa configurar tudo de uma vez — ligue as seções conforme precisar, no editor de sistema.</li>
              <li><strong className="text-white">Exporte</strong> o sistema (botão no editor) para ter um backup ou reaproveitar em outra mesa.</li>
              <li>Seu <strong className="text-white">nome de exibição</strong> (em Preferências ⚙) é o que os outros veem — troque quando quiser.</li>
            </ul>
          </section>
      </div>
    </Modal>
  )
}
