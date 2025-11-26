'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { App as AntdApp } from 'antd'
import { supabase } from '@/lib/supabase'
import { Analysis, AnalysisStatus } from '@/lib/types'
import { PigmentAnalysisDataDB, MaskAnalysisDataDB } from '@/lib/types-db'
import { TOTAL_STEPS } from '../constants'

interface UseAnalysisSaveProps {
  analysis: Analysis | null
  setAnalysis: React.Dispatch<React.SetStateAction<Analysis | null>>
  currentStep: number
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>
  pigmentAnalysisData: PigmentAnalysisDataDB | null
  maskAnalysisData: MaskAnalysisDataDB | null
}

interface UseAnalysisSaveReturn {
  saving: boolean
  handleSaveColorExtractionStep: (svgVectorData: any) => Promise<void>
  handleSaveOtherStep: () => Promise<void>
  handleSaveAndExit: (svgVectorData: any) => Promise<void>
  handleCompleteAnalysis: () => Promise<void>
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
}: UseAnalysisSaveProps): UseAnalysisSaveReturn {
  const router = useRouter()
  const { message } = AntdApp.useApp()
  const [saving, setSaving] = useState(false)

  // Save handler for step 0 (Color Extraction)
  const handleSaveColorExtractionStep = async (svgVectorData: any) => {
    if (!analysis) return

    try {
      setSaving(true)

      const updatePayload: any = {
        current_step: currentStep + 1,
        status: 'in_process' as AnalysisStatus,
        updated_at: new Date().toISOString(),
        extracao: svgVectorData,
      }

      const { error } = await supabase
        .from('analyses')
        .update(updatePayload)
        .eq('id', analysis.id)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

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
    if (!analysis) return

    try {
      setSaving(true)

      const updatePayload: any = {
        current_step: currentStep + 1,
        status: 'in_process' as AnalysisStatus,
        updated_at: new Date().toISOString(),
      }

      // Save mask analysis data if we're in mask analysis step (1)
      if (currentStep === 1 && maskAnalysisData) {
        updatePayload.analise_mascaras = maskAnalysisData
      }

      // Save pigment analysis data if we're in pigment steps (2-5)
      if (currentStep >= 2 && currentStep <= 5 && pigmentAnalysisData) {
        const mergedData = mergePigmentAnalysisData(analysis, currentStep - 1, pigmentAnalysisData)
        updatePayload.analise_pigmentos = mergedData
      }

      const { error } = await supabase
        .from('analyses')
        .update(updatePayload)
        .eq('id', analysis.id)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      setAnalysis({
        ...analysis,
        current_step: currentStep + 1,
        status: 'in_process',
        analise_pigmentos: updatePayload.analise_pigmentos,
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

  // Save and exit handler
  const handleSaveAndExit = async (svgVectorData: any) => {
    if (!analysis) return

    try {
      setSaving(true)

      const updatePayload: any = {
        current_step: currentStep + 1,
        status: 'in_process' as AnalysisStatus,
        updated_at: new Date().toISOString(),
      }

      if (currentStep === 0) {
        updatePayload.extracao = svgVectorData
      }

      if (currentStep === 1 && maskAnalysisData) {
        updatePayload.analise_mascaras = maskAnalysisData
      }

      if (currentStep >= 2 && currentStep <= 5 && pigmentAnalysisData) {
        const mergedData = mergePigmentAnalysisData(analysis, currentStep - 1, pigmentAnalysisData)
        updatePayload.analise_pigmentos = mergedData
      }

      const { error } = await supabase
        .from('analyses')
        .update(updatePayload)
        .eq('id', analysis.id)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      message.success('Dados salvos!')
    } catch (error) {
      console.error('Error saving:', error)
      message.error('Erro ao salvar dados')
      throw error
    } finally {
      setSaving(false)
    }
  }

  // Complete analysis handler
  const handleCompleteAnalysis = async () => {
    if (!analysis) return

    try {
      setSaving(true)

      const { error } = await supabase
        .from('analyses')
        .update({
          status: 'completed' as AnalysisStatus,
          current_step: 6,
          analyzed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', analysis.id)

      if (error) throw error

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
