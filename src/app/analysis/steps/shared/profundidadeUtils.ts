
import {  round2Decimals } from './PigmentAnalysisUtils'

/**
 * Profundidade (Depth) Analysis Utilities
 * Centralizes all calculations, constants, and interfaces related to profundidade analysis
 */

// Profundidade classification ranges
export const PROFUNDIDADE_RANGES = [
  { min: 0, max: 12.5, label: 'Extremo Escuro', color: '#8b5cf6' },
  { min: 12.5, max: 47, label: 'Neutro Escuro', color: '#3b82f6' },
  { min: 47, max: 53, label: 'Neutro Puro', color: '#33d221' },
  { min: 53, max: 87.5, label: 'Neutro Claro', color: '#f97316' },
  { min: 87.5, max: 100, label: 'Extremo Claro', color: '#dc2626' },
]

// Contrast classification ranges
export const CONTRAST_RANGES = [
  { min: 0, max: 30, label: 'baixo' },
  { min: 30, max: 65, label: 'medio' },
  { min: 65, max: 100, label: 'alto' },
]

/**
 * Interface for lightness data of a color field
 */
export interface ColorLightnessData {
  field: string
  hex: string
  lightness: number
  label: string
}

/**
 * Get extremos data for profundidade (min/max lightness values)
 */
export interface ProfundidadeExtremosData {
  minLightness: number
  maxLightness: number
  lightnessDifference: number
  darkestColor: ColorLightnessData | undefined
  lightestColor: ColorLightnessData | undefined
}

/**
 * Get extremos data for profundidade (min/max lightness values)
 */
export const getProfundidadeExtremosData = (
  colorLightnessData: ColorLightnessData[]
): ProfundidadeExtremosData => {
  const minLightness = colorLightnessData.length > 0
    ? Math.min(...colorLightnessData.map((c) => c.lightness))
    : 0
  const maxLightness = colorLightnessData.length > 0
    ? Math.max(...colorLightnessData.map((c) => c.lightness))
    : 100
  const lightnessDifference = maxLightness - minLightness

  const darkestColor = colorLightnessData.find((c) => c.lightness === minLightness)
  const lightestColor = colorLightnessData.find((c) => c.lightness === maxLightness)

  return {
    minLightness,
    maxLightness,
    lightnessDifference,
    darkestColor,
    lightestColor,
  }
}

/**
 * Get the contrast range that contains the given value
 */
const getContrastRange = (lightnessDifference: number): { min: number; max: number; label: string } => {
  for (const range of CONTRAST_RANGES) {
    if (lightnessDifference >= range.min && lightnessDifference <= range.max) {
      return range
    }
  }
  return CONTRAST_RANGES[1] // Default to Médio
}

/**
 * Map a value from one range to another (linear interpolation with 2 decimal precision)
 */
const mapRange = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number => {
  // Clamp the input value to the input range
  const clampedValue = Math.max(inMin, Math.min(inMax, value))
  // Calculate the ratio in the input range
  const ratio = round2Decimals((clampedValue - inMin) / (inMax - inMin))
  // Map to the output range
  const result = outMin + ratio * (outMax - outMin)
  return round2Decimals(result)
}

/**
 * Range mapping type for profundidade calculations
 */
interface RangeMapping {
  outMin: number
  outMax: number
  inMin: number
  inMax: number
}

/**
 * Mapping table for profundidade calculation
 * Defines input/output ranges for each contrast level and luminosity threshold
 * Format: { maxLuminosity, Alto, Médio, Baixo }
 * Each contrast level value: { outMin, outMax, inMin, inMax }
 */
const PROFUNDIDADE_MAPPING: Array<{
  maxLuminosity: number
  alto: RangeMapping
  medio: RangeMapping
  baixo: RangeMapping
}> = [
  {
    maxLuminosity: 12.5,
    alto: { outMin: 0, outMax: 12.5, inMin: 0, inMax: 12.5 },
    medio: { outMin: 0, outMax: 12.5, inMin: 0, inMax: 12.5 },
    baixo: { outMin: 53, outMax: 87.5, inMin: 0, inMax: 12.5 },
  },
  {
    maxLuminosity: 47,
    alto: { outMin: 0, outMax: 12.5, inMin: 12.5, inMax: 47 },
    medio: { outMin: 12.5, outMax: 47, inMin: 12.5, inMax: 47 },
    baixo: { outMin: 53, outMax: 87.5, inMin: 12.5, inMax: 47 },
  },
  {
    maxLuminosity: 87.5,
    alto: { outMin: 12.5, outMax: 47, inMin: 53, inMax: 87.5 },
    medio: { outMin: 53, outMax: 87.5, inMin: 53, inMax: 87.5 },
    baixo: { outMin: 87.5, outMax: 100, inMin: 53, inMax: 87.5 },
  },
  {
    maxLuminosity: 100,
    alto: { outMin: 12.5, outMax: 47, inMin: 87.5, inMax: 100 },
    medio: { outMin: 87.5, outMax: 100, inMin: 87.5, inMax: 100 },
    baixo: { outMin: 87.5, outMax: 100, inMin: 87.5, inMax: 100 },
  },
]

/**
 * Calculate profundidade mathematically based on contrast and luminosity
 *
 * The logic follows this mapping:
 * | Contraste | Luminosidade | Profundidade |
 * |    65-100 |       0-12.5 |       0-12.5 |
 * |    65-100 |      12.5-47 |       0-12.5 |
 * |    65-100 |      53-87.5 |      12.5-47 |
 * |    65-100 |     87.5-100 |      12.5-47 |
 * |     30-65 |       0-12.5 |       0-12.5 |
 * |     30-65 |      12.5-47 |      12.5-47 |
 * |     30-65 |      53-87.5 |      53-87.5 |
 * |     30-65 |     87.5-100 |     87.5-100 |
 * |      0-30 |       0-12.5 |      53-87.5 |
 * |      0-30 |      12.5-47 |      53-87.5 |
 * |      0-30 |      53-87.5 |     87.5-100 |
 * |      0-30 |     87.5-100 |     87.5-100 |
 */

/**
 * Calculate profundidade based on contrast (lightness difference) and luminosity (average lightness)
 * Uses mathematical interpolation to map contrast/luminosity combinations to profundidade ranges (0-100)
 * Returns value rounded to 2 decimal places with precision
 *
 * The formula uses linear interpolation within ranges defined by CONTRAST_RANGES
 * and maps luminosity to appropriate profundidade output ranges.
 */
export const calculateProfundidadeMathematically = (
  lightnessDifference: number,
  luminosidadeMedia: number
): number => {
  const contrastLabel = getContrastRange(lightnessDifference).label as 'alto' | 'medio' | 'baixo'

  // Find the mapping entry that matches the luminosity threshold
  const mappingEntry = PROFUNDIDADE_MAPPING.find(
    (entry) => luminosidadeMedia <= entry.maxLuminosity
  ) || PROFUNDIDADE_MAPPING[PROFUNDIDADE_MAPPING.length - 1]

  // Get the range mapping for this contrast level
  const rangeMapping = mappingEntry[contrastLabel]

  // Calculate and return the profundidade value
  const profundidade = mapRange(
    luminosidadeMedia,
    rangeMapping.inMin,
    rangeMapping.inMax,
    rangeMapping.outMin,
    rangeMapping.outMax
  )

  return profundidade
}
