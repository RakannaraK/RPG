// Modelos de sistema prontos — estrutura genérica, SEM conteúdo proprietário.
// Cada `dados` é um sistema serializado (mesmo formato do export) e é
// instanciado pelo MESMO caminho do import (desserializar + RPC atômica).
// O mestre ajusta tudo depois de criar.
export const TEMPLATES_SISTEMA = [
  {
    id: 'd20',
    nome: 'Atributos & d20',
    descricao: 'Base genérica: atributos numéricos, teste em 1d20 + modificador.',
    dados: {
      versao: 1,
      sistema: {
        nome: 'Atributos & d20',
        descricao: 'Base genérica: teste em 1d20 + modificador de atributo. Ajuste tudo ao seu gosto.',
        config_layout: {
          dado_padrao: 20,
          formula_modificador: 'piso((_x - 10) / 2)',
          resolucao: { modo: 'soma' },
          secoes: { atributos: true, pericias: true, acoes: true, inventario: true, tracos: true, notas: true },
        },
      },
      atributos: [
        { id: 'a0000000-0000-4000-8000-000000000001', nome: 'Físico', ordem: 0, regra_rolagem: null },
        { id: 'a0000000-0000-4000-8000-000000000002', nome: 'Agilidade', ordem: 1, regra_rolagem: null },
        { id: 'a0000000-0000-4000-8000-000000000003', nome: 'Mente', ordem: 2, regra_rolagem: null },
        { id: 'a0000000-0000-4000-8000-000000000004', nome: 'Presença', ordem: 3, regra_rolagem: null },
      ],
    },
  },
  {
    id: 'sucessos',
    nome: 'Parada de dados (sucessos)',
    descricao: 'Atributos em bolinhas; junta dados d10 e conta sucessos acima da dificuldade.',
    dados: {
      versao: 1,
      sistema: {
        nome: 'Parada de dados (sucessos)',
        descricao: 'Atributos em bolinhas; testes juntam dados d10 e contam sucessos acima de uma dificuldade. Ajuste ao seu gosto.',
        config_layout: {
          exibicao_atributos: 'dots',
          maximo_dots: 5,
          resolucao: { modo: 'sucessos', dado: 10, dificuldade_padrao: 6, botch: true },
          secoes: { atributos: true, pericias: true, acoes: true, inventario: true, tracos: true, notas: true },
        },
      },
      atributos: [
        { id: 'b0000000-0000-4000-8000-000000000001', nome: 'Força', ordem: 0, regra_rolagem: null },
        { id: 'b0000000-0000-4000-8000-000000000002', nome: 'Destreza', ordem: 1, regra_rolagem: null },
        { id: 'b0000000-0000-4000-8000-000000000003', nome: 'Percepção', ordem: 2, regra_rolagem: null },
        { id: 'b0000000-0000-4000-8000-000000000004', nome: 'Vontade', ordem: 3, regra_rolagem: null },
      ],
    },
  },
  {
    id: 'faixas',
    nome: '2d6 e faixas',
    descricao: 'Rola 2d6 + valor; o total cai numa faixa (falha / parcial / sucesso).',
    dados: {
      versao: 1,
      sistema: {
        nome: '2d6 e faixas',
        descricao: 'Rola 2d6 + um valor; o total cai numa faixa. Ajuste os textos e limites.',
        config_layout: {
          dado_padrao: 6,
          resolucao: {
            modo: 'faixas',
            notacao_base: '2d6',
            faixas: [
              { de: 2, ate: 6, rotulo: 'Falha', texto: 'Algo dá errado.', cor: 'vermelho' },
              { de: 7, ate: 9, rotulo: 'Sucesso parcial', texto: 'Consegue, mas com um custo.', cor: 'ambar' },
              { de: 10, ate: 99, rotulo: 'Sucesso', texto: 'Consegue plenamente.', cor: 'verde' },
            ],
          },
          secoes: { atributos: true, acoes: true, inventario: true, tracos: true, notas: true },
        },
      },
      atributos: [
        { id: 'c0000000-0000-4000-8000-000000000001', nome: 'Vigor', ordem: 0, regra_rolagem: null },
        { id: 'c0000000-0000-4000-8000-000000000002', nome: 'Astúcia', ordem: 1, regra_rolagem: null },
        { id: 'c0000000-0000-4000-8000-000000000003', nome: 'Charme', ordem: 2, regra_rolagem: null },
      ],
    },
  },
]
