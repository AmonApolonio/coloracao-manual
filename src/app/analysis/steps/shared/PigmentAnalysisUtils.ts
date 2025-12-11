import { ColorField } from '@/lib/types'
import { getHclFromHex, getHsvFromHex } from './colorConversion'
import {
  PROFUNDIDADE_RANGES,
} from './profundidadeUtils'

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
 */
export const calculateWeightedAverage = (values: number[]): number | null => {
  if (values.length === 0) return null

  const valuesWithWeights = values.map((value) => ({
    value,
    weight: getWeightForValue(value),
  }))

  const totalWeight = valuesWithWeights.reduce((sum, vw) => sum + vw.weight, 0)
  const weightedSum = valuesWithWeights.reduce((sum, vw) => sum + vw.value * vw.weight, 0)

  return Math.round(weightedSum / totalWeight)
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
 * Apply saturation-based adjustment to reduce temperature for desaturated colors
 * Lower saturation (less pigment) means colder appearance
 * When saturation <= 30, reduces the temperatura value towards colder (lower values)
 */
const applySaturationInfluence = (baseTemperatura: number, saturation: number): number => {
  const maxReduction = 40
  const ratioS = saturation <= 30 ? (30 - saturation) / 30 : 0
  const reduction = ratioS * maxReduction
  return Math.max(0, baseTemperatura - reduction)
}

/**
 * Calculate the temperatura (hue) position for a color within the default range
 * Uses HSV hue and applies saturation influence
 * Returns a value 0-100 representing position in the hue scale
 */
export const calculateTemperaturaPosition = (hex: string, fieldKey: string): number => {
  const hsv = getHsvFromHex(hex)
  const colorField = fieldKey as ColorFieldKey
  const hueDefaults = DEFAULT_RANGES.hue[colorField] || { zero: 0, hundred: 360 }
  const hueStart = hueDefaults.zero
  const hueEnd = hueDefaults.hundred

  let huePosition: number
  if (hueStart <= hueEnd) {
    // Normal range (e.g., 20 to 90)
    if (hsv.h < hueStart) {
      huePosition = 0
    } else if (hsv.h > hueEnd) {
      huePosition = 100
    } else {
      huePosition = ((hsv.h - hueStart) / (hueEnd - hueStart)) * 100
    }
  } else {
    // Wrap-around range (e.g., 350 to 50 goes through 360/0)
    const range = (360 - hueStart) + hueEnd
    let adjustedHue: number
    if (hsv.h >= hueStart) {
      adjustedHue = hsv.h - hueStart
    } else if (hsv.h <= hueEnd) {
      adjustedHue = (360 - hueStart) + hsv.h
    } else {
      // Outside the wrap-around range - determine which extreme is closer
      const distToStart = hsv.h - hueEnd
      const distToEnd = hueStart - hsv.h
      adjustedHue = distToStart < distToEnd ? range : 0
    }
    huePosition = Math.max(0, Math.min(100, (adjustedHue / range) * 100))
  }

  // Apply saturation influence: lower saturation shifts temperature towards colder (lower values)
  const adjustedTemperatura = applySaturationInfluence(huePosition, hsv.s)
  
  return Math.round(adjustedTemperatura)
}

/**
 * Get detailed calculation breakdown for temperatura positioning
 * Returns all intermediate values used in the calculation for display/debugging
 */
export interface TemperaturaCalculationDetails {
  actualHue: number
  hueStart: number
  hueEnd: number
  remappedValue: number
  saturation: number
  saturationAdjustment: number
  finalValue: number
}

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

export const getTemperaturaCalculationDetails = (
  hex: string,
  fieldKey: string
): TemperaturaCalculationDetails => {
  const hsv = getHsvFromHex(hex)
  const colorField = fieldKey as ColorFieldKey
  const hueDefaults = DEFAULT_RANGES.hue[colorField] || { zero: 0, hundred: 360 }
  const hueStart = hueDefaults.zero
  const hueEnd = hueDefaults.hundred

  let huePosition: number
  if (hueStart <= hueEnd) {
    // Normal range (e.g., 20 to 90)
    if (hsv.h < hueStart) {
      huePosition = 0
    } else if (hsv.h > hueEnd) {
      huePosition = 100
    } else {
      huePosition = ((hsv.h - hueStart) / (hueEnd - hueStart)) * 100
    }
  } else {
    // Wrap-around range (e.g., 350 to 50 goes through 360/0)
    const range = (360 - hueStart) + hueEnd
    let adjustedHue: number
    if (hsv.h >= hueStart) {
      adjustedHue = hsv.h - hueStart
    } else if (hsv.h <= hueEnd) {
      adjustedHue = (360 - hueStart) + hsv.h
    } else {
      // Outside the wrap-around range - determine which extreme is closer
      const distToStart = hsv.h - hueEnd
      const distToEnd = hueStart - hsv.h
      adjustedHue = distToStart < distToEnd ? range : 0
    }
    huePosition = Math.max(0, Math.min(100, (adjustedHue / range) * 100))
  }

  // Calculate saturation adjustment
  const maxReduction = 40
  const ratioS = hsv.s <= 30 ? (30 - hsv.s) / 30 : 0
  const saturationAdjustment = ratioS * maxReduction
  const adjustedTemperatura = Math.max(0, huePosition - saturationAdjustment)
  const finalValue = Math.round(adjustedTemperatura)

  return {
    actualHue: Math.round(hsv.h * 10) / 10,
    hueStart,
    hueEnd,
    remappedValue: Math.round(huePosition * 10) / 10,
    saturation: Math.round(hsv.s * 10) / 10,
    saturationAdjustment: Math.round(saturationAdjustment * 10) / 10,
    finalValue,
  }
}

/**
 * Get detailed calculation breakdown for intensidade positioning
 * Returns all intermediate values used in the calculation for display/debugging
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
    chromaPosition = ((hcl.c - chromaStart) / (chromaEnd - chromaStart)) * 100
  }

  const finalValue = Math.round(chromaPosition)

  return {
    actualChroma: Math.round(hcl.c * 10) / 10,
    chromaStart,
    chromaEnd,
    remappedValue: Math.round(chromaPosition * 10) / 10,
    finalValue,
  }
}

/**
 * Calculate the intensidade (chroma) position for a color within the default range
 * Returns a value 0-100 representing position in the chroma scale
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
    chromaPosition = ((hcl.c - chromaStart) / (chromaEnd - chromaStart)) * 100
  }

  return Math.round(chromaPosition)
}


