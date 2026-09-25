# Fases 41 + 42 — Enciclopédia da mesa e revelação campo a campo (com documentos)

> Da análise de concorrência de 2026-09: World Anvil / LegendKeeper / Kanka têm wiki de campanha;
> revelar **campo a campo, por jogador** é raro até neles. As duas fases dividem o mesmo SQL,
> então saíram juntas.

## Como ficou
- **Banco** (`sql/fase41_enciclopedia.sql`, rodado):
  - `verbetes`: tipo (NPC, local, facção, divindade, item, história, documento, outro), nome,
    resumo, texto, **notas do mestre** (`segredo`), imagem, etiquetas e campos próprios do tipo
    (`campos` jsonb: aparência, "o que quer", perigos…).
  - `revelacoes_verbete`: uma linha por **campo revelado a uma pessoa** (ou à mesa toda, com
    `usuario_id` nulo).
  - O jogador **nunca lê a tabela** `verbetes`: a RLS é por linha, não por coluna, e ele levaria
    junto o texto ainda secreto. Ele lê por `verbetes_visiveis(mesa)`, que devolve só os campos
    revelados; as notas do mestre não existem no retorno.
  - `entregar_verbete(...)` revela e avisa pelo sininho numa transação só. O aviso só traz o nome
    se o nome foi revelado.
  - **30/30 checagens no banco**, em transação desfeita: jogador, espectador, estranho, sem login
    e anônimo.
- **`lib/enciclopedia.js`** (puro, 9 testes):
  - campos por tipo;
  - menções `[[Nome]]`, que viram link sem ligar para acento ou maiúscula;
  - "citado em";
  - busca sem acento em tudo que o leitor vê;
  - o que dá para revelar (só o que tem conteúdo; o segredo nunca);
  - "quem sabe o quê";
  - estado Oculto / Parcial / Revelado.
- **Aba "Enciclopédia"** na mesa (`PainelEnciclopedia.jsx`). Aceita `?aba=Enciclopédia` na URL,
  e é por aí que o aviso do sininho abre direto nela.
  - **Mestre**:
    - cria e edita os verbetes;
    - vê as notas secretas num quadro "Só você vê";
    - usa **Revelar…** (ou **Entregar…**, se for documento): para a mesa toda ou só alguns, com
      caixinhas de cada campo, e escolhe se avisa pelo sininho;
    - tem a matriz **Quem sabe o quê** (campo × jogador): clicar numa marca **esconde de novo** e
      clicar num vazio revela, sem aviso.
  - **Jogador**:
    - vê só o que recebeu;
    - um verbete com nome ainda secreto aparece como "NPC desconhecido";
    - uma menção a algo que ele não conhece fica texto comum, não link;
    - quando o mestre revela algo, a tela atualiza sozinha.
- Conferido no navegador com as contas de teste:
  - mestre criou 3 verbetes e revelou nome, resumo e aparência só ao jogador;
  - o documento foi entregue à mesa toda;
  - o jogador recebeu os dois avisos e viu exatamente esses campos;
  - uma revelação feita de fora apareceu na tela do jogador sem recarregar;
  - no celular (375 px): lista e verbete alternam com "← Voltar à lista", sem rolagem lateral.

## Limites conhecidos
- O jogador recebe em tempo real as **revelações**. Um texto **editado** depois de revelado só
  aparece para ele ao reabrir a aba, porque a RLS não deixa o tempo real de `verbetes` chegar a ele.
- A imagem vai para o bucket público `fichas-imagens` com nome aleatório. Antes da revelação,
  ninguém tem a URL, mas quem já recebeu a imagem continua com o link mesmo que você esconda de novo.
- Esconder de novo tira o campo da tela; não apaga o que o jogador já leu.
