'use client'

import { use, useRef } from 'react'
import { Layout, Card, Spin } from 'antd'
import { type InteractiveColorExtractionStepHandle } from '../steps/color-extraction/InteractiveColorExtractionStep'
import { useAnalysisData, useAnalysisSave } from './hooks'
import { AnalysisHeader, StepContent } from './components'
import { AnalysisPageProps } from './types'

const { Content } = Layout

export default function AnalysisPage({ params }: AnalysisPageProps) {
  const { id: analysisId } = use(params)
  const colorExtractionRef = useRef<InteractiveColorExtractionStepHandle>(null)

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
  })

  if (loading) {
    return (
      <Layout className="min-h-screen bg-background">
        <div className="absolute inset-0 bg-white/50 rounded-lg flex items-center justify-center z-10">
          <Spin size="large" />
        </div>
      </Layout>
    )
  }

  if (!user || !analysis) {
    return (
      <Layout className="min-h-screen bg-background">
        <Content className="p-8">
          <Card>Análise não encontrada</Card>
        </Content>
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
          colorExtractionRef={colorExtractionRef}
          onSaveColorExtraction={handleSaveColorExtractionStep}
          onSaveOtherStep={handleSaveOtherStep}
          onSaveAndExit={handleSaveAndExit}
          onCompleteAnalysis={handleCompleteAnalysis}
        />

        {/* Step Content */}
        <div className="py-4">
          <StepContent
            currentStep={currentStep}
            saving={saving}
            user={user}
            analysis={analysis}
            colorExtractionRef={colorExtractionRef}
            pigmentAnalysisData={pigmentAnalysisData}
            maskAnalysisData={maskAnalysisData}
            onColorDataChange={handleColorDataChange}
            onSaveColorExtraction={handleSaveColorExtractionStep}
            onPigmentDataChange={handlePigmentDataChange}
            onMaskAnalysisDataChange={handleMaskAnalysisDataChange}
            onSubStepChange={(subStep: number) => setCurrentStep(subStep + 2)}
          />
        </div>
      </div>
    </Layout>
  )
}
