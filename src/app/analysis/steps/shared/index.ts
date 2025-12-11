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
  TEMPERATURE_RANGES,
  INTENSIDADE_RANGES,
  ANALYSIS_STEPS,
  getLabelCategory,
  getLabelColor,
} from './PigmentAnalysisUtils'

// Profundidade utilities
export {
  PROFUNDIDADE_RANGES,
  CONTRAST_RANGES,
  getProfundidadeExtremosData,
  calculateProfundidadeFromContrast,
  getProfundidadeCalculationDetails,
} from './profundidadeUtils'

// Season detection utilities
export {
  detectSeason,
  getSeasonVariants,
  getSeasonColors,
  detectSeasonFromSliders,
} from './seasonDetection'
export type { SeasonResult } from './seasonDetection'
