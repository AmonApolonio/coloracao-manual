'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { App as AntdApp } from 'antd'
import {
  updateAnalysisColorExtraction,
  updateAnalysisMaskData,
  updateAnalysisPigmentData,
  updateAnalysisColorSeason,
  saveAnalysisProgress,
  completeAnalysis,
} from '@/lib/supabase'
import { Analysis, AnalysisStatus } from '@/lib/types'
import { PigmentAnalysisDataDB, MaskAnalysisDataDB, ColorSeason } from '@/lib/types-db'
import { TOTAL_STEPS } from '../constants'

interface UseAnalysisSaveProps {
  analysis: Analysis | null
  setAnalysis: React.Dispatch<React.SetStateAction<Analysis | null>>
  currentStep: number
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>
  pigmentAnalysisData: PigmentAnalysisDataDB | null
  maskAnalysisData: MaskAnalysisDataDB | null
  colorSeason?: ColorSeason | null
  isReadOnly?: boolean
}

interface UseAnalysisSaveReturn {
  saving: boolean
  handleSaveColorExtractionStep: (svgVectorData: any) => Promise<void>
  handleSaveOtherStep: () => Promise<void>
  handleSaveAndExit: (svgVectorData: any) => Promise<void>
  handleCompleteAnalysis: (colorSeason?: ColorSeason | null) => Promise<void>
}

/**
 * Merge pigment analysis data: combine current step data with existing data
 */
const mergePigmentAnalysisData = (
  analysis: Analysis | null,
  currentStepIndex: number,
  newData: PigmentAnalysisDataDB
): PigmentAnalysisDataDB => {
  let merged = analysis?.analise_pigmentos ? { ...analysis.analise_pigmentos } : {}

  if (currentStepIndex === 1) {
    merged.temperatura = newData.temperatura
  } else if (currentStepIndex === 2) {
    merged.intensidade = newData.intensidade
  } else if (currentStepIndex === 3) {
    merged.profundidade = newData.profundidade
  } else if (currentStepIndex === 4) {
    merged.geral = newData.geral
  }

  return merged
}

export function useAnalysisSave({
  analysis,
  setAnalysis,
  currentStep,
  setCurrentStep,
  pigmentAnalysisData,
  maskAnalysisData,
  colorSeason,
  isReadOnly,
}: UseAnalysisSaveProps): UseAnalysisSaveReturn {
  const router = useRouter()
  const { message } = AntdApp.useApp()
  const [saving, setSaving] = useState(false)

  // Helper to check if save operations are allowed
  const canSave = () => {
    if (isReadOnly || analysis?.status === 'completed') {
      message.warning('Esta análise já foi concluída e não pode ser alterada.')
      return false
    }
    return true
  }

  // Save handler for step 0 (Color Extraction)
  const handleSaveColorExtractionStep = async (svgVectorData: any) => {
    if (!analysis || !canSave()) return

    try {
      setSaving(true)

      await updateAnalysisColorExtraction(analysis.id, svgVectorData, currentStep)

      setAnalysis({
        ...analysis,
        current_step: currentStep + 1,
        extracao: svgVectorData,
        status: 'in_process',
      })

      if (currentStep < TOTAL_STEPS - 1) {
        setCurrentStep(currentStep + 1)
      }

      message.success('Progresso salvo!')
    } catch (error) {
      console.error('Error saving step:', error)
      message.error('Erro ao salvar progresso')
      throw error
    } finally {
      setSaving(false)
    }
  }

  // Generic save handler for other steps (steps 1-6)
  const handleSaveOtherStep = async () => {
    if (!analysis || !canSave()) return

    try {
      setSaving(true)

      // Save mask analysis data if we're in mask analysis step (1)
      if (currentStep === 1 && maskAnalysisData) {
        await updateAnalysisMaskData(analysis.id, maskAnalysisData, currentStep)
      }
      // Save pigment analysis data if we're in pigment steps (2-5)
      else if (currentStep >= 2 && currentStep <= 5 && pigmentAnalysisData) {
        const mergedData = mergePigmentAnalysisData(analysis, currentStep - 1, pigmentAnalysisData)
        await updateAnalysisPigmentData(analysis.id, mergedData, currentStep)
      }
      // Save color_season if we're in final classification step (6)
      else if (currentStep === 6 && colorSeason) {
        await updateAnalysisColorSeason(analysis.id, colorSeason)
      }

      setAnalysis({
        ...analysis,
        current_step: currentStep === 6 ? currentStep : currentStep + 1,
        status: 'in_process',
        color_season: colorSeason || null,
        analise_pigmentos: pigmentAnalysisData || undefined,
      })

      if (currentStep < TOTAL_STEPS - 1 && currentStep !== 6) {
        setCurrentStep(currentStep + 1)
      }

      message.success('Progresso salvo!')
    } catch (error) {
      console.error('Error saving step:', error)
      message.error('Erro ao salvar progresso')
      throw error
    } finally {
      setSaving(false)
    }
  }

  // Save and exit handler
  const handleSaveAndExit = async (svgVectorData: any) => {
    if (!analysis) return

    // For read-only mode, just navigate without saving
    if (isReadOnly || analysis?.status === 'completed') {
      router.push('/')
      return
    }

    try {
      setSaving(true)

      const updateData: any = {}

      if (currentStep === 0) {
        updateData.extracao = svgVectorData
      }

      if (currentStep === 1 && maskAnalysisData) {
        updateData.analise_mascaras = maskAnalysisData
      }

      if (currentStep >= 2 && currentStep <= 5 && pigmentAnalysisData) {
        const mergedData = mergePigmentAnalysisData(analysis, currentStep - 1, pigmentAnalysisData)
        updateData.analise_pigmentos = mergedData
      }

      await saveAnalysisProgress(analysis.id, currentStep, updateData)

    } catch (error) {
      console.error('Error saving:', error)
      message.error('Erro ao salvar dados')
      throw error
    } finally {
      setSaving(false)
    }
  }

  // Complete analysis handler
  const handleCompleteAnalysis = async (finalColorSeason?: ColorSeason | null) => {
    if (!analysis || !canSave()) return

    try {
      setSaving(true)

      await completeAnalysis(analysis.id, finalColorSeason)

      message.success('Análise concluída com sucesso!')
      setTimeout(() => router.push('/'), 1500)
    } catch (error) {
      console.error('Error completing analysis:', error)
      message.error('Erro ao concluir análise')
    } finally {
      setSaving(false)
    }
  }

  return {
    saving,
    handleSaveColorExtractionStep,
    handleSaveOtherStep,
    handleSaveAndExit,
    handleCompleteAnalysis,
  }
}
