import { getHclFromHex } from './colorConversion'
import { DEFAULT_RANGES, ColorFieldKey, round2Decimals } from './PigmentAnalysisUtils'

/**
 * Intensidade (Intensity/Chroma) Analysis Utilities
 * Centralizes all calculations related to intensidade/chroma analysis
 */

export const INTENSIDADE_RANGES = [
  { min: 0, max: 12.5, label: 'Extremo Suave', color: '#8b5cf6' },
  { min: 12.5, max: 47, label: 'Neutro Suave', color: '#3b82f6' },
  { min: 47, max: 53, label: 'Neutro Puro', color: '#33d221' },
  { min: 53, max: 87.5, label: 'Neutro Brilhante', color: '#f97316' },
  { min: 87.5, max: 100, label: 'Extremo Brilhante', color: '#dc2626' },
]

/**
 * Get detailed calculation breakdown for intensidade positioning
 * Returns all intermediate values used in the calculation for display/debugging
 */
export interface IntensidadeCalculationDetails {
  actualChroma: number
  chromaStart: number
  chromaEnd: number
  remappedValue: number
  finalValue: number
}

/**
 * Calculate the intensidade (chroma) position for a color within the default range
 * Returns a value 0-100 representing position in the chroma scale (rounded to 2 decimal places)
 */
export const calculateIntensidadePosition = (hex: string, fieldKey: string): number => {
  const hcl = getHclFromHex(hex)
  const colorField = fieldKey as ColorFieldKey
  const chromaDefaults = DEFAULT_RANGES.chroma[colorField] || { min: 0, max: 60 }
  const chromaStart = chromaDefaults.min
  const chromaEnd = chromaDefaults.max

  let chromaPosition: number
  if (hcl.c < chromaStart) {
    chromaPosition = 0
  } else if (hcl.c > chromaEnd) {
    chromaPosition = 100
  } else {
    chromaPosition = round2Decimals(((hcl.c - chromaStart) / (chromaEnd - chromaStart)) * 100)
  }

  return chromaPosition
}

/**
 * Get detailed calculation breakdown for intensidade positioning
 * Returns all intermediate values used in the calculation for display/debugging (with 2 decimal places)
 */
export const getIntensidadeCalculationDetails = (
  hex: string,
  fieldKey: string
): IntensidadeCalculationDetails => {
  const hcl = getHclFromHex(hex)
  const colorField = fieldKey as ColorFieldKey
  const chromaDefaults = DEFAULT_RANGES.chroma[colorField] || { min: 0, max: 60 }
  const chromaStart = chromaDefaults.min
  const chromaEnd = chromaDefaults.max

  let chromaPosition: number
  if (hcl.c < chromaStart) {
    chromaPosition = 0
  } else if (hcl.c > chromaEnd) {
    chromaPosition = 100
  } else {
    chromaPosition = round2Decimals(((hcl.c - chromaStart) / (chromaEnd - chromaStart)) * 100)
  }

  const finalValue = chromaPosition

  return {
    actualChroma: round2Decimals(hcl.c),
    chromaStart,
    chromaEnd,
    remappedValue: chromaPosition,
    finalValue,
  }
}
