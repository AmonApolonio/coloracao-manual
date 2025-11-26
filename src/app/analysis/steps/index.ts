// Color Extraction Step
export {
  InteractiveColorExtractionStep,
  type InteractiveColorExtractionStepHandle,
} from './color-extraction'

// Mask Analysis Step
export {
  MaskAnalysisStep,
  MaskCanvas,
  FacePositionerCanvas,
  type FacePositionerCanvasHandle,
  type MaskCanvasHandle,
} from './mask-analysis'

// Pigment Analysis Step
export {
  PigmentAnalysisStep,
  SliderStepComponent,
  ProfundidadeComparisonComponent,
  GeralSummaryComponent,
  ComparisonRowComponent,
  SliderWithAverageMarker,
} from './pigment-analysis'

// Shared utilities
export * from './shared'
