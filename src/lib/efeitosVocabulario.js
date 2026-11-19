/**
 * Fases 57–60 — vocabulário dos efeitos do mapa (atmosfera, luz, efeitos de ação, extensões).
 *
 * Os ids daqui entram em JSON gravado no banco (mapas.atmosfera, mesas.extensoes,
 * habilidades.efeito_visual) e em arquivos de extensão que os mestres trocam entre si:
 * NÃO renomear nem remover um id — só acrescentar.
 */

import { t } from '../i18n'

/** Efeitos de atmosfera. `som` = laço de SONS_AMBIENTE; `luz` = o efeito LOCAL também ilumina;
 *  `soCena` = não pode ser colocado num ponto do mapa (vale para a cena inteira). */
export const TIPOS_ATMOSFERA = {
  fogo:      { nome: t('Fogo'),           som: 'fogo',   luz: true,  cor: '#FF7A1A' },
  brasas:    { nome: t('Brasas'),         som: null,     luz: false, cor: '#FF9A3C' },
  cinzas:    { nome: t('Cinzas'),         som: null,     luz: false, cor: '#9AA0A8' },
  neblina:   { nome: t('Neblina'),        som: null,     luz: false, cor: '#C9D3E0' },
  chuva:     { nome: t('Chuva'),          som: 'chuva',  luz: false, cor: '#9CC2FF' },
  neve:      { nome: t('Neve'),           som: 'vento',  luz: false, cor: '#FFFFFF' },
  areia:     { nome: t('Areia ao vento'), som: 'vento',  luz: false, cor: '#D9B77A' },
  vagalumes: { nome: t('Vaga-lumes'),     som: 'noite',  luz: false, cor: '#D8FF7A' },
  bolhas:    { nome: t('Bolhas'),         som: 'agua',   luz: false, cor: '#9FE8FF' },
  runas:     { nome: t('Runas arcanas'),  som: 'arcano', luz: false, cor: '#A9C4FF' },
  relampago: { nome: t('Relâmpagos'),     som: null,     luz: false, cor: '#EAF2FF', soCena: true },
}

/** Laços de som ambiente, sintetizados em src/audio/somAmbiente.js. */
export const SONS_AMBIENTE = {
  fogo: t('Fogo crepitando'),
  chuva: t('Chuva'),
  vento: t('Vento'),
  noite: t('Noite (grilos)'),
  agua: t('Água'),
  infernal: t('Zumbido infernal'),
  arcano: t('Zumbido arcano'),
}

/** Formas de um efeito de ação (o desenho fica em CamadaVfx). */
export const FORMAS_VFX = {
  projetil: t('Projétil'),
  explosao: t('Explosão'),
  raio: t('Raio'),
  cura: t('Cura'),
  corte: t('Corte'),
  onda: t('Onda'),
}

/** Sons de um efeito de ação = presets que JÁ existem em src/audio/actionSynth.js. */
export const SONS_VFX = ['lamina', 'impacto', 'disparo', 'projetil', 'arcano', 'cura', 'escudo', 'critico', 'falha', 'trovao', 'sino']

export const LIMITES = {
  efeitos: 12,          // efeitos de atmosfera por cena
  fontes: 40,           // luzes fixas por cena
  sons: 3,              // laços extras por cena
  pacotes: 20,          // extensões instaladas por mesa
  cenasPorPacote: 12,
  efeitosPorPacote: 24,
  bytesPacote: 20000,   // tamanho do JSON de uma extensão
  alvosVfx: 20,         // alvos de um efeito de ação
  texto: 60,            // nome de cena/efeito/extensão
}

export const ID_VALIDO = /^[a-z0-9_-]{1,40}$/

export const corValida = c => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)

/** Número dentro de [min, max]; qualquer coisa que não seja número finito vira `padrao`. */
export function limitar(n, min, max, padrao = min) {
  const v = typeof n === 'number' ? n : Number.NaN
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : padrao
}

/** Texto curto e sem quebra de linha (vem de arquivo importado: não confiar). */
export const textoCurto = (txt, max = LIMITES.texto) =>
  typeof txt === 'string' ? txt.replace(/\s+/g, ' ').trim().slice(0, max) : ''
