// Fase 60 — pacotes que vêm com o site. Só dados (sem imagem nem áudio); passam pela mesma validação de um arquivo importado.
const slug = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// cena('Nome', escuridão, corDaEscuridão, [[tipo, intensidade], ...], [sons])
const cena = (nome, escuridao, cor, efeitos, sons = []) => ({
  id: slug(nome), nome,
  atmosfera: { efeitos: efeitos.map(([tipo, intensidade]) => ({ tipo, intensidade, cor: null })), luz: { escuridao, cor }, sons },
})
// efeito('Nome', forma, cor1, cor2, som)
const efeito = (nome, forma, c1, c2, som = null) => ({ id: slug(nome), nome, forma, cores: [c1, c2], som })
const pacote = (id, nome, descricao, cenas, efeitos) => ({
  formato: 'dado-e-pena/extensao', versao: 1, id, nome, descricao, autor: 'Dado & Pena', cenas, efeitos,
})
const PRETO = '#05070C'

export const PACOTE_ESSENCIAL = pacote('essencial', 'Essencial', 'Cenas e efeitos básicos, sempre disponíveis.', [
  cena('Noite', 0.55, '#0A1230', []),
  cena('Chuva', 0.2, PRETO, [['chuva', 0.5]]),
  cena('Neblina', 0, PRETO, [['neblina', 0.5]]),
  cena('Neve', 0, PRETO, [['neve', 0.5]]),
], [
  efeito('Fogo', 'projetil', '#FF7A1A', '#FFD84A', 'projetil'),
  efeito('Gelo', 'projetil', '#9FE8FF', '#FFFFFF', 'arcano'),
  efeito('Raio', 'raio', '#9CC2FF', '#FFFFFF', 'trovao'),
  efeito('Cura', 'cura', '#4ADE80', '#FFFFFF', 'cura'),
  efeito('Veneno', 'projetil', '#4ADE80', '#7C3AED', 'disparo'),
  efeito('Sombra', 'onda', '#4C1D95', '#7C3AED', 'arcano'),
  efeito('Sagrado', 'explosao', '#FFD84A', '#FFFFFF', 'sino'),
  efeito('Corte', 'corte', '#FFFFFF', '#DC2626', 'lamina'),
  efeito('Impacto', 'onda', '#9AA0A8', '#FFFFFF', 'impacto'),
  efeito('Explosão', 'explosao', '#FF7A1A', '#DC2626', 'impacto'),
])

export const CATALOGO = [
  pacote('inferno', 'Inferno', 'Fogo, brasas e cinzas para arenas e portões infernais.', [
    cena('Arena de fogo', 0.35, '#2A0505', [['fogo', 0.6], ['brasas', 0.7]], ['fogo']),
    cena('Portões do inferno', 0.5, '#1A0000', [['fogo', 0.8], ['brasas', 0.9], ['cinzas', 0.6]], ['infernal']),
  ], [
    efeito('Chama infernal', 'projetil', '#DC2626', '#FF7A1A', 'projetil'),
    efeito('Coluna de fogo', 'explosao', '#FF7A1A', '#FFD84A', 'impacto'),
    efeito('Onda de calor', 'onda', '#FF7A1A', '#FFD84A', 'impacto'),
  ]),
  pacote('tempestade', 'Tempestade', 'Chuva forte, relâmpagos e vento.', [
    cena('Tempestade', 0.45, '#0A1020', [['chuva', 0.9], ['relampago', 0.6]], ['vento']),
    cena('Garoa', 0, PRETO, [['chuva', 0.3], ['neblina', 0.2]]),
  ], [
    efeito('Relâmpago em cadeia', 'raio', '#9CC2FF', '#FFFFFF', 'trovao'),
    efeito('Rajada', 'onda', '#C9D3E0', '#FFFFFF', 'impacto'),
  ]),
  pacote('cripta', 'Cripta', 'Corredores escuros, neblina e morte.', [
    cena('Corredores', 0.8, '#000000', [['neblina', 0.4]]),
    cena('Catacumba úmida', 0.7, '#000000', [['neblina', 0.6]], ['agua']),
  ], [
    efeito('Toque sombrio', 'onda', '#4C1D95', '#9AA0A8', 'arcano'),
    efeito('Drenar vida', 'projetil', '#7C3AED', '#DC2626', 'arcano'),
  ]),
  pacote('floresta-encantada', 'Floresta encantada', 'Vaga-lumes, runas e magia da natureza.', [
    cena('Clareira à noite', 0.5, '#06140C', [['vagalumes', 0.6], ['neblina', 0.25]]),
    cena('Bosque das fadas', 0, PRETO, [['vagalumes', 0.9], ['runas', 0.3]]),
  ], [
    efeito('Espinhos', 'projetil', '#4ADE80', '#A16207', 'disparo'),
    efeito('Bênção da floresta', 'cura', '#4ADE80', '#D8FF7A', 'cura'),
  ]),
  pacote('nevasca', 'Nevasca', 'Neve, vento e frio cortante.', [
    cena('Nevasca', 0, PRETO, [['neve', 0.9], ['neblina', 0.4]]),
    cena('Noite gelada', 0.5, '#06101E', [['neve', 0.4]]),
  ], [
    efeito('Lança de gelo', 'projetil', '#9FE8FF', '#FFFFFF', 'arcano'),
    efeito('Sopro gélido', 'onda', '#9FE8FF', '#FFFFFF', 'arcano'),
  ]),
  pacote('deserto', 'Deserto', 'Areia ao vento.', [
    cena('Tempestade de areia', 0, PRETO, [['areia', 0.9]]),
    cena('Vento do deserto', 0, PRETO, [['areia', 0.3]]),
  ], [
    efeito('Rajada de areia', 'onda', '#D9B77A', '#FFFFFF', 'impacto'),
  ]),
  pacote('profundezas', 'Profundezas', 'Cena submersa.', [
    cena('Submerso', 0.4, '#021A2E', [['bolhas', 0.6], ['neblina', 0.3]]),
  ], [
    efeito('Jato d\'água', 'projetil', '#9FE8FF', '#FFFFFF', 'projetil'),
    efeito('Bolha', 'explosao', '#9FE8FF', '#FFFFFF', 'impacto'),
  ]),
  pacote('torre-arcana', 'Torre arcana', 'Runas e magia de salão.', [
    cena('Sala de rituais', 0.5, '#0A0A2A', [['runas', 0.7]]),
  ], [
    efeito('Míssil arcano', 'projetil', '#A9C4FF', '#7C3AED', 'arcano'),
    efeito('Círculo de proteção', 'onda', '#A9C4FF', '#FFFFFF', 'escudo'),
    efeito('Explosão arcana', 'explosao', '#A9C4FF', '#7C3AED', 'arcano'),
  ]),
]
