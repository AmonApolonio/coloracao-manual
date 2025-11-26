import { ColorField } from '@/lib/types'

export const COLOR_FIELDS: { value: ColorField; label: string }[] = [
  { value: 'iris', label: 'Iris' },
  { value: 'raiz_cabelo', label: 'Raiz Cabelo' },
  { value: 'sobrancelha', label: 'Sobrancelha' },
  { value: 'testa', label: 'Testa' },
  { value: 'bochecha', label: 'Bochecha' },
  { value: 'cavidade_ocular', label: 'Cavidade Ocular' },
  { value: 'queixo', label: 'Queixo' },
  { value: 'contorno_boca', label: 'Contorno Boca' },
  { value: 'boca', label: 'Boca' },
]

export const TEMPERATURE_RANGES = [
  { min: 0, max: 12.5, label: 'Extremo Frio', color: '#8b5cf6' },
  { min: 12.5, max: 47, label: 'Neutro Frio', color: '#3b82f6' },
  { min: 47, max: 53, label: 'Neutro Puro', color: '#33d221' },
  { min: 53, max: 87.5, label: 'Neutro Quente', color: '#f97316' },
  { min: 87.5, max: 100, label: 'Extremo Quente', color: '#dc2626' },
]

export const INTENSIDADE_RANGES = [
  { min: 0, max: 12.5, label: 'Extremo Suave', color: '#8b5cf6' },
  { min: 12.5, max: 47, label: 'Neutro Suave', color: '#3b82f6' },
  { min: 47, max: 53, label: 'Neutro Puro', color: '#33d221' },
  { min: 53, max: 87.5, label: 'Neutro Brilhante', color: '#f97316' },
  { min: 87.5, max: 100, label: 'Extremo Brilhante', color: '#dc2626' },
]

export const PROFUNDIDADE_RANGES = [
  { min: 0, max: 12.5, label: 'Extremo Escuro', color: '#8b5cf6' },
  { min: 12.5, max: 47, label: 'Neutro Escuro', color: '#3b82f6' },
  { min: 47, max: 53, label: 'Neutro Puro', color: '#33d221' },
  { min: 53, max: 87.5, label: 'Neutro Claro', color: '#f97316' },
  { min: 87.5, max: 100, label: 'Extremo Claro', color: '#dc2626' },
]

export const ANALYSIS_STEPS = [
  { title: 'Temperatura', key: 'temperatura' },
  { title: 'Intensidade', key: 'intensidade' },
  { title: 'Profundidade', key: 'profundidade' },
  { title: 'Geral', key: 'geral' },
]


export const getLabelCategory = (
  value: number | null,
  stepKey?: string
): string => {
  if (value === null) return ''

  let ranges = TEMPERATURE_RANGES

  if (stepKey === 'intensidade') {
    ranges = INTENSIDADE_RANGES
  } else if (stepKey === 'profundidade') {
    ranges = PROFUNDIDADE_RANGES
  }

  for (const range of ranges) {
    if (value >= range.min && value <= range.max) {
      return range.label
    }
  }
  return 'Neutro Puro'
}

export const getLabelColor = (
  value: number | null,
  stepKey?: string
): string => {
  if (value === null) return '#d3d3d3'

  let ranges = TEMPERATURE_RANGES

  if (stepKey === 'intensidade') {
    ranges = INTENSIDADE_RANGES
  } else if (stepKey === 'profundidade') {
    ranges = PROFUNDIDADE_RANGES
  }

  for (const range of ranges) {
    if (value >= range.min && value <= range.max) {
      return range.color
    }
  }
  return '#8b5cf6'
}
