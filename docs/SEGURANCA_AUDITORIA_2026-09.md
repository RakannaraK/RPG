# Auditoria de segurança — 2026-09-26

Foco pedido: evitar problemas como SQL injection. A auditoria cobriu o banco (funções, RLS,
permissões), o código do site (injeção e XSS), segredos, cabeçalhos HTTP e dependências. Tudo
foi testado de verdade (no banco, dentro de transações desfeitas, e pela API com uma conta
normal), não só lido.

## Resultado em uma linha
**SQL injection: nenhum caminho encontrado.** Achei **uma falha grave** de outro tipo: qualquer
pessoa virava administradora. Ela foi **corrigida e testada**. Ficam recomendações que dependem de
você (cabeçalhos no Render, confirmação de e-mail, captcha). As melhorias opcionais foram feitas (seção 4).

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

## 4. Feito depois (2026-09-30) — item 5 inteiro + preparo do e-mail e do captcha
SQL em `sql/seguranca_melhorias_2026_09.sql` (rodado). **22/22 checagens** em transação desfeita,
mais testes no navegador com a política de segurança final.

- **Rolagens sorteadas no servidor.** Atributos, perícias, ataques, dano, macros, iniciativa e o
  rolador da mesa agora chamam `rolar_notacao`.
  - O banco sorteia, aplica crítico e percentual e grava a rolagem com o selo `verificada`.
  - O feed mostra **"verificada"** ao lado da notação.
  - O site não consegue pôr o selo sozinho (há um gatilho para isso), então quem forjar uma
    rolagem pela API fica **sem o selo**.
  - Limites: até 200 dados por grupo e 500 por rolagem.
  - Testado: a distribuição de 3.000 rolagens de 1d6 ficou honesta.
  - Continuam sorteados no navegador, sem selo: os modos especiais (sucessos, rolar abaixo,
    faixas), a rerolagem, os pools de dados, a cura e o descanso, as tabelas do escudo e os
    efeitos de turno.
- **Convite**:
  - o código novo tem **12 caracteres** aleatórios (os antigos, de 8, continuam valendo);
  - com **10 códigos errados em 15 minutos**, a pessoa precisa esperar;
  - a caixa "entrar com código" agora aceita o link inteiro (antes cortava em 8 caracteres).
- **Passar ficha para outra pessoa**: só quem gere a mesa.
- **Curtidas**: cada um vê só as próprias. O total de cada publicação continua certo.
- **Imagens de fora bloqueadas** pela CSP (`img-src` só do site e do Supabase). O banco não tinha
  nenhuma imagem de fora, então nada sumiu. Testado: uma imagem de outro endereço foi barrada.
- **Confirmação de e-mail, lado do site pronto**:
  - o link do e-mail volta para o site;
  - o cadastro avisa "enviamos um link para…";
  - o login com e-mail não confirmado explica o motivo e oferece **reenviar o e-mail**;
  - os erros de login saem em português.
- **Captcha (Cloudflare Turnstile), lado do site pronto**: aparece no login, no cadastro e na
  entrada de convidado **só se** a chave `VITE_TURNSTILE_SITE_KEY` existir. Testado com a chave de
  teste da Cloudflare, sob a CSP final: o botão só libera depois da verificação.

## 5. Para você fazer (painéis)

### 5.1 Cabeçalhos de segurança no Render
**Render → Static Site → Settings → Headers**, com *Path* `/*`:

| Nome | Valor |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' https://www.youtube.com https://s.ytimg.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co; media-src 'self' blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://challenges.cloudflare.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

Se algum dia o site passar a usar outro serviço de fora, ele precisa entrar na política. O
sintoma de esquecimento é "Refused to…" no console.

### 5.2 Confirmação de e-mail
1. **Authentication → URL Configuration**:
   - *Site URL*: `https://rpgcustomizado.onrender.com`;
   - em *Redirect URLs*, adicionar `https://rpgcustomizado.onrender.com/**` e
     `http://localhost:5173/**`.
2. **SMTP próprio (fortemente recomendado)**: o e-mail embutido do Supabase manda pouquíssimos
   e-mails por hora, então só algumas pessoas conseguiriam se cadastrar por hora.
   - Crie uma conta grátis num serviço de envio (Resend ou Brevo, por exemplo).
   - Preencha em **Authentication → Emails → SMTP Settings**.
3. (Opcional) Traduza o e-mail em **Authentication → Emails → Templates → Confirm signup**.
4. **Authentication → Sign In / Providers → Email → Confirm email** → ligar → Save.

Contas que já existem não são afetadas.

### 5.3 Captcha — nesta ordem, senão ninguém consegue entrar
1. **Cloudflare → Turnstile → Add widget**, com o domínio `rpgcustomizado.onrender.com`. Guarde a
   *Site Key* e a *Secret Key*.
2. **Render → Environment**: `VITE_TURNSTILE_SITE_KEY` = *Site Key*. Salve e espere o deploy
   terminar; o captcha aparece no login.
3. Só então: **Supabase → Authentication → Attack Protection → Enable Captcha protection**
   (provedor *Cloudflare Turnstile*) com a *Secret Key* → Save.

## Arquivos
- `sql/seguranca_auditoria_2026_09.sql` e `sql/seguranca_melhorias_2026_09.sql` (rodados).
- Este documento.
