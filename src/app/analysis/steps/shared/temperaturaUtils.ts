import { getHsvFromHex } from './colorConversion'
import { DEFAULT_RANGES, ColorFieldKey, round2Decimals } from './PigmentAnalysisUtils'

/**
 * Temperatura (Temperature/Hue) Analysis Utilities
 * Centralizes all calculations related to temperatura/hue analysis
 */

export const TEMPERATURE_RANGES = [
  { min: 0, max: 12.5, label: 'Extremo Frio', color: '#8b5cf6' },
  { min: 12.5, max: 47, label: 'Neutro Frio', color: '#3b82f6' },
  { min: 47, max: 53, label: 'Neutro Puro', color: '#33d221' },
  { min: 53, max: 87.5, label: 'Neutro Quente', color: '#f97316' },
  { min: 87.5, max: 100, label: 'Extremo Quente', color: '#dc2626' },
]

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
 * Returns a value 0-100 representing position in the hue scale (rounded to 2 decimal places)
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
      huePosition = round2Decimals(((hsv.h - hueStart) / (hueEnd - hueStart)) * 100)
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
    huePosition = Math.max(0, Math.min(100, round2Decimals((adjustedHue / range) * 100)))
  }

  // Apply saturation influence: lower saturation shifts temperature towards colder (lower values)
  const adjustedTemperatura = applySaturationInfluence(huePosition, hsv.s)
  
  return round2Decimals(adjustedTemperatura)
}

/**
 * Get detailed calculation breakdown for temperatura positioning
 * Returns all intermediate values used in the calculation for display/debugging (with 2 decimal places)
 */
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
      huePosition = round2Decimals(((hsv.h - hueStart) / (hueEnd - hueStart)) * 100)
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
    huePosition = Math.max(0, Math.min(100, round2Decimals((adjustedHue / range) * 100)))
  }

  // Calculate saturation adjustment
  const maxReduction = 40
  const ratioS = hsv.s <= 30 ? (30 - hsv.s) / 30 : 0
  const saturationAdjustment = round2Decimals(ratioS * maxReduction)
  const adjustedTemperatura = Math.max(0, huePosition - saturationAdjustment)
  const finalValue = round2Decimals(adjustedTemperatura)

  return {
    actualHue: round2Decimals(hsv.h),
    hueStart,
    hueEnd,
    remappedValue: huePosition,
    saturation: round2Decimals(hsv.s),
    saturationAdjustment,
    finalValue,
  }
}
