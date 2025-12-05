import { ColorField } from '@/lib/types'
import { getHclFromHex, getHsvFromHex, getColorProperties } from './colorConversion'

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
    testa: { min: 20, max: 40 },
    bochecha: { min: 20, max: 40 },
    cavidade_ocular: { min: 20, max: 40 },
    queixo: { min: 20, max: 40 },
    contorno_boca: { min: 10, max: 50 },
    boca: { min: 10, max: 50 },
  },
  hue: {
    iris: { zero: 300, hundred: 100 },
    raiz_cabelo: { zero: 300, hundred: 100 },
    sobrancelha: { zero: 300, hundred: 100 },
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

/**
 * Calculate the temperatura (hue) position for a color within the default range
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
    // Wrap-around range (e.g., 300 to 100 goes through 360/0)
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

  return Math.round(huePosition)
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

/**
 * Calculate the profundidade (lightness) position based on average lightness of all colors
 * Returns a value 0-100 representing position in the lightness scale (0 = dark, 100 = light)
 */
export const calculateProfundidadePosition = (
  extractedColors: { [key: string]: string }
): number => {
  const fields = Object.keys(extractedColors)
  if (fields.length === 0) return 50

  // Calculate average lightness across all colors
  const properties = fields.map((field) => getColorProperties(extractedColors[field]))
  const lightnessValues = properties.map((p) => p.lightness)
  const avgLightness = Math.round(lightnessValues.reduce((sum, l) => sum + l, 0) / properties.length)

  // Map average lightness (0-100) directly to the slider position
  // Lower lightness = darker = lower value (Extremo Escuro)
  // Higher lightness = lighter = higher value (Extremo Claro)
  return avgLightness
}
