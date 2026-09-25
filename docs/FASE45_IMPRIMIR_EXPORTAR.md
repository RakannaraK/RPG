# Fase 45 — Ficha para imprimir (A4 + QR code) e baixar a mesa inteira

> Da análise de concorrência de 2026-09: Character Sheet Online imprime; Mestre RPG exporta PDF e
> Markdown; Kanka promete "sem prisão". Aqui, as duas coisas saem do que já existia.

## Ficha para imprimir
- **Botão "Imprimir"** no topo da ficha. Também vale o Ctrl+P, porque tudo é CSS e não há um
  "modo impressão" para ligar.
- **Papel branco, tinta preta, em qualquer tema** (`@media print` no `index.css`):
  - toda cor vira `#111` e os rótulos apagados ficam cinza;
  - fundos não saem, e a impressora agradece;
  - saem do papel a navegação, as macros, os avisos flutuantes e os modais;
  - a margem é de 12 mm em A4.
- **Todas as abas saem no papel**, uma depois da outra: Ações, Inventário, Traços, Notas e
  Habilidades, cada uma com o próprio título.
  - As abas agora ficam sempre montadas: a inativa só some na tela. Assim o inventário já está
    carregado quando alguém imprime.
  - As notas do dono saem como parágrafo, porque o campo de texto cortaria o que passa da
    altura dele.
- **Topo do papel**: o nome, o link da versão online e um **QR code** que abre a ficha no
  celular.
  - A biblioteca do QR (`qrcode-generator`, MIT, sem dependências) vem num pedaço separado de
    7 KB (gzip), carregado só na página da ficha.
- Conferido gerando o PDF A4 de verdade pelo navegador: duas páginas, texto preto, QR legível e
  todas as abas.

## Baixar a mesa inteira
- **Aba Membros → "Baixar a mesa inteira"**. Qualquer membro baixa, e cada um leva **só o que já
  pode ver** (o RLS decide), então o jogador não leva o segredo do mestre.
- O arquivo `nome_da_mesa.mesa.json` traz:
  - os dados da mesa;
  - o sistema (no mesmo formato do "exportar sistema");
  - todas as fichas (no mesmo formato do "exportar ficha");
  - membros, sessões, agenda, calendário e eventos, relógios, notas, chat, enciclopédia e
    revelações, combinados e limites, e mapas.
- **Não vão**: o código de convite e o token do overlay, que dariam acesso à mesa a quem
  receber o arquivo.
- `lib/exportMesa.js` é puro, com 2 testes (sem segredos, toda tabela presente, nome do arquivo).
  A leitura do banco fica em `lib/fichaBanco.js`:
  - o sistema é lido uma vez só, não uma vez por ficha;
  - as tabelas são lidas de 1000 em 1000 linhas;
  - uma tabela que não existe vira lista vazia.
- Conferido como mestre na mesa de teste: 1 ficha e 12 tabelas em 2 s, sem o código de convite.

## Limites conhecidos
- Ainda não há **importar** a mesa inteira: o arquivo é uma cópia de segurança. Fichas e sistema
  de dentro dele já podem ser importados pelos botões que existem.
- O jogador baixa a enciclopédia vazia, porque ele só lê os verbetes revelados pela função da
  F41, e não pela tabela.
- O visual impresso segue o da tela, só que em preto e branco; não é uma ficha diagramada à parte.
