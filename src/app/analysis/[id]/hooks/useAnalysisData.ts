'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { App as AntdApp } from 'antd'
import { fetchAnalysisById, fetchUserById } from '@/lib/supabase'
import { User, Analysis, SVGVectorData } from '@/lib/types'
import { PigmentAnalysisDataDB, MaskAnalysisDataDB } from '@/lib/types-db'
import { isAllColorsExtracted, extractColorsFromData } from '../utils'

interface UseAnalysisDataReturn {
  user: User | null
  analysis: Analysis | null
  setAnalysis: React.Dispatch<React.SetStateAction<Analysis | null>>
  currentStep: number
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>
  loading: boolean
  allColorsExtracted: boolean
  setAllColorsExtracted: React.Dispatch<React.SetStateAction<boolean>>
  extractedColorsCount: number
  setExtractedColorsCount: React.Dispatch<React.SetStateAction<number>>
  extractedColors: { [key: string]: string }
  setExtractedColors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>
  pigmentAnalysisData: PigmentAnalysisDataDB | null
  setPigmentAnalysisData: React.Dispatch<React.SetStateAction<PigmentAnalysisDataDB | null>>
  maskAnalysisData: MaskAnalysisDataDB | null
  setMaskAnalysisData: React.Dispatch<React.SetStateAction<MaskAnalysisDataDB | null>>
  handleColorDataChange: (svgVectorData: SVGVectorData) => void
  handlePigmentDataChange: (data: PigmentAnalysisDataDB) => void
  handleMaskAnalysisDataChange: (data: MaskAnalysisDataDB) => void
}

export function useAnalysisData(analysisId: string): UseAnalysisDataReturn {
  const router = useRouter()
  const { message } = AntdApp.useApp()
  
  const [user, setUser] = useState<User | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [allColorsExtracted, setAllColorsExtracted] = useState(false)
  const [extractedColorsCount, setExtractedColorsCount] = useState(0)
  const [extractedColors, setExtractedColors] = useState<{ [key: string]: string }>({})
  const [pigmentAnalysisData, setPigmentAnalysisData] = useState<PigmentAnalysisDataDB | null>(null)
  const [maskAnalysisData, setMaskAnalysisData] = useState<MaskAnalysisDataDB | null>(null)

  // Initialize allColorsExtracted based on existing data
  useEffect(() => {
    if (analysis?.extracao) {
      const isExtracted = isAllColorsExtracted(analysis.extracao as SVGVectorData)
      setAllColorsExtracted(isExtracted)
      const svgData = analysis.extracao as SVGVectorData
      const count = Object.keys(svgData).length
      setExtractedColorsCount(count)
      const colors = extractColorsFromData(svgData)
      setExtractedColors(colors)
    }
  }, [analysis?.id])

  // Color data change handler
  const handleColorDataChange = useCallback((svgVectorData: SVGVectorData) => {
    const extracted = isAllColorsExtracted(svgVectorData)
    setAllColorsExtracted(extracted)
    const count = Object.keys(svgVectorData).length
    setExtractedColorsCount(count)
    const colors = extractColorsFromData(svgVectorData)
    setExtractedColors(colors)
  }, [])

  // Pigment data change handler
  const handlePigmentDataChange = useCallback((data: PigmentAnalysisDataDB) => {
    setPigmentAnalysisData(data)
  }, [])

  // Mask analysis data change handler
  const handleMaskAnalysisDataChange = useCallback((data: MaskAnalysisDataDB) => {
    setMaskAnalysisData(data)
  }, [])

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Fetch analysis
        const analysisData = await fetchAnalysisById(analysisId)

        if (!analysisData) {
          message.error('Análise não encontrada')
          router.push('/')
          return
        }

        setAnalysis(analysisData)

        // Fetch user
        const userData = await fetchUserById(analysisData.user_id)

        if (userData) {
          setUser(userData)
        }

        // Load pigment analysis data if it exists
        if (analysisData.analise_pigmentos) {
          setPigmentAnalysisData(analysisData.analise_pigmentos)
        }

        // Load mask analysis data if it exists
        if (analysisData.analise_mascaras) {
          setMaskAnalysisData(analysisData.analise_mascaras)
        }

        // Set current step from analysis
        setCurrentStep(analysisData.current_step - 1)
      } catch (error) {
        console.error('Error loading data:', error)
        message.error('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [analysisId, message, router])

  return {
    user,
    analysis,
    setAnalysis,
    currentStep,
    setCurrentStep,
    loading,
    allColorsExtracted,
    setAllColorsExtracted,
    extractedColorsCount,
    setExtractedColorsCount,
    extractedColors,
    setExtractedColors,
    pigmentAnalysisData,
    setPigmentAnalysisData,
    maskAnalysisData,
    setMaskAnalysisData,
    handleColorDataChange,
    handlePigmentDataChange,
    handleMaskAnalysisDataChange,
  }
}
