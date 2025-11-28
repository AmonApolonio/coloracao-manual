'use client'

import { use, useRef, useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import { Layout, Spin } from 'antd'
import { ColorSeason } from '@/lib/types-db'
import { type InteractiveColorExtractionStepHandle } from '../steps/color-extraction/InteractiveColorExtractionStep'
import { useAnalysisData, useAnalysisSave } from './hooks'
import { AnalysisHeader, StepContent } from './components'
import { AnalysisPageProps } from './types'

const { Content } = Layout

export default function AnalysisPage({ params }: AnalysisPageProps) {
  const { id: analysisId } = use(params)
  const colorExtractionRef = useRef<InteractiveColorExtractionStepHandle>(null)
  const [selectedColorSeason, setSelectedColorSeason] = useState<ColorSeason | null>(null)

  // Load and manage analysis data
  const {
    user,
    analysis,
    setAnalysis,
    currentStep,
    setCurrentStep,
    loading,
    allColorsExtracted,
    extractedColorsCount,
    extractedColors,
    pigmentAnalysisData,
    maskAnalysisData,
    handleColorDataChange,
    handlePigmentDataChange,
    handleMaskAnalysisDataChange,
  } = useAnalysisData(analysisId)

  // Determine if analysis is read-only (completed status)
  const isReadOnly = analysis?.status === 'completed'

  // Initialize selected color season from analysis if available
  if (analysis?.color_season && !selectedColorSeason) {
    setSelectedColorSeason(analysis.color_season)
  }

  // Save operations
  const {
    saving,
    handleSaveColorExtractionStep,
    handleSaveOtherStep,
    handleSaveAndExit,
    handleCompleteAnalysis,
  } = useAnalysisSave({
    analysis,
    setAnalysis,
    currentStep,
    setCurrentStep,
    pigmentAnalysisData,
    maskAnalysisData,
    colorSeason: selectedColorSeason,
    isReadOnly,
  })

  // Trigger 404 page when analysis is not found after loading completes
  useEffect(() => {
    if (!loading && (!user || !analysis)) {
      notFound()
    }
  }, [loading, user, analysis])

  if (loading || !user || !analysis) {
    return (
      <Layout className="min-h-screen bg-background">
        <div className="absolute inset-0 bg-white/50 rounded-lg flex items-center justify-center z-10">
          <Spin size="large" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout className="min-h-screen bg-background">
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Sticky Header */}
        <AnalysisHeader
          user={user}
          analysis={analysis}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          saving={saving}
          allColorsExtracted={allColorsExtracted}
          extractedColorsCount={extractedColorsCount}
          extractedColors={extractedColors}
          pigmentAnalysisData={pigmentAnalysisData}
          maskAnalysisData={maskAnalysisData}
          selectedColorSeason={selectedColorSeason}
          colorExtractionRef={colorExtractionRef}
          onSaveColorExtraction={handleSaveColorExtractionStep}
          onSaveOtherStep={handleSaveOtherStep}
          onSaveAndExit={handleSaveAndExit}
          onCompleteAnalysis={handleCompleteAnalysis}
          isReadOnly={isReadOnly}
        />

        {/* Step Content */}
        <div className="py-4">
          <StepContent
            currentStep={currentStep}
            saving={saving}
            user={user}
            analysis={analysis}
            extractedColors={extractedColors}
            selectedColorSeason={selectedColorSeason}
            colorExtractionRef={colorExtractionRef}
            pigmentAnalysisData={pigmentAnalysisData}
            maskAnalysisData={maskAnalysisData}
            onColorDataChange={handleColorDataChange}
            onSaveColorExtraction={handleSaveColorExtractionStep}
            onPigmentDataChange={handlePigmentDataChange}
            onMaskAnalysisDataChange={handleMaskAnalysisDataChange}
            onColorSeasonChange={setSelectedColorSeason}
            onSubStepChange={(subStep: number) => setCurrentStep(subStep + 2)}
            isReadOnly={isReadOnly}
          />
        </div>
      </div>
    </Layout>
  )
}
