// Color conversion utilities
export {
  hexToRgb,
  rgbToHsl,
  rgbToHsv,
  rgbToLab,
  labToHcl,
  getColorProperties,
} from './colorConversion'

// Pigment analysis utilities
export {
  COLOR_FIELDS,
  TEMPERATURE_RANGES,
  INTENSIDADE_RANGES,
  PROFUNDIDADE_RANGES,
  ANALYSIS_STEPS,
  getLabelCategory,
  getLabelColor,
} from './PigmentAnalysisUtils'

// Season detection utilities
export {
  detectSeason,
  getSeasonVariants,
  getSeasonColors,
  detectSeasonFromSliders,
} from './seasonDetection'
export type { SeasonResult } from './seasonDetection'
