# Fase 50 — Bestiário pronto do SRD 5e

> Da lista "talvez depois" da análise de concorrência de 2026-09. Só serve a quem joga D&D 5e (ou
> sistema parecido), mas economiza muito tempo de quem mestra.

## Como ficou
- **Aba Bestiário → "Bestiário SRD 5e"**: 32 criaturas clássicas, do rato gigante (ND 1/8) ao
  jovem dragão vermelho (ND 10).
  - Busca por nome, tipo ou ND ("nd 1/2"), com a lista em ordem de desafio.
  - Clicar mostra o **bloco completo** (CA, PV, atributos com modificador, sentidos, traços e
    ações).
  - **"Adicionar ao bestiário"** cria a criatura **privada** (os jogadores não veem) e abre a
    ficha dela.
- Cada criatura entra pelo **mesmo import de ficha da F30**, no formato portátil. Nada novo no
  banco (sem SQL nesta fase).
  - **Atributos**: a conversão procura no sistema da mesa o nome equivalente. "Força", "FOR",
    "STR" e "Strength" casam todos, então os valores caem no lugar certo.
  - **CA**: vai para o campo de combate chamado "CA", "Classe de Armadura", "Armadura" ou
    "Defesa", se existir.
  - **Ataques** viram itens roláveis: ataque `1d20+bônus`, dano e tipo de dano. O sopro do dragão
    vira só o dano.
  - O que o sistema da mesa não tiver aparece antes, na prévia ("o sistema desta mesa não tem…"),
    e continua no **texto completo** nos traços. Nada se perde.
  - Espécie e ameaça ("ND 1/2") são preenchidas.
- **Licença**: o SRD 5.1 é CC-BY 4.0. A atribuição aparece na tela do bestiário, nas notas de
  cada criatura importada e no topo do arquivo de dados. As mudanças (tradução, pés para metros,
  resumos) estão declaradas. Só entrou criatura que está no SRD.

## Qualidade dos dados
Transcrevi as fichas à mão. Por isso os testes conferem a consistência **pelas regras do próprio
SRD**, para pegar erro de digitação:
- os PV são a média dos dados de vida (por exemplo, 17d10+85 dá 178);
- o bônus por dado é o modificador de Constituição;
- o bônus de ataque é a proficiência (pelo ND) + Força ou Destreza. A única exceção é a mordida
  do carniçal, +2, que é assim no SRD.

As 32 criaturas passam nas três regras.

## Código
- `lib/srd5eDados.js`: os dados. Ficam num pedaço separado de **5,7 KB (gzip)**, que só desce
  quando alguém abre o bestiário SRD.
- `lib/srd5e.js` (puro): criatura → arquivo portátil, bloco de texto, busca.
- 7 testes: as regras acima, o import com sistema "FOR/DES…" sem aviso de atributo, os itens
  roláveis, o sistema sem esses atributos (importa com avisos), e a busca.
- `components/bestiario/BestiarioSrd.jsx`.

## Conferido no navegador
- O mestre abriu a lista (32 criaturas), buscou "orc", viu o bloco e os 6 avisos (a mesa de teste
  não tem sistema), e adicionou.
- A ficha do Orc nasceu privada, com espécie "Humanoide", ameaça "ND 1/2", 15 PV e os dois ataques.
- **O ataque rolou no feed** ("Machado grande — Ataque", 1d20+5).
- No celular (375 px), lista e ficha alternam, sem rolagem lateral.

## Limites conhecidos
- 32 criaturas, não o SRD inteiro (que tem centenas). Magias de criaturas conjuradoras (mago,
  lich) ficaram de fora por ora.
- Salvaguardas e perícias vão no texto, não nos campos da ficha (cada sistema monta as perícias
  do seu jeito).
