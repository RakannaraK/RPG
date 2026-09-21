# Fase 36 — Comunidade

> Última fase do roadmap de paridade com o LICHRPG. Usa o formato portátil da F30 (ficha `.json` por nomes), o export de sistema (B2) e o bestiário (F31).

## O que entra
1. **Compartilhar** ficha, criatura ou sistema: quem publica manda o **arquivo portátil** (o mesmo JSON do export) para uma vitrine pública, com título, descrição e etiquetas.
2. **Galeria de artes:** publicar uma imagem com título e crédito; qualquer pessoa logada curte.
3. **Obter:** um clique importa a publicação para a sua mesa (ficha/criatura entram pelo fluxo da F30; sistema pelo `importar_sistema`).
4. **Moderação:** quem publicou apaga o que é dele; qualquer pessoa logada **denuncia**; publicação denunciada sai da vitrine até alguém decidir. Administrador (marcado no perfil) apaga qualquer coisa.
5. **Página pública com demo sem conta:** uma landing com o que o site faz, a vitrine em modo leitura e um **rolador de dados que funciona sem login** (nada é gravado).

## Banco (`sql/fase36_comunidade.sql`)
- `publicacoes (id, autor_id, tipo 'ficha'|'criatura'|'sistema'|'arte', titulo, descricao, etiquetas TEXT[], conteudo JSONB, imagem_url, curtidas INT, denuncias INT, oculta BOOL, created_at)`.
- `curtidas_publicacao (publicacao_id, usuario_id)` — uma por pessoa; a contagem fica na publicação (mantida por gatilho).
- `denuncias_publicacao (publicacao_id, usuario_id, motivo)` — uma por pessoa; com 3 denúncias a publicação se esconde sozinha.
- `profiles.admin BOOLEAN` — administrador da comunidade.
- Leitura: qualquer pessoa logada vê o que não está oculto; o autor vê o dele sempre. **Anônimo** vê a vitrine pela função `vitrine_publica(limite)` (a segunda e última função liberada ao anônimo, como o overlay da F34).
- Escrita: publicar exige login; apagar é do autor ou do administrador.

## Sub-fases
- **36.1** — SQL + RLS/gatilhos + testes no banco.
- **36.2** — `lib/comunidade.js` puro (validação do que pode ser publicado, contagem, etiquetas, ordenação) + testes.
- **36.3** — página **Comunidade** (logado): publicar, buscar por tipo/etiqueta, curtir, obter, denunciar, apagar.
- **36.4** — página pública `/comunidade` + **demo sem conta** (rolador) na landing.
- **36.5** — aceitação + docs.

## Restrições
1. Sem o SQL: a página avisa que a comunidade não está ativada; nada mais muda. 2. O que viaja é o arquivo portátil — nunca a ficha ao vivo de ninguém, nem dados da mesa. 3. Publicação denunciada 3× sai da vitrine na hora (sem esperar moderação). 4. O demo sem conta não grava nada em lugar nenhum. 5. Sem limite de publicações; só teto de tamanho (arquivo ≤ 1 MB de JSON).

## Como ficou (implementado — 36.1 … 36.5)
- **Arquivos:** `lib/comunidade.js` puro (tipos, etiquetas, validação, filtros, ordenação) + testes e `fase36.acceptance.test.js`, `hooks/useComunidade.js`, `pages/ComunidadePage.jsx` (rota `/comunidade`, abre com e sem login); `sql/fase36_comunidade.sql` (rodado, 19/19 no banco).
- **Publicar:** escolhe o tipo, o arquivo exportado (.json) — o título já vem do arquivo — descrição e etiquetas (limpas, sem repetidas, até 8). Arte é link de imagem com crédito do artista.
- **Vitrine:** busca livre, filtro por tipo, atalhos das etiquetas mais usadas, ordenar por recentes ou curtidas.
- **Obter:** escolhe a mesa e traz: ficha/criatura pelo fluxo da F30 (com aviso do que não casou com o sistema da mesa, e criatura entra privada no bestiário); sistema pela RPC `importar_sistema`.
- **Moderação:** curtida é uma por pessoa (contada por gatilho, ninguém edita na mão); denúncia é uma por pessoa e **3 escondem a publicação na hora**; o autor apaga a dele, o administrador apaga qualquer uma.
- **Sem conta:** a vitrine vem da função `vitrine_publica` (a segunda e última liberada ao anônimo) e há um **rolador de dados de verdade que não grava nada**, com convite para criar conta. A tela de entrada e o painel têm o link.
- **Bug pego no teste de tela:** o cartão mandava a publicação inteira onde a função esperava só o id (curtir/denunciar/apagar) — corrigido.
- **Limites conhecidos:** vitrine mostra as 100 mais recentes (sem paginação ainda); a imagem da arte é um link (sem envio de arquivo por aqui); administrador é marcado direto no banco (`profiles.admin`).

## Teste de aceitação
Publicar uma criatura do bestiário: ela aparece na vitrine com etiquetas; outra pessoa obtém e a criatura entra na mesa dela. Curtir soma 1 e não dá para curtir duas vezes. Denunciar 3 vezes esconde a publicação da vitrine. O autor apaga a dele; quem não é autor não consegue. Sem login, `/comunidade` mostra a vitrine (leitura) e o rolador de dados funciona sem gravar nada.
