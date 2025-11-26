export const MAIN_ANALYSIS_STEPS = [
  { title: 'Extração', key: 'color-extraction' },
  { title: 'Máscaras', key: 'mask-analysis' },
  { title: 'Pigmentos', key: 'pigment-analysis' },
  { title: 'Classificação', key: 'final-classification' },
]

export const PIGMENT_SUB_STEPS = [
  { title: 'Temperatura', key: 'temperatura' },
  { title: 'Intensidade', key: 'intensidade' },
  { title: 'Profundidade', key: 'profundidade' },
  { title: 'Geral', key: 'geral' },
]

export const COLOR_FIELDS = [
  'iris',
  'raiz_cabelo',
  'sobrancelha',
  'testa',
  'bochecha',
  'cavidade_ocular',
  'queixo',
  'contorno_boca',
  'boca',
] as const

export const TOTAL_STEPS = 7

export const COLOR_FIELDS_MAP: { [key: string]: string } = {
  'iris': 'Íris',
  'raiz_cabelo': 'Raiz Cabelo',
  'sobrancelha': 'Sobrancelha',
  'testa': 'Testa',
  'bochecha': 'Bochecha',
  'cavidade_ocular': 'Cavidade Ocular',
  'queixo': 'Queixo',
  'contorno_boca': 'Contorno Boca',
  'boca': 'Boca',
}

export const COMPARISON_NAMES: { [key: string]: string } = {
  'iris_vs_pele': 'Íris vs Tons de Pele',
  'cavidade_ocular_vs_pele': 'Cavidade Ocular vs Tons de Pele',
  'cabelo_vs_pele': 'Tons de Cabelo vs Tons de Pele',
  'contorno_boca_vs_boca': 'Contorno Boca vs Boca',
}
