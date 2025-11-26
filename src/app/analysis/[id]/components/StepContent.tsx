'use client'

import { RefObject } from 'react'
import { Card, Spin } from 'antd'
import { User, Analysis, SVGVectorData } from '@/lib/types'
import { PigmentAnalysisDataDB, MaskAnalysisDataDB } from '@/lib/types-db'
import InteractiveColorExtractionStep, { type InteractiveColorExtractionStepHandle } from '../../steps/color-extraction/InteractiveColorExtractionStep'
import PigmentAnalysisStep from '../../steps/pigment-analysis/PigmentAnalysisStep'
import MaskAnalysisStep from '../../steps/mask-analysis/MaskAnalysisStep'

interface StepContentProps {
  currentStep: number
  saving: boolean
  user: User
  analysis: Analysis
  colorExtractionRef: RefObject<InteractiveColorExtractionStepHandle | null>
  pigmentAnalysisData: PigmentAnalysisDataDB | null
  maskAnalysisData: MaskAnalysisDataDB | null
  onColorDataChange: (svgVectorData: SVGVectorData) => void
  onSaveColorExtraction: (svgVectorData: any) => Promise<void>
  onPigmentDataChange: (data: PigmentAnalysisDataDB) => void
  onMaskAnalysisDataChange: (data: MaskAnalysisDataDB) => void
  onSubStepChange: (subStep: number) => void
}

export function StepContent({
  currentStep,
  saving,
  user,
  analysis,
  colorExtractionRef,
  pigmentAnalysisData,
  maskAnalysisData,
  onColorDataChange,
  onSaveColorExtraction,
  onPigmentDataChange,
  onMaskAnalysisDataChange,
  onSubStepChange,
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
        <Card className="border-secondary border-2">
          <h2 className="text-xl font-bold text-secondary mb-4">Classificação Final</h2>
          <div className="text-center py-12 text-gray-400">
            <p>Próximas etapas em desenvolvimento...</p>
          </div>
        </Card>
      )}
    </div>
  )
}
