'use client'

import { RefObject } from 'react'
import { Card, Spin } from 'antd'
import { User, Analysis, SVGVectorData } from '@/lib/types'
import { PigmentAnalysisDataDB, MaskAnalysisDataDB, ColorSeason } from '@/lib/types-db'
import InteractiveColorExtractionStep, { type InteractiveColorExtractionStepHandle } from '../../steps/color-extraction/InteractiveColorExtractionStep'
import PigmentAnalysisStep from '../../steps/pigment-analysis/PigmentAnalysisStep'
import MaskAnalysisStep from '../../steps/mask-analysis/MaskAnalysisStep'
import { FinalClassificationStep } from '../../steps/final-classification'

interface StepContentProps {
  currentStep: number
  saving: boolean
  user: User
  analysis: Analysis
  colorExtractionRef: RefObject<InteractiveColorExtractionStepHandle | null>
  pigmentAnalysisData: PigmentAnalysisDataDB | null
  maskAnalysisData: MaskAnalysisDataDB | null
  extractedColors: { [key: string]: string }
  selectedColorSeason: ColorSeason | null | undefined
  onColorDataChange: (svgVectorData: SVGVectorData) => void
  onSaveColorExtraction: (svgVectorData: any) => Promise<void>
  onPigmentDataChange: (data: PigmentAnalysisDataDB) => void
  onMaskAnalysisDataChange: (data: MaskAnalysisDataDB) => void
  onSubStepChange: (subStep: number) => void
  onColorSeasonChange: (season: ColorSeason) => void
}

export function StepContent({
  currentStep,
  saving,
  user,
  analysis,
  colorExtractionRef,
  pigmentAnalysisData,
  maskAnalysisData,
  extractedColors,
  selectedColorSeason,
  onColorDataChange,
  onSaveColorExtraction,
  onPigmentDataChange,
  onMaskAnalysisDataChange,
  onSubStepChange,
  onColorSeasonChange,
}: StepContentProps) {
  return (
    <div className="relative">
      {saving && (
        <div className="absolute inset-0 bg-white/50 rounded-lg flex items-center justify-center z-10">
          <Spin size="large" />
        </div>
      )}

      {currentStep === 0 && (
        <InteractiveColorExtractionStep
          ref={colorExtractionRef}
          userFacePhotoUrl={user.face_photo_url}
          userEyePhotoUrl={user.eye_photo_url}
          onSave={onSaveColorExtraction}
          initialData={analysis.extracao as SVGVectorData}
          onDataChange={onColorDataChange}
        />
      )}

      {currentStep === 1 && (
        <MaskAnalysisStep
          userFacePhotoUrl={user.face_photo_url}
          savedData={maskAnalysisData || undefined}
          onDataChange={onMaskAnalysisDataChange}
        />
      )}

      {(currentStep === 2 || currentStep === 3 || currentStep === 4 || currentStep === 5) && (
        <PigmentAnalysisStep
          initialData={analysis.extracao as SVGVectorData}
          userFacePhotoUrl={user.face_photo_url || undefined}
          currentSubStep={currentStep - 2}
          savedAnalysisData={pigmentAnalysisData || undefined}
          onDataChange={onPigmentDataChange}
          onSubStepChange={onSubStepChange}
        />
      )}

      {currentStep === 6 && (
        <FinalClassificationStep
          initialData={analysis.extracao as SVGVectorData}
          userFacePhotoUrl={user.face_photo_url || undefined}
          pigmentAnalysisData={pigmentAnalysisData || undefined}
          maskAnalysisData={maskAnalysisData || undefined}
          extractedColors={extractedColors}
          selectedColorSeason={selectedColorSeason}
          onColorSeasonChange={onColorSeasonChange}
        />
      )}
    </div>
  )
}
