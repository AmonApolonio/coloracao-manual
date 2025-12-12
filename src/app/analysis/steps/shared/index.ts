// Color conversion utilities
export {
  hexToRgb,
  rgbToHsl,
  rgbToHsv,
  rgbToLab,
  rgbToXyz,
  xyzToLab,
  labToHcl,
  hclToLab,
  labToXyz,
  xyzToRgb,
  labToRgb,
  rgbToHex,
  hclToHex,
  generateHueScale,
  generateChromaScale,
  getHclFromHex,
  getColorProperties,
} from './colorConversion'

// Pigment analysis utilities
export {
  COLOR_FIELDS,
  ANALYSIS_STEPS,
  getLabelCategory,
  getLabelColor,
} from './PigmentAnalysisUtils'

// Temperatura utilities
export {
  TEMPERATURE_RANGES,
  calculateTemperaturaPosition,
  getTemperaturaCalculationDetails,
} from './temperaturaUtils'
export type { TemperaturaCalculationDetails } from './temperaturaUtils'

// Intensidade utilities
export {
  INTENSIDADE_RANGES,
  calculateIntensidadePosition,
  getIntensidadeCalculationDetails,
} from './intensidadeUtils'
export type { IntensidadeCalculationDetails } from './intensidadeUtils'

// Profundidade utilities
export {
  PROFUNDIDADE_RANGES,
  CONTRAST_RANGES,
  getProfundidadeExtremosData,
  calculateProfundidadeMathematically,
} from './profundidadeUtils'

// Season detection utilities
export {
  detectSeason,
  getSeasonVariants,
  getSeasonColors,
  detectSeasonFromSliders,
} from './seasonDetection'
export type { SeasonResult } from './seasonDetection'
