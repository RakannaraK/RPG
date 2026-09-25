# Fase 47 — Jogador convidado (sem conta) e app instalável

> Da análise de concorrência de 2026-09: Sessão Virtual, Character Sheet Online e Help RPG deixam
> entrar sem cadastro; Let's Role, Samwise e Tableplop têm app. As duas coisas tiram atrito de
> entrada.

## ⚠️ Falta um clique no painel do Supabase
O login anônimo está **desligado** no projeto (`anonymous_users: false`). Para ligar:
**Supabase → Authentication → Sign In / Providers → "Allow anonymous sign-ins" → Save.**

Enquanto estiver desligado, o convite por link funciona normalmente para quem tem conta, e a
opção "Entrar como convidado" **nem aparece**: o site pergunta ao Supabase antes de oferecer.
Depois de ligar, ela aparece sozinha, sem precisar de deploy.

## Como ficou
- **Convite por link**:
  - Na aba Membros, o botão "Copiar link de convite" copia `…/convite/<código>`.
  - Quem abre o link:
    - **com conta**: "Entrar na mesa" (se já é membro, só abre a mesa);
    - **sem conta**: "Entrar com minha conta ou criar uma". Depois do login, a pessoa **volta
      para o convite**, e só para um convite: um link de fora nunca é usado como destino;
    - **como convidado** (quando ligado): digita só o nome e entra. O nome vira o apelido
      naquela mesa.
  - "Entrar com código" no painel agora aceita o link inteiro colado.
- **Banco** (`sql/fase47_convidado.sql`, rodado):
  - O convidado é um usuário `authenticated` como qualquer outro. Por isso entram **políticas
    restritivas**, que valem por cima das outras. Com elas, convidado **não cria mesa**, **não
    publica, curte nem denuncia** na comunidade (conta anônima é de graça, e 3 denúncias escondem
    uma publicação) e **não envia arquivos**.
  - Dentro da mesa ele joga normalmente: ficha, chat e dados.
  - `handle_new_user` agora dá ao convidado um perfil `convidado-xxxxxxxx`. O `username` é único
    e obrigatório, e antes o gatilho falhava calado para quem não tem e-mail.
  - **14/14 checagens** em transação desfeita, com um usuário anônimo de verdade criado dentro
    dela.
  - Também foi conferido que o bloqueio de upload é mesmo da política nova: com conta, o mesmo
    envio passa.
- **Aviso de convidado** (no painel e na mesa): "Você está como convidado… crie uma conta para
  não perder a ficha".
  - O formulário de e-mail e senha transforma o convidado em conta de verdade (mesmo usuário,
    então a ficha continua).
  - O painel esconde "+ Nova mesa" e a comunidade esconde publicar e curtir para convidado. O
    banco barra do mesmo jeito.
- **App instalável (PWA)**: `manifest.json` (nome, cores, abrir no painel, modo app) e
  ícones PNG 192, 512, 512 "maskable" e 180 (Apple), gerados a partir do `favicon.svg`.
  - O próprio Chrome confirmou **zero erros de instalabilidade** (`Page.getInstallabilityErrors`).
  - Não precisou de service worker.
- `lib/convite.js` (puro, 4 testes): lê o código ou o link, valida o nome, reconhece a sessão
  de convidado e escolhe o destino seguro depois do login.
- De quebra, o `index.html` passou a declarar `lang="pt-BR"` (estava `en`, e o leitor de tela lia
  o site com voz inglesa).

## Conferido no navegador
- **Mestre logado** abriu o link e caiu na mesa.
- **Deslogado**: com o anônimo desligado, só a opção de conta aparece. Depois do login, a pessoa
  volta ao convite.
- **Tela de convidado**, simulando só a resposta de configurações:
  - o nome vazio é barrado;
  - o erro do servidor aparece traduzido.
- **Não testado de ponta a ponta**: a entrada real de convidado, que depende de ligar o anônimo.
  - O caminho no banco foi testado com um usuário anônimo real, dentro da transação desfeita.

## Limites conhecidos
- Convidado que limpa os dados do navegador perde o acesso (a conta mora ali). O aviso explica
  isso e oferece criar a conta.
- O Supabase limita a criação de convidados por IP (padrão de 30 por hora) e recomenda captcha
  se virar alvo de abuso. Não foi ligado agora.
- O PWA não funciona offline: ele instala e abre como app, mas precisa de internet (o site é
  todo em tempo real).
- Os ícones PNG são a única exceção à regra "zero arquivos de imagem": o Android e o Chrome
  exigem esse formato para instalar.
