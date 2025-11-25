// ========== RE-EXPORTS FROM SEPARATE TYPE FILES ==========

// Core and database types
export type {
  ColorSeason,
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
