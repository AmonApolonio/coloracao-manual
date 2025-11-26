// ========== RE-EXPORTS FROM SEPARATE TYPE FILES ==========

// Season types
export type { Season, SeasonVariant, ColorSeason } from './types-season'
export { SEASON_VARIANTS, getColorSeason, getSeasonFromColorSeason, getVariantFromColorSeason } from './types-season'

// Core and database types
export type {
  AnalysisStatus,
  ColorField,
  SVGVector,
  SVGVectorData,
  PigmentAnalysisDataDB,
  User,
  Analysis,
  UserWithAnalysis,
} from './types-db'

// UI types
export type {
  PigmentTemperatureDataUI,
  ProfundidadeComparisonUI,
  PigmentAnalysisDataUI,
} from './types-ui'

// Backward compatibility alias
export type { PigmentAnalysisDataDB as PigmentAnalysisData } from './types-db'
