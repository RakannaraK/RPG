/**
 * Fase 50 — criaturas do SRD 5.1, traduzidas e adaptadas (distâncias em metros).
 *
 * Contém material do System Reference Document 5.1 ("SRD 5.1") da Wizards of
 * the Coast LLC, disponível em https://dnd.wizards.com/resources/systems-reference-document,
 * licenciado pela Creative Commons Attribution 4.0 International
 * (https://creativecommons.org/licenses/by/4.0/legalcode). Mudanças: tradução
 * para o português, conversão de pés para metros e resumo de alguns traços.
 *
 * Só criaturas do SRD (nada de "product identity" como observador ou devorador de mentes).
 * atr = [FOR, DES, CON, INT, SAB, CAR]. Ação com `dano` vira item da ficha (rolável).
 */
export const CRIATURAS_SRD = [
  {
    id: 'goblin', nome: 'Goblin', tamanho: 'Pequeno', tipo: 'Humanoide (goblinoide)', especie: 'Humanoide', tendencia: 'neutro e mau',
    nd: '1/4', ca: 15, caNota: 'armadura de couro, escudo', pv: 7, pvDados: '2d6', desloc: '9 m', atr: [8, 14, 10, 10, 8, 8],
    extras: 'Perícias Furtividade +6. Sentidos visão no escuro 18 m, Percepção passiva 9. Idiomas Comum, Goblin.',
    tracos: ['Fuga Ágil. Pode usar a ação Desengajar ou Esconder como ação bônus em cada um de seus turnos.'],
    acoes: [
      { nome: 'Cimitarra', ataque: 4, alcance: 'corpo a corpo, 1,5 m', dano: '1d6+2', tipo: 'cortante' },
      { nome: 'Arco curto', ataque: 4, alcance: 'à distância, 24/96 m', dano: '1d6+2', tipo: 'perfurante' },
    ],
  },
  {
    id: 'kobold', nome: 'Kobold', tamanho: 'Pequeno', tipo: 'Humanoide (kobold)', especie: 'Humanoide', tendencia: 'leal e mau',
    nd: '1/8', ca: 12, pv: 5, pvDados: '2d6-2', desloc: '9 m', atr: [7, 15, 9, 8, 7, 8],
    extras: 'Sentidos visão no escuro 18 m, Percepção passiva 8. Idiomas Comum, Dracônico.',
    tracos: [
      'Sensibilidade à Luz Solar. Sob luz solar, tem desvantagem em ataques e em testes de Sabedoria (Percepção) que dependam da visão.',
      'Táticas de Grupo. Tem vantagem no ataque contra uma criatura se um aliado não incapacitado estiver a até 1,5 m dela.',
    ],
    acoes: [
      { nome: 'Adaga', ataque: 4, alcance: 'corpo a corpo, 1,5 m', dano: '1d4+2', tipo: 'perfurante' },
      { nome: 'Funda', ataque: 4, alcance: 'à distância, 9/36 m', dano: '1d4+2', tipo: 'concussão' },
    ],
  },
  {
    id: 'orc', nome: 'Orc', tamanho: 'Médio', tipo: 'Humanoide (orc)', especie: 'Humanoide', tendencia: 'caótico e mau',
    nd: '1/2', ca: 13, caNota: 'gibão de peles', pv: 15, pvDados: '2d8+6', desloc: '9 m', atr: [16, 12, 16, 7, 11, 10],
    extras: 'Perícias Intimidação +2. Sentidos visão no escuro 18 m, Percepção passiva 10. Idiomas Comum, Orc.',
    tracos: ['Agressivo. Como ação bônus, pode se mover até seu deslocamento em direção a uma criatura hostil que consiga ver.'],
    acoes: [
      { nome: 'Machado grande', ataque: 5, alcance: 'corpo a corpo, 1,5 m', dano: '1d12+3', tipo: 'cortante' },
      { nome: 'Azagaia', ataque: 5, alcance: 'corpo a corpo, 1,5 m, ou à distância, 9/36 m', dano: '1d6+3', tipo: 'perfurante' },
    ],
  },
  {
    id: 'esqueleto', nome: 'Esqueleto', tamanho: 'Médio', tipo: 'Morto-vivo', especie: 'Morto-vivo', tendencia: 'leal e mau',
    nd: '1/4', ca: 13, caNota: 'restos de armadura', pv: 13, pvDados: '2d8+4', desloc: '9 m', atr: [10, 14, 15, 6, 8, 5],
    extras: 'Vulnerável a concussão. Imune a veneno; não fica envenenado nem exausto. Sentidos visão no escuro 18 m, Percepção passiva 9. Idiomas entende os que conhecia em vida, mas não fala.',
    tracos: [],
    acoes: [
      { nome: 'Espada curta', ataque: 4, alcance: 'corpo a corpo, 1,5 m', dano: '1d6+2', tipo: 'perfurante' },
      { nome: 'Arco curto', ataque: 4, alcance: 'à distância, 24/96 m', dano: '1d6+2', tipo: 'perfurante' },
    ],
  },
  {
    id: 'zumbi', nome: 'Zumbi', tamanho: 'Médio', tipo: 'Morto-vivo', especie: 'Morto-vivo', tendencia: 'neutro e mau',
    nd: '1/4', ca: 8, pv: 22, pvDados: '3d8+9', desloc: '6 m', atr: [13, 6, 16, 3, 6, 5],
    extras: 'Resistência Sab +0. Imune a veneno; não fica envenenado. Sentidos visão no escuro 18 m, Percepção passiva 8. Idiomas entende os que conhecia em vida, mas não fala.',
    tracos: ['Fortitude de Morto-Vivo. Se o dano o levaria a 0 PV, faz um teste de Constituição com CD 5 + o dano sofrido (exceto dano radiante ou de acerto crítico); se passar, fica com 1 PV.'],
    acoes: [{ nome: 'Pancada', ataque: 3, alcance: 'corpo a corpo, 1,5 m', dano: '1d6+1', tipo: 'concussão' }],
  },
  {
    id: 'lobo', nome: 'Lobo', tamanho: 'Médio', tipo: 'Fera', especie: 'Fera', tendencia: 'sem tendência',
    nd: '1/4', ca: 13, caNota: 'armadura natural', pv: 11, pvDados: '2d8+2', desloc: '12 m', atr: [12, 15, 12, 3, 12, 6],
    extras: 'Perícias Furtividade +4, Percepção +3. Sentidos Percepção passiva 13.',
    tracos: [
      'Audição e Olfato Aguçados. Vantagem em testes de Sabedoria (Percepção) que dependam de audição ou olfato.',
      'Táticas de Grupo. Vantagem no ataque se um aliado não incapacitado estiver a até 1,5 m do alvo.',
    ],
    acoes: [{ nome: 'Mordida', ataque: 4, alcance: 'corpo a corpo, 1,5 m', dano: '2d4+2', tipo: 'perfurante', obs: 'Se o alvo for uma criatura, passa num teste de Força CD 11 ou cai derrubado.' }],
  },
  {
    id: 'lobo-atroz', nome: 'Lobo atroz', tamanho: 'Grande', tipo: 'Fera', especie: 'Fera', tendencia: 'sem tendência',
    nd: '1', ca: 14, caNota: 'armadura natural', pv: 37, pvDados: '5d10+10', desloc: '15 m', atr: [17, 15, 15, 3, 12, 7],
    extras: 'Perícias Furtividade +4, Percepção +3. Sentidos Percepção passiva 13.',
    tracos: [
      'Audição e Olfato Aguçados. Vantagem em testes de Sabedoria (Percepção) que dependam de audição ou olfato.',
      'Táticas de Grupo. Vantagem no ataque se um aliado não incapacitado estiver a até 1,5 m do alvo.',
    ],
    acoes: [{ nome: 'Mordida', ataque: 5, alcance: 'corpo a corpo, 1,5 m', dano: '2d6+3', tipo: 'perfurante', obs: 'Se o alvo for uma criatura, passa num teste de Força CD 13 ou cai derrubado.' }],
  },
  {
    id: 'rato-gigante', nome: 'Rato gigante', tamanho: 'Pequeno', tipo: 'Fera', especie: 'Fera', tendencia: 'sem tendência',
    nd: '1/8', ca: 12, pv: 7, pvDados: '2d6', desloc: '9 m', atr: [7, 15, 11, 2, 10, 4],
    extras: 'Sentidos visão no escuro 18 m, Percepção passiva 10.',
    tracos: [
      'Olfato Aguçado. Vantagem em testes de Sabedoria (Percepção) que dependam do olfato.',
      'Táticas de Grupo. Vantagem no ataque se um aliado não incapacitado estiver a até 1,5 m do alvo.',
    ],
    acoes: [{ nome: 'Mordida', ataque: 4, alcance: 'corpo a corpo, 1,5 m', dano: '1d4+2', tipo: 'perfurante' }],
  },
  {
    id: 'estirge', nome: 'Estirge', tamanho: 'Miúdo', tipo: 'Fera', especie: 'Fera', tendencia: 'sem tendência',
    nd: '1/8', ca: 14, caNota: 'armadura natural', pv: 2, pvDados: '1d4', desloc: '3 m, voo 12 m', atr: [4, 16, 11, 2, 8, 6],
    extras: 'Sentidos visão no escuro 18 m, Percepção passiva 9.',
    tracos: [],
    acoes: [{ nome: 'Drenar sangue', ataque: 5, alcance: 'corpo a corpo, 1,5 m', dano: '1d4+3', tipo: 'perfurante', obs: 'Gruda no alvo. No início de cada turno da estirge, o alvo perde 1d4+3 PV, até ela ter drenado 10 PV ou o alvo morrer.' }],
  },
  {
    id: 'bandido', nome: 'Bandido', tamanho: 'Médio', tipo: 'Humanoide (qualquer raça)', especie: 'Humanoide', tendencia: 'qualquer tendência não leal',
    nd: '1/8', ca: 12, caNota: 'armadura de couro', pv: 11, pvDados: '2d8+2', desloc: '9 m', atr: [11, 12, 12, 10, 10, 10],
    extras: 'Sentidos Percepção passiva 10. Idiomas qualquer um (normalmente Comum).',
    tracos: [],
    acoes: [
      { nome: 'Cimitarra', ataque: 3, alcance: 'corpo a corpo, 1,5 m', dano: '1d6+1', tipo: 'cortante' },
      { nome: 'Besta leve', ataque: 3, alcance: 'à distância, 24/96 m', dano: '1d8+1', tipo: 'perfurante' },
    ],
  },
  {
    id: 'guarda', nome: 'Guarda', tamanho: 'Médio', tipo: 'Humanoide (qualquer raça)', especie: 'Humanoide', tendencia: 'qualquer tendência',
    nd: '1/8', ca: 16, caNota: 'camisão de malha, escudo', pv: 11, pvDados: '2d8+2', desloc: '9 m', atr: [13, 12, 12, 10, 11, 10],
    extras: 'Perícias Percepção +2. Sentidos Percepção passiva 12. Idiomas qualquer um (normalmente Comum).',
    tracos: [],
    acoes: [{ nome: 'Lança', ataque: 3, alcance: 'corpo a corpo, 1,5 m, ou à distância, 6/18 m', dano: '1d6+1', tipo: 'perfurante', obs: 'Com as duas mãos em corpo a corpo: 1d8+1.' }],
  },
  {
    id: 'cultista', nome: 'Cultista', tamanho: 'Médio', tipo: 'Humanoide (qualquer raça)', especie: 'Humanoide', tendencia: 'qualquer tendência não boa',
    nd: '1/8', ca: 12, caNota: 'armadura de couro', pv: 9, pvDados: '2d8', desloc: '9 m', atr: [11, 12, 10, 10, 11, 10],
    extras: 'Perícias Enganação +2, Religião +2. Sentidos Percepção passiva 10. Idiomas qualquer um (normalmente Comum).',
    tracos: ['Devoção Sombria. Vantagem em testes de resistência contra ficar enfeitiçado ou amedrontado.'],
    acoes: [{ nome: 'Cimitarra', ataque: 3, alcance: 'corpo a corpo, 1,5 m', dano: '1d6+1', tipo: 'cortante' }],
  },
  {
    id: 'hobgoblin', nome: 'Hobgoblin', tamanho: 'Médio', tipo: 'Humanoide (goblinoide)', especie: 'Humanoide', tendencia: 'leal e mau',
    nd: '1/2', ca: 18, caNota: 'cota de malha, escudo', pv: 11, pvDados: '2d8+2', desloc: '9 m', atr: [13, 12, 12, 10, 10, 9],
    extras: 'Sentidos visão no escuro 18 m, Percepção passiva 10. Idiomas Comum, Goblin.',
    tracos: ['Vantagem Marcial. Uma vez por turno, causa 2d6 de dano extra a uma criatura que acertar, se um aliado não incapacitado estiver a até 1,5 m dela.'],
    acoes: [
      { nome: 'Espada longa', ataque: 3, alcance: 'corpo a corpo, 1,5 m', dano: '1d8+1', tipo: 'cortante', obs: 'Com as duas mãos: 1d10+1.' },
      { nome: 'Arco longo', ataque: 3, alcance: 'à distância, 45/180 m', dano: '1d8+1', tipo: 'perfurante' },
    ],
  },
  {
    id: 'gnoll', nome: 'Gnoll', tamanho: 'Médio', tipo: 'Humanoide (gnoll)', especie: 'Humanoide', tendencia: 'caótico e mau',
    nd: '1/2', ca: 15, caNota: 'gibão de peles, escudo', pv: 22, pvDados: '5d8', desloc: '9 m', atr: [14, 12, 11, 6, 10, 7],
    extras: 'Sentidos visão no escuro 18 m, Percepção passiva 10. Idiomas Gnoll.',
    tracos: ['Fúria Sanguinária. Quando reduz uma criatura a 0 PV com um ataque corpo a corpo no seu turno, pode usar a ação bônus para se mover até metade do deslocamento e fazer um ataque de mordida.'],
    acoes: [
      { nome: 'Mordida', ataque: 4, alcance: 'corpo a corpo, 1,5 m', dano: '1d4+2', tipo: 'perfurante' },
      { nome: 'Lança', ataque: 4, alcance: 'corpo a corpo, 1,5 m, ou à distância, 6/18 m', dano: '1d6+2', tipo: 'perfurante', obs: 'Com as duas mãos em corpo a corpo: 1d8+2.' },
      { nome: 'Arco longo', ataque: 3, alcance: 'à distância, 45/180 m', dano: '1d8+1', tipo: 'perfurante' },
    ],
  },
  {
    id: 'bugbear', nome: 'Bugbear', tamanho: 'Médio', tipo: 'Humanoide (goblinoide)', especie: 'Humanoide', tendencia: 'caótico e mau',
    nd: '1', ca: 16, caNota: 'gibão de peles, escudo', pv: 27, pvDados: '5d8+5', desloc: '9 m', atr: [15, 14, 13, 8, 11, 9],
    extras: 'Perícias Furtividade +6, Sobrevivência +2. Sentidos visão no escuro 18 m, Percepção passiva 10. Idiomas Comum, Goblin.',
    tracos: [
      'Bruto. Uma arma corpo a corpo causa um dado extra de dano quando ele acerta (já incluído nos ataques).',
      'Ataque Surpresa. Se surpreender uma criatura e acertá-la na primeira rodada, causa 2d6 de dano extra.',
    ],
    acoes: [
      { nome: 'Maça-estrela', ataque: 4, alcance: 'corpo a corpo, 1,5 m', dano: '2d8+2', tipo: 'perfurante' },
      { nome: 'Azagaia', ataque: 4, alcance: 'corpo a corpo, 1,5 m, ou à distância, 9/36 m', dano: '2d6+2', tipo: 'perfurante', obs: 'À distância: 1d6+2.' },
    ],
  },
  {
    id: 'carnical', nome: 'Carniçal', tamanho: 'Médio', tipo: 'Morto-vivo', especie: 'Morto-vivo', tendencia: 'caótico e mau',
    nd: '1', ca: 12, pv: 22, pvDados: '5d8', desloc: '9 m', atr: [13, 15, 10, 7, 10, 6],
    extras: 'Imune a veneno; não fica enfeitiçado, envenenado nem exausto. Sentidos visão no escuro 18 m, Percepção passiva 10. Idiomas Comum.',
    tracos: [],
    acoes: [
      { nome: 'Mordida', ataque: 2, alcance: 'corpo a corpo, 1,5 m', dano: '2d6+2', tipo: 'perfurante' },
      { nome: 'Garras', ataque: 4, alcance: 'corpo a corpo, 1,5 m', dano: '2d4+2', tipo: 'cortante', obs: 'Se o alvo não for elfo nem morto-vivo, passa num teste de Constituição CD 10 ou fica paralisado por 1 minuto (repete o teste no fim de cada turno).' },
    ],
  },
  {
    id: 'harpia', nome: 'Harpia', tamanho: 'Médio', tipo: 'Monstruosidade', especie: 'Monstruosidade', tendencia: 'caótico e mau',
    nd: '1', ca: 11, pv: 38, pvDados: '7d8+7', desloc: '6 m, voo 12 m', atr: [12, 13, 12, 7, 10, 13],
    extras: 'Sentidos Percepção passiva 10. Idiomas Comum.',
    tracos: [],
    acoes: [
      { nome: 'Multiataque', texto: 'Faz dois ataques: um com as garras e um com a clava.' },
      { nome: 'Garras', ataque: 3, alcance: 'corpo a corpo, 1,5 m', dano: '2d4+1', tipo: 'cortante' },
      { nome: 'Clava', ataque: 3, alcance: 'corpo a corpo, 1,5 m', dano: '1d4+1', tipo: 'concussão' },
      { nome: 'Canção Sedutora', texto: 'Humanoides a até 90 m que ouçam fazem um teste de Sabedoria CD 11 ou ficam enfeitiçados até a canção acabar (a harpia mantém como concentração). Enfeitiçado, o alvo fica incapacitado e caminha em direção à harpia.' },
    ],
  },
  {
    id: 'urso-pardo', nome: 'Urso-pardo', tamanho: 'Grande', tipo: 'Fera', especie: 'Fera', tendencia: 'sem tendência',
    nd: '1', ca: 11, caNota: 'armadura natural', pv: 34, pvDados: '4d10+12', desloc: '12 m, escalada 9 m', atr: [19, 10, 16, 2, 13, 7],
    extras: 'Perícias Percepção +3. Sentidos Percepção passiva 13.',
    tracos: ['Olfato Aguçado. Vantagem em testes de Sabedoria (Percepção) que dependam do olfato.'],
    acoes: [
      { nome: 'Multiataque', texto: 'Faz dois ataques: um de mordida e um de garras.' },
      { nome: 'Mordida', ataque: 6, alcance: 'corpo a corpo, 1,5 m', dano: '1d8+4', tipo: 'perfurante' },
      { nome: 'Garras', ataque: 6, alcance: 'corpo a corpo, 1,5 m', dano: '2d6+4', tipo: 'cortante' },
    ],
  },
  {
    id: 'aranha-gigante', nome: 'Aranha gigante', tamanho: 'Grande', tipo: 'Fera', especie: 'Fera', tendencia: 'sem tendência',
    nd: '1', ca: 14, caNota: 'armadura natural', pv: 26, pvDados: '4d10+4', desloc: '9 m, escalada 9 m', atr: [14, 16, 12, 2, 11, 4],
    extras: 'Perícias Furtividade +7. Sentidos percepção às cegas 3 m, visão no escuro 18 m, Percepção passiva 10.',
    tracos: [
      'Escalada Aracnídea. Escala superfícies difíceis, inclusive de cabeça para baixo no teto, sem teste.',
      'Sentido da Teia. Em contato com uma teia, sabe onde está qualquer outra criatura em contato com a mesma teia.',
      'Andar na Teia. Ignora as restrições de movimento causadas por teias.',
    ],
    acoes: [
      { nome: 'Mordida', ataque: 5, alcance: 'corpo a corpo, 1,5 m', dano: '1d8+3', tipo: 'perfurante', obs: 'O alvo faz um teste de Constituição CD 11: sofre 2d8 de veneno se falhar, ou metade se passar.' },
      { nome: 'Teia (recarga 5–6)', texto: 'Ataque à distância +5, 9/18 m, uma criatura: fica impedida pela teia. Força CD 12 para escapar; a teia tem CA 10 e 5 PV, e é vulnerável a fogo.' },
    ],
  },
  {
    id: 'ogro', nome: 'Ogro', tamanho: 'Grande', tipo: 'Gigante', especie: 'Gigante', tendencia: 'caótico e mau',
    nd: '2', ca: 11, caNota: 'gibão de peles', pv: 59, pvDados: '7d10+21', desloc: '12 m', atr: [19, 8, 16, 5, 7, 7],
    extras: 'Sentidos visão no escuro 18 m, Percepção passiva 8. Idiomas Comum, Gigante.',
    tracos: [],
    acoes: [
      { nome: 'Clava grande', ataque: 6, alcance: 'corpo a corpo, 1,5 m', dano: '2d8+4', tipo: 'concussão' },
      { nome: 'Azagaia', ataque: 6, alcance: 'corpo a corpo, 1,5 m, ou à distância, 9/36 m', dano: '2d6+4', tipo: 'perfurante' },
    ],
  },
  {
    id: 'capitao-bandido', nome: 'Capitão bandido', tamanho: 'Médio', tipo: 'Humanoide (qualquer raça)', especie: 'Humanoide', tendencia: 'qualquer tendência não leal',
    nd: '2', ca: 15, caNota: 'couro batido', pv: 65, pvDados: '10d8+20', desloc: '9 m', atr: [15, 16, 14, 14, 11, 14],
    extras: 'Resistências For +4, Des +5, Sab +2. Perícias Atletismo +4, Enganação +4. Sentidos Percepção passiva 10. Idiomas quaisquer dois.',
    tracos: [],
    acoes: [
      { nome: 'Multiataque', texto: 'Três ataques corpo a corpo (dois de cimitarra e um de adaga), ou dois ataques à distância com adagas.' },
      { nome: 'Cimitarra', ataque: 5, alcance: 'corpo a corpo, 1,5 m', dano: '1d6+3', tipo: 'cortante' },
      { nome: 'Adaga', ataque: 5, alcance: 'corpo a corpo, 1,5 m, ou à distância, 6/18 m', dano: '1d4+3', tipo: 'perfurante' },
      { nome: 'Aparar (reação)', texto: 'Soma 2 à CA contra um ataque corpo a corpo que o acertaria. Precisa ver o atacante e empunhar uma arma corpo a corpo.' },
    ],
  },
  {
    id: 'mimico', nome: 'Mímico', tamanho: 'Médio', tipo: 'Monstruosidade (metamorfo)', especie: 'Monstruosidade', tendencia: 'neutro',
    nd: '2', ca: 12, caNota: 'armadura natural', pv: 58, pvDados: '9d8+18', desloc: '4,5 m', atr: [17, 12, 15, 5, 13, 8],
    extras: 'Perícias Furtividade +5. Imune a ácido; não fica derrubado. Sentidos visão no escuro 18 m, Percepção passiva 11.',
    tracos: [
      'Metamorfo. Pode usar a ação para virar um objeto ou voltar à forma amorfa verdadeira.',
      'Adesivo (só em forma de objeto). Gruda em quem o tocar; a criatura grudada fica agarrada (CD 13 para escapar, com desvantagem).',
      'Aparência Falsa. Parado, em forma de objeto, é indistinguível de um objeto comum.',
      'Agarrador. Vantagem em ataques contra quem estiver agarrado por ele.',
    ],
    acoes: [
      { nome: 'Pseudópode', ataque: 5, alcance: 'corpo a corpo, 1,5 m', dano: '1d8+3', tipo: 'concussão', obs: 'Em forma de objeto, o alvo fica grudado (ver Adesivo).' },
      { nome: 'Mordida', ataque: 5, alcance: 'corpo a corpo, 1,5 m', dano: '1d8+3+1d8', tipo: 'perfurante', obs: 'Inclui 1d8 de dano ácido.' },
    ],
  },
  {
    id: 'cubo-gelatinoso', nome: 'Cubo gelatinoso', tamanho: 'Grande', tipo: 'Limo', especie: 'Limo', tendencia: 'sem tendência',
    nd: '2', ca: 6, pv: 84, pvDados: '8d10+40', desloc: '4,5 m', atr: [14, 3, 20, 1, 6, 1],
    extras: 'Não fica amedrontado, cego, derrubado, enfeitiçado, ensurdecido nem exausto. Sentidos percepção às cegas 18 m (cego além disso), Percepção passiva 8.',
    tracos: [
      'Cubo de Limo. Ocupa todo o seu espaço; quem entra nele é engolfado. Engolfado, não respira, fica impedido e sofre 6d6 de ácido no início de cada turno do cubo.',
      'Transparente. Parado, só é notado com Sabedoria (Percepção) CD 15.',
    ],
    acoes: [
      { nome: 'Pseudópode', ataque: 4, alcance: 'corpo a corpo, 1,5 m', dano: '3d6', tipo: 'ácido' },
      { nome: 'Engolfar', dano: '3d6', tipo: 'ácido', obs: 'Move-se até o deslocamento; cada criatura no caminho faz Destreza CD 12. Se falhar, é engolfada e sofre 3d6 de ácido.' },
    ],
  },
  {
    id: 'urso-coruja', nome: 'Urso-coruja', tamanho: 'Grande', tipo: 'Monstruosidade', especie: 'Monstruosidade', tendencia: 'sem tendência',
    nd: '3', ca: 13, caNota: 'armadura natural', pv: 59, pvDados: '7d10+21', desloc: '12 m', atr: [20, 12, 17, 3, 12, 7],
    extras: 'Perícias Percepção +3. Sentidos visão no escuro 18 m, Percepção passiva 13.',
    tracos: ['Visão e Olfato Aguçados. Vantagem em testes de Sabedoria (Percepção) que dependam da visão ou do olfato.'],
    acoes: [
      { nome: 'Multiataque', texto: 'Faz dois ataques: um com o bico e um com as garras.' },
      { nome: 'Bico', ataque: 7, alcance: 'corpo a corpo, 1,5 m', dano: '1d10+5', tipo: 'perfurante' },
      { nome: 'Garras', ataque: 7, alcance: 'corpo a corpo, 1,5 m', dano: '2d8+5', tipo: 'cortante' },
    ],
  },
  {
    id: 'minotauro', nome: 'Minotauro', tamanho: 'Grande', tipo: 'Monstruosidade', especie: 'Monstruosidade', tendencia: 'caótico e mau',
    nd: '3', ca: 14, caNota: 'armadura natural', pv: 76, pvDados: '9d10+27', desloc: '12 m', atr: [18, 11, 16, 6, 16, 9],
    extras: 'Perícias Percepção +7. Sentidos visão no escuro 18 m, Percepção passiva 17. Idiomas Abissal.',
    tracos: [
      'Investida. Se andar ao menos 3 m em linha reta até o alvo e acertar a chifrada no mesmo turno, causa 2d8 perfurante extra; o alvo faz Força CD 14 ou é empurrado 3 m e cai derrubado.',
      'Memória do Labirinto. Lembra perfeitamente de qualquer caminho que já percorreu.',
      'Imprudente. No início do turno, pode ganhar vantagem em ataques corpo a corpo; até o próximo turno, ataques contra ele também têm vantagem.',
    ],
    acoes: [
      { nome: 'Machado grande', ataque: 6, alcance: 'corpo a corpo, 1,5 m', dano: '2d12+4', tipo: 'cortante' },
      { nome: 'Chifrada', ataque: 6, alcance: 'corpo a corpo, 1,5 m', dano: '2d8+4', tipo: 'perfurante' },
    ],
  },
  {
    id: 'wight', nome: 'Wight', tamanho: 'Médio', tipo: 'Morto-vivo', especie: 'Morto-vivo', tendencia: 'neutro e mau',
    nd: '3', ca: 14, caNota: 'couro batido', pv: 45, pvDados: '6d8+18', desloc: '9 m', atr: [15, 14, 16, 10, 13, 15],
    extras: 'Perícias Furtividade +4, Percepção +3. Resistente a necrótico e a concussão, corte e perfuração de ataques não mágicos que não sejam de prata. Imune a veneno; não fica envenenado nem exausto. Sentidos visão no escuro 18 m, Percepção passiva 13. Idiomas os que conhecia em vida.',
    tracos: ['Sensibilidade à Luz Solar. Sob luz solar, tem desvantagem em ataques e em Sabedoria (Percepção) que dependa da visão.'],
    acoes: [
      { nome: 'Multiataque', texto: 'Dois ataques de espada longa ou dois de arco longo. Pode trocar um ataque de espada por Drenar Vida.' },
      { nome: 'Drenar Vida', ataque: 4, alcance: 'corpo a corpo, 1,5 m', dano: '1d6+2', tipo: 'necrótico', obs: 'O alvo faz Constituição CD 13 ou seu PV máximo cai na mesma quantidade até um descanso longo. Humanoide morto assim se levanta como zumbi em 24 h, sob o controle do wight.' },
      { nome: 'Espada longa', ataque: 4, alcance: 'corpo a corpo, 1,5 m', dano: '1d8+2', tipo: 'cortante', obs: 'Com as duas mãos: 1d10+2.' },
      { nome: 'Arco longo', ataque: 4, alcance: 'à distância, 45/180 m', dano: '1d8+2', tipo: 'perfurante' },
    ],
  },
  {
    id: 'basilisco', nome: 'Basilisco', tamanho: 'Médio', tipo: 'Monstruosidade', especie: 'Monstruosidade', tendencia: 'sem tendência',
    nd: '3', ca: 15, caNota: 'armadura natural', pv: 52, pvDados: '8d8+16', desloc: '6 m', atr: [16, 8, 15, 2, 8, 7],
    extras: 'Sentidos visão no escuro 18 m, Percepção passiva 9.',
    tracos: ['Olhar Petrificante. Quem começa o turno a até 9 m e vê os olhos do basilisco faz Constituição CD 12. Se falhar, começa a virar pedra (impedido) e repete o teste no fim do próximo turno; se falhar de novo, fica petrificado até ser curado por restauração maior ou magia parecida.'],
    acoes: [{ nome: 'Mordida', ataque: 5, alcance: 'corpo a corpo, 1,5 m', dano: '2d6+3+2d6', tipo: 'perfurante', obs: 'Inclui 2d6 de dano de veneno.' }],
  },
  {
    id: 'veterano', nome: 'Veterano', tamanho: 'Médio', tipo: 'Humanoide (qualquer raça)', especie: 'Humanoide', tendencia: 'qualquer tendência',
    nd: '3', ca: 17, caNota: 'cota de talas', pv: 58, pvDados: '9d8+18', desloc: '9 m', atr: [16, 13, 14, 10, 11, 10],
    extras: 'Perícias Atletismo +5, Percepção +2. Sentidos Percepção passiva 12. Idiomas qualquer um (normalmente Comum).',
    tracos: [],
    acoes: [
      { nome: 'Multiataque', texto: 'Dois ataques de espada longa. Com a espada curta sacada, pode fazer também um ataque com ela.' },
      { nome: 'Espada longa', ataque: 5, alcance: 'corpo a corpo, 1,5 m', dano: '1d8+3', tipo: 'cortante', obs: 'Com as duas mãos: 1d10+3.' },
      { nome: 'Espada curta', ataque: 5, alcance: 'corpo a corpo, 1,5 m', dano: '1d6+3', tipo: 'perfurante' },
      { nome: 'Besta pesada', ataque: 3, alcance: 'à distância, 30/120 m', dano: '1d10+1', tipo: 'perfurante' },
    ],
  },
  {
    id: 'filhote-dragao-vermelho', nome: 'Filhote de dragão vermelho', tamanho: 'Médio', tipo: 'Dragão', especie: 'Dragão', tendencia: 'caótico e mau',
    nd: '4', ca: 17, caNota: 'armadura natural', pv: 75, pvDados: '10d8+30', desloc: '9 m, escalada 9 m, voo 18 m', atr: [19, 10, 17, 12, 11, 15],
    extras: 'Resistências Des +2, Con +5, Sab +2, Car +4. Perícias Furtividade +2, Percepção +4. Imune a fogo. Sentidos percepção às cegas 3 m, visão no escuro 18 m, Percepção passiva 14. Idiomas Dracônico.',
    tracos: [],
    acoes: [
      { nome: 'Mordida', ataque: 6, alcance: 'corpo a corpo, 1,5 m', dano: '1d10+4+1d6', tipo: 'perfurante', obs: 'Inclui 1d6 de dano de fogo.' },
      { nome: 'Sopro de Fogo (recarga 5–6)', dano: '7d6', tipo: 'fogo', obs: 'Cone de 4,5 m. Destreza CD 13: dano total se falhar, metade se passar.' },
    ],
  },
  {
    id: 'troll', nome: 'Troll', tamanho: 'Grande', tipo: 'Gigante', especie: 'Gigante', tendencia: 'caótico e mau',
    nd: '5', ca: 15, caNota: 'armadura natural', pv: 84, pvDados: '8d10+40', desloc: '9 m', atr: [18, 13, 20, 7, 9, 7],
    extras: 'Perícias Percepção +2. Sentidos visão no escuro 18 m, Percepção passiva 12. Idiomas Gigante.',
    tracos: [
      'Olfato Aguçado. Vantagem em testes de Sabedoria (Percepção) que dependam do olfato.',
      'Regeneração. Recupera 10 PV no início do turno. Se sofrer dano de ácido ou fogo, não regenera no próximo turno. Só morre se começar o turno com 0 PV e não regenerar.',
    ],
    acoes: [
      { nome: 'Multiataque', texto: 'Três ataques: um de mordida e dois de garra.' },
      { nome: 'Mordida', ataque: 7, alcance: 'corpo a corpo, 1,5 m', dano: '1d6+4', tipo: 'perfurante' },
      { nome: 'Garra', ataque: 7, alcance: 'corpo a corpo, 1,5 m', dano: '2d6+4', tipo: 'cortante' },
    ],
  },
  {
    id: 'cria-vampirica', nome: 'Cria vampírica', tamanho: 'Médio', tipo: 'Morto-vivo', especie: 'Morto-vivo', tendencia: 'neutro e mau',
    nd: '5', ca: 15, caNota: 'armadura natural', pv: 82, pvDados: '11d8+33', desloc: '9 m', atr: [16, 16, 16, 11, 10, 12],
    extras: 'Resistências Des +6, Sab +3. Perícias Furtividade +6, Percepção +3. Resistente a necrótico e a concussão, corte e perfuração de ataques não mágicos. Sentidos visão no escuro 18 m, Percepção passiva 13. Idiomas os que conhecia em vida.',
    tracos: [
      'Regeneração. Recupera 10 PV no início do turno se tiver ao menos 1 PV e não estiver sob luz solar nem em água corrente. Dano radiante ou de água benta impede isso no próximo turno.',
      'Escalada Aracnídea. Escala superfícies difíceis, inclusive de cabeça para baixo, sem teste.',
      'Fraquezas de Vampiro. Não entra numa residência sem ser convidado; água corrente causa 20 de ácido por turno; estaca de madeira no coração a paralisa; luz solar causa 20 de radiante por turno e desvantagem em ataques e testes.',
    ],
    acoes: [
      { nome: 'Multiataque', texto: 'Dois ataques, só um deles de mordida.' },
      { nome: 'Garras', ataque: 6, alcance: 'corpo a corpo, 1,5 m', dano: '2d4+3', tipo: 'cortante', obs: 'Em vez de dano, pode agarrar o alvo (CD 13 para escapar).' },
      { nome: 'Mordida', ataque: 6, alcance: 'corpo a corpo, 1,5 m (alvo disposto, agarrado ou incapacitado)', dano: '1d6+3+2d6', tipo: 'perfurante', obs: 'Inclui 2d6 necrótico; o PV máximo do alvo cai no valor necrótico e a cria recupera o mesmo tanto de PV.' },
    ],
  },
  {
    id: 'jovem-dragao-vermelho', nome: 'Jovem dragão vermelho', tamanho: 'Grande', tipo: 'Dragão', especie: 'Dragão', tendencia: 'caótico e mau',
    nd: '10', ca: 18, caNota: 'armadura natural', pv: 178, pvDados: '17d10+85', desloc: '12 m, escalada 12 m, voo 24 m', atr: [23, 10, 21, 14, 11, 19],
    extras: 'Resistências Des +4, Con +9, Sab +4, Car +8. Perícias Furtividade +4, Percepção +8. Imune a fogo. Sentidos percepção às cegas 9 m, visão no escuro 36 m, Percepção passiva 18. Idiomas Comum, Dracônico.',
    tracos: [],
    acoes: [
      { nome: 'Multiataque', texto: 'Três ataques: um de mordida e dois de garra.' },
      { nome: 'Mordida', ataque: 10, alcance: 'corpo a corpo, 3 m', dano: '2d10+6+1d6', tipo: 'perfurante', obs: 'Inclui 1d6 de dano de fogo.' },
      { nome: 'Garra', ataque: 10, alcance: 'corpo a corpo, 1,5 m', dano: '2d6+6', tipo: 'cortante' },
      { nome: 'Sopro de Fogo (recarga 5–6)', dano: '16d6', tipo: 'fogo', obs: 'Cone de 9 m. Destreza CD 17: dano total se falhar, metade se passar.' },
    ],
  },
]
