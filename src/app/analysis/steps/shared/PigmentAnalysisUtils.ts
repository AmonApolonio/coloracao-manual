import { ColorField } from '@/lib/types'
import { PROFUNDIDADE_RANGES } from './profundidadeUtils'
import { TEMPERATURE_RANGES } from './temperaturaUtils'
import { INTENSIDADE_RANGES } from './intensidadeUtils'
import { PigmentTemperatureDataUI, ProfundidadeDataUI } from '@/lib/types-ui'

/**
 * Helper function to round values to 2 decimal places with precision
 * Ensures accurate calculations throughout the analysis pipeline
 */
export const round2Decimals = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

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

// Default range values for hue (temperatura) and chroma (intensidade) scales
export const DEFAULT_RANGES = {
  chroma: {
    iris: { min: 5, max: 50 },
    raiz_cabelo: { min: 5, max: 50 },
    sobrancelha: { min: 5, max: 50 },
    testa: { min: 20, max: 30 },
    bochecha: { min: 20, max: 30 },
    cavidade_ocular: { min: 20, max: 30 },
    queixo: { min: 20, max: 30 },
    contorno_boca: { min: 10, max: 40 },
    boca: { min: 10, max: 40 },
  },
  hue: {
    iris: { zero: 350, hundred: 50 },
    raiz_cabelo: { zero: 350, hundred: 50 },
    sobrancelha: { zero: 350, hundred: 50 },
    testa: { zero: 0, hundred: 40 },
    bochecha: { zero: 0, hundred: 40 },
    cavidade_ocular: { zero: 0, hundred: 40 },
    queixo: { zero: 0, hundred: 40 },
    contorno_boca: { zero: 340, hundred: 40 },
    boca: { zero: 340, hundred: 40 },
  },
} as const

export type ColorFieldKey = 'iris' | 'raiz_cabelo' | 'sobrancelha' | 'testa' | 'bochecha' | 'cavidade_ocular' | 'queixo' | 'contorno_boca' | 'boca'

export const ANALYSIS_STEPS = [
  { title: 'Temperatura', key: 'temperatura' },
  { title: 'Intensidade', key: 'intensidade' },
  { title: 'Profundidade', key: 'profundidade' },
  { title: 'Geral', key: 'geral' },
]

/**
 * Get weight for a value based on temperature/intensity ranges
 * Valores entre 0 - 12,5 -> Peso 4
 * Valores entre 12,5 - 47 -> Peso 2
 * Valores entre 47 - 53 -> Peso 1
 * Valores entre 54 - 87,5 -> Peso 2
 * Valores entre 87,5 - 100 -> Peso 4
 */
export const getWeightForValue = (value: number): number => {
  if (value >= 0 && value <= 12.5) return 4
  if (value > 12.5 && value < 47) return 2
  if (value >= 47 && value <= 53) return 1
  if (value > 53 && value < 87.5) return 2
  if (value >= 87.5 && value <= 100) return 4
  return 1
}

/**
 * Calculate weighted average from an array of values
 * Uses getWeightForValue to determine weights
 * Returns result rounded to 2 decimal places with precision
 */
export const calculateWeightedAverage = (values: number[]): number | null => {
  if (values.length === 0) return null

  const valuesWithWeights = values.map((value) => ({
    value,
    weight: getWeightForValue(value),
  }))

  const totalWeight = valuesWithWeights.reduce((sum, vw) => sum + vw.weight, 0)
  const weightedSum = valuesWithWeights.reduce((sum, vw) => sum + vw.value * vw.weight, 0)

  return round2Decimals(weightedSum / totalWeight)
}

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

/**
 * Calculate average value from step data
 * For profundidade: returns the single value
 * For temperatura and intensidade: returns weighted average
 */
export const calculateAverageFromStep = (
  stepData: PigmentTemperatureDataUI | ProfundidadeDataUI | undefined,
  stepKey: 'temperatura' | 'intensidade' | 'profundidade'
): number | null => {
  if (!stepData) return null

  if (stepKey === 'profundidade') {
    // For profundidade: just return the single value
    const profData = stepData as ProfundidadeDataUI
    return profData.value
  } else {
    // For temperatura and intensidade: use weighted average
    const tempData = stepData as PigmentTemperatureDataUI
    const values = Object.values(tempData)
      .filter((v) => v.temperature !== null)
      .map((v) => v.temperature as number)

    if (values.length === 0) return null

    return calculateWeightedAverage(values)
  }
}


