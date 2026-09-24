// Guia do mestre — onboarding. Conceitos + primeiros passos + dicas.
import Botao from '../ui/Botao'
export default function GuiaMestre({ onFechar }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onFechar}>
      <div className="bg-slate-900 border border-purple-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-900 shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">Guia do mestre</h2>
            <p className="text-purple-400 text-xs mt-0.5">Como montar e tocar a sua mesa</p>
          </div>
          <button onClick={onFechar} className="text-purple-400 hover:text-white text-xl leading-none transition-colors">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm">
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
        <div className="px-6 py-4 border-t border-purple-900 flex justify-end shrink-0">
          <Botao variante="primario" tamanho="md" onClick={onFechar} className="font-semibold">Entendi</Botao>
        </div>
      </div>
    </div>
  )
}
