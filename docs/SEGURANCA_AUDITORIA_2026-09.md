# Auditoria de segurança — 2026-09-26

Foco pedido: evitar problemas como SQL injection. A auditoria cobriu o banco (funções, RLS,
permissões), o código do site (injeção e XSS), segredos, cabeçalhos HTTP e dependências. Tudo
foi testado de verdade (no banco, dentro de transações desfeitas, e pela API com uma conta
normal), não só lido.

## Resultado em uma linha
**SQL injection: nenhum caminho encontrado.** Achei **uma falha grave** de outro tipo: qualquer
pessoa virava administradora. Ela foi **corrigida e testada**. Ficam recomendações que dependem de
você (cabeçalhos no Render, confirmação de e-mail) e melhorias opcionais.

## 1. SQL injection — nada encontrado
- **No site**: toda consulta usa os métodos com parâmetro do Supabase (`.eq(coluna, valor)`), que
  escapam o valor. Não existe filtro montado com texto do usuário (`.or()` com template), que é o
  jeito clássico de injetar num app Supabase.
- **No banco**: nenhuma função do site monta SQL com texto (`EXECUTE`). A única que usa é a do
  próprio Supabase (`rls_auto_enable`, que liga a RLS em toda tabela nova), e ela usa o nome da
  tabela já escapado pelo Postgres.
- **Todas as 32 funções DEFINER** (as que passam por cima da RLS) fixam o `search_path`, o que
  impede o sequestro por objeto de mesmo nome. As que gravam checam quem chama.
- Importar ficha, sistema ou mesa por arquivo JSON não executa nada: os valores viram dados, e a
  gravação passa pela RLS de quem importa.

## 2. Falha grave encontrada e corrigida: virar administrador
- **O problema**: a regra "perfil próprio" deixava cada pessoa editar a própria linha de
  `profiles`, com **todas** as colunas, inclusive `admin`. Um único comando pela API tornava
  qualquer conta administradora. Com isso ela via as publicações escondidas, editava ou apagava
  a publicação de qualquer um na Comunidade e lia todas as denúncias, com quem denunciou.
- **Conferido**: havia 0 administradores no banco; ninguém tinha usado.
- **Correção** (`sql/seguranca_auditoria_2026_09.sql`, rodado), em duas camadas:
  1. o site só pode gravar `username`, `avatar_url` e `preferencias` no perfil;
  2. um gatilho barra qualquer mudança em `admin` vinda do site, mesmo que um dia a permissão da
     tabela inteira volte por engano.
  - O dono do projeto continua podendo definir administradores pelo painel ou por SQL.
- **Testado**:
  - no banco (8/8): a pessoa não vira admin nem troca o próprio id;
  - o nome e as preferências continuam salvando, e o cadastro novo continua criando perfil;
  - **pela API, com uma conta normal**: "permission denied".
- **Endurecimento junto**: o Supabase dá por padrão `TRUNCATE`, `REFERENCES` e `TRIGGER` em todas
  as tabelas para os papéis do site. A API não usa nenhum dos três, e o `TRUNCATE` passaria por
  cima da RLS. Foram retirados, também para as tabelas futuras.

## 3. O que foi testado e está protegido
- **RLS ligada em 100% das tabelas**; nenhuma view (views poderiam furar a RLS).
- **O anônimo (sem login)** não tem permissão em tabela nenhuma. Ele executa exatamente as 3
  funções públicas previstas: `vitrine_publica`, `overlay_dados` (o token do overlay tem 32
  caracteres aleatórios) e `mesas_abertas`.
- **Escalada, testada como usuário comum** (21 tentativas):
  - não vira mestre, não toma nem renomeia mesa, não entra em mesa sem convite;
  - não mexe em ficha alheia nem move ficha para mesa em que não está;
  - não rola dado, não fala no chat nem manda aviso em nome de outra pessoa;
  - não edita nem apaga o que é dos outros;
  - não lê fichas, chat, rolagens, a mesa (e o convite) ou perfis de quem não conhece.
- Um editor de ficha **não** consegue tomar a ficha nem mudar quem tem acesso (há um gatilho para
  isso). O autor não consegue passar a publicação para outra pessoa (outro gatilho).
- **Storage**: cada um só envia, troca e apaga na própria pasta. Os tipos aceitos são só imagem e
  áudio: SVG e HTML não entram, então não dá para hospedar página maliciosa.
- **XSS**: o React escapa todo texto de usuário. O único HTML cru do site é o QR code, gerado no
  próprio navegador a partir do link da ficha. O ID de vídeo do YouTube é validado no site e no
  banco.
- **Segredos**: nenhuma senha, string de conexão ou chave privada no repositório nem no histórico
  do git. O `.env.local` é ignorado pelo git, e o `.env.example` só tem textos de exemplo. A
  chave "anon" no site é pública por natureza; quem protege os dados é a RLS.
- **Dependências**: `npm audit` sem nenhuma vulnerabilidade.
- **HTTPS**: forçado (HSTS), via Cloudflare/Render.

## 4. Para você fazer (não dá pelo código)

### 4.1 Cabeçalhos de segurança no Render (recomendado)
Hoje o site não manda CSP nem proteção contra *clickjacking*: outro site poderia embutir o Dado &
Pena num iframe invisível e induzir cliques. A política abaixo foi **testada no build de
produção**: login, todas as abas da mesa, dado 3D, trilha do YouTube tocando, ficha, mapa e
Comunidade, com **zero bloqueios e zero erros**. Com ela, um iframe de outro site foi recusado.

**Render → seu Static Site → Settings → Headers → Add Header**, com *Path* `/*` para cada um:

| Nome | Valor |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' https://www.youtube.com https://s.ytimg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src https://www.youtube.com https://www.youtube-nocookie.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

Se algum dia o site passar a usar outro serviço de fora (outro domínio de imagem, outra API),
ele precisa entrar na política. O sintoma de esquecimento é "Refused to…" no console.

### 4.2 Confirmação de e-mail no cadastro (decisão sua)
Hoje o cadastro não confirma o e-mail (`mailer_autoconfirm` ligado). Isso traz dois riscos:
- alguém pode criar conta com o e-mail de outra pessoa, e o dono verdadeiro fica sem poder se
  cadastrar;
- o nome de usuário vem do e-mail, o que facilita se passar por alguém.

Para ligar: **Supabase → Authentication → Sign In / Providers → Email → Confirm email**. O custo é
que o e-mail embutido do Supabase no plano grátis tem limite baixo de envios por hora; para
muitos cadastros é preciso configurar um SMTP próprio.

## 5. Melhorias opcionais (não são falha de dados)
- **Rolagens calculadas no navegador**: quem sabe usar a API consegue gravar uma rolagem com o
  resultado que quiser (sempre em nome próprio: em nome de outro é barrado). É trapaça de jogo,
  não vazamento. A correção seria rolar no servidor (uma função no banco); é uma mudança média.
- **Código de convite** com 8 caracteres hexadecimais (4 bilhões de combinações) e sem limite de
  tentativas. Adivinhar é inviável na prática, mas dá para aumentar para 12 caracteres.
- Baixo risco:
  - o dono de uma ficha pode passá-la a outra pessoa;
  - quem está logado vê quem curtiu cada publicação;
  - imagens aceitam URL externa (um mestre mal-intencionado veria o IP de quem abre a imagem);
  - o cadastro e a entrada de convidado não têm captcha.

## Arquivos
- `sql/seguranca_auditoria_2026_09.sql` (rodado).
- Este documento.
