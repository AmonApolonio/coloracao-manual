import { ColorField } from '@/lib/types'
import { getHclFromHex, getColorProperties } from './colorConversion'

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
    testa: { zero: 40, hundred: 80 },
    bochecha: { zero: 40, hundred: 80 },
    cavidade_ocular: { zero: 40, hundred: 80 },
    queixo: { zero: 40, hundred: 80 },
    contorno_boca: { zero: 0, hundred: 65 },
    boca: { zero: 0, hundred: 65 },
  },
  contrast: {
    default: { min: 1.0, max: 3.0 },
    iris_vs_pele: { min: 1.0, max: 3.0 },
    cavidade_ocular_vs_pele: { min: 1.0, max: 1.5 },
    cabelo_vs_pele: { min: 1.0, max: 3.0 },
    contorno_boca_vs_boca: { min: 1.0, max: 1.5 },
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
  const hcl = getHclFromHex(hex)
  const colorField = fieldKey as ColorFieldKey
  const hueDefaults = DEFAULT_RANGES.hue[colorField] || { zero: 0, hundred: 360 }
  const hueStart = hueDefaults.zero
  const hueEnd = hueDefaults.hundred

  let huePosition: number
  if (hueStart <= hueEnd) {
    // Normal range (e.g., 20 to 90)
    if (hcl.h < hueStart) {
      huePosition = 0
    } else if (hcl.h > hueEnd) {
      huePosition = 100
    } else {
      huePosition = ((hcl.h - hueStart) / (hueEnd - hueStart)) * 100
    }
  } else {
    // Wrap-around range (e.g., 300 to 100 goes through 360/0)
    const range = (360 - hueStart) + hueEnd
    let adjustedHue: number
    if (hcl.h >= hueStart) {
      adjustedHue = hcl.h - hueStart
    } else if (hcl.h <= hueEnd) {
      adjustedHue = (360 - hueStart) + hcl.h
    } else {
      // Outside the wrap-around range - determine which extreme is closer
      const distToStart = hcl.h - hueEnd
      const distToEnd = hueStart - hcl.h
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
 * Calculate the profundidade (contrast) position for a color comparison
 * Returns a value 0-100 representing position in the contrast scale (REVERSED: low contrast = 100, high contrast = 0)
 */
export const calculateProfundidadePosition = (
  colors1: string[],
  colors2: string[],
  extractedColors: { [key: string]: string },
  comparisonField?: string
): number => {
  // Get average lightness for each group
  const getAvgLightness = (fields: string[]) => {
    const validFields = fields.filter((f) => f in extractedColors)
    if (validFields.length === 0) return 0
    const properties = validFields.map((field) => getColorProperties(extractedColors[field]))
    const hclValues = properties.map((p) => p.lightness)
    return Math.round(hclValues.reduce((sum, l) => sum + l, 0) / properties.length)
  }

  const group1Lightness = getAvgLightness(colors1)
  const group2Lightness = getAvgLightness(colors2)

  // Calculate contrast ratio
  const contrastValue = group1Lightness !== 0 ? group2Lightness / group1Lightness : 0

  // Get field-specific range or use default
  let rangeMin: number = DEFAULT_RANGES.contrast.default.min
  let rangeMax: number = DEFAULT_RANGES.contrast.default.max

  if (comparisonField && comparisonField in DEFAULT_RANGES.contrast) {
    const fieldRange = DEFAULT_RANGES.contrast[comparisonField as keyof typeof DEFAULT_RANGES.contrast]
    if (fieldRange && typeof fieldRange === 'object' && 'min' in fieldRange && 'max' in fieldRange) {
      rangeMin = (fieldRange as { min: number; max: number }).min
      rangeMax = (fieldRange as { min: number; max: number }).max
    }
  }

  // Calculate marker position (REVERSED: high contrast (low ratio) = 0, low contrast (high ratio) = 100)
  let markerPosition: number
  if (contrastValue <= rangeMin) {
    markerPosition = 100
  } else if (contrastValue >= rangeMax) {
    markerPosition = 0
  } else {
    markerPosition = 100 - ((contrastValue - rangeMin) / (rangeMax - rangeMin)) * 100
  }

  return Math.round(markerPosition)
}
