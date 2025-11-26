import { User, Analysis, SVGVectorData } from '@/lib/types'
import { PigmentAnalysisDataDB, MaskAnalysisDataDB } from '@/lib/types-db'

export interface AnalysisPageProps {
  params: Promise<{
    id: string
  }>
}

export interface AnalysisState {
  user: User | null
  analysis: Analysis | null
  currentStep: number
  loading: boolean
  saving: boolean
  allColorsExtracted: boolean
  extractedColorsCount: number
  extractedColors: { [key: string]: string }
  pigmentAnalysisData: PigmentAnalysisDataDB | null
  maskAnalysisData: MaskAnalysisDataDB | null
}

export interface StepMapping {
  mainStep: number
  subStep: number
}
