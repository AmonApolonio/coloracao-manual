'use client'

import { useState, useEffect, use, useRef, useCallback } from 'react'
import { Layout, Card, Steps, Button, Space, Spin, Badge, Tooltip, App as AntdApp } from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined, SaveOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, Analysis, AnalysisStatus, SVGVectorData } from '@/lib/types'
import { PigmentAnalysisDataDB, MaskAnalysisDataDB } from '@/lib/types-db'
import InteractiveColorExtractionStep, { type InteractiveColorExtractionStepHandle } from '../steps/InteractiveColorExtractionStep'
import PigmentAnalysisStep from '../steps/PigmentAnalysisStep'
import MaskAnalysisStep from '../steps/MaskAnalysisStep'

const { Content } = Layout

const MAIN_ANALYSIS_STEPS = [
  { title: 'Extração de Cor', key: 'color-extraction' },
  { title: 'Análise das Máscaras', key: 'mask-analysis' },
  { title: 'Análise dos Pigmentos', key: 'pigment-analysis' },
  { title: 'Classificação Final', key: 'final-classification' },
]

// Map global step index to main step and sub-step
const getStepMapping = (globalStep: number) => {
  if (globalStep === 0) return { mainStep: 0, subStep: -1 }
  if (globalStep === 1) return { mainStep: 1, subStep: -1 }
  if (globalStep >= 2 && globalStep <= 5) return { mainStep: 2, subStep: globalStep - 2 }
  if (globalStep === 6) return { mainStep: 3, subStep: -1 }
  return { mainStep: 0, subStep: -1 }
}

const COLOR_FIELDS = [
  'iris',
  'raiz_cabelo',
  'sobrancelha',
  'testa',
  'bochecha',
  'cavidade_ocular',
  'queixo',
  'contorno_boca',
  'boca',
] as const

const isAllColorsExtracted = (svgVectorData: SVGVectorData | undefined): boolean => {
  if (!svgVectorData) {
    console.warn('No SVG data')
    return false
  }
  const result = COLOR_FIELDS.every(field => {
    const hasField = field in svgVectorData
    return hasField
  })
  return result
}

interface AnalysisPageProps {
  params: Promise<{
    id: string
  }>
}

// Helper function to get disabled reason tooltip
const getDisabledReasonTooltip = (
  stepIndex: number,
  pigmentData: PigmentAnalysisDataDB | null,
  extractedColorsCount: number = 0,
  extractedColors?: { [key: string]: string }
): string => {
  if (stepIndex === 0) {
    return 'Extraia todas as cores antes de prosseguir'
  }

  if (!pigmentData) {
    return 'Nenhum dado disponível'
  }

  const COLOR_FIELDS_MAP: { [key: string]: string } = {
    'iris': 'Íris',
    'raiz_cabelo': 'Raiz Cabelo',
    'sobrancelha': 'Sobrancelha',
    'testa': 'Testa',
    'bochecha': 'Bochecha',
    'cavidade_ocular': 'Cavidade Ocular',
    'queixo': 'Queixo',
    'contorno_boca': 'Contorno Boca',
    'boca': 'Boca',
  }

  if (stepIndex === 1) {
    // Temperatura step
    if (!pigmentData.temperatura) {
      return 'Nenhuma temperatura definida'
    }
    const filledCount = Object.keys(pigmentData.temperatura).length
    if (filledCount < extractedColorsCount) {
      const missingFields = extractedColors
        ? Object.keys(extractedColors)
          .filter(field => !pigmentData.temperatura || !(field in pigmentData.temperatura))
          .map(field => COLOR_FIELDS_MAP[field] || field)
        : []
      return `Cores faltando: ${missingFields.join(', ')}`
    }
  } else if (stepIndex === 2) {
    // Intensidade step
    if (!pigmentData.intensidade) {
      return 'Nenhuma intensidade definida'
    }
    const filledCount = Object.keys(pigmentData.intensidade).length
    if (filledCount < extractedColorsCount) {
      const missingFields = extractedColors
        ? Object.keys(extractedColors)
          .filter(field => !pigmentData.intensidade || !(field in pigmentData.intensidade))
          .map(field => COLOR_FIELDS_MAP[field] || field)
        : []
      return `Cores faltando: ${missingFields.join(', ')}`
    }
  } else if (stepIndex === 3) {
    // Profundidade step
    if (!pigmentData.profundidade) {
      return 'Nenhuma profundidade definida'
    }
    const profValues = Object.values(pigmentData.profundidade)
    if (profValues.length < 4 || profValues.some(val => val === null || val === undefined)) {
      const COMPARISON_NAMES: { [key: string]: string } = {
        'iris_vs_pele': 'Íris vs Tons de Pele',
        'cavidade_ocular_vs_pele': 'Cavidade Ocular vs Tons de Pele',
        'cabelo_vs_pele': 'Tons de Cabelo vs Tons de Pele',
        'contorno_boca_vs_boca': 'Contorno Boca vs Boca',
      }
      const missingComparisons = Object.entries(pigmentData.profundidade)
        .filter(([_, val]) => val === null || val === undefined)
        .map(([key, _]) => COMPARISON_NAMES[key] || key)
      return `Comparações faltando: ${missingComparisons.join(', ')}`
    }
  } else if (stepIndex === 4) {
    // Geral step
    if (!pigmentData.geral) {
      return 'Nenhum dado geral definido'
    }
    const missing = []
    if (pigmentData.geral.temperatura === null || pigmentData.geral.temperatura === undefined) {
      missing.push('Temperatura')
    }
    if (pigmentData.geral.intensidade === null || pigmentData.geral.intensidade === undefined) {
      missing.push('Intensidade')
    }
    if (pigmentData.geral.profundidade === null || pigmentData.geral.profundidade === undefined) {
      missing.push('Profundidade')
    }
    if (missing.length > 0) {
      return `Campos faltando: ${missing.join(', ')}`
    }
  }

  return 'Preencha todos os campos para continuar'
}

// Helper function to check if a pigment analysis step is complete
const isPigmentStepComplete = (
  stepIndex: number,
  pigmentData: PigmentAnalysisDataDB | null,
  extractedColorsCount: number = 0
): boolean => {
  if (!pigmentData) return false

  if (stepIndex === 1) {
    // Temperatura step - check if all extracted colors have temperature values
    if (!pigmentData.temperatura) return false
    const tempCount = Object.keys(pigmentData.temperatura).length
    // All extracted colors must have temperature values
    return tempCount > 0 && tempCount === extractedColorsCount
  } else if (stepIndex === 2) {
    // Intensidade step - check if all extracted colors have intensidade values
    if (!pigmentData.intensidade) return false
    const intCount = Object.keys(pigmentData.intensidade).length
    // All extracted colors must have intensidade values
    return intCount > 0 && intCount === extractedColorsCount
  } else if (stepIndex === 3) {
    // Profundidade step - check if all 4 comparisons have values
    if (!pigmentData.profundidade) return false
    const profValues = Object.values(pigmentData.profundidade)
    // All 4 comparisons must have values
    return profValues.length === 4 && profValues.every(val => val !== null && val !== undefined)
  } else if (stepIndex === 4) {
    // Geral step - check if all geral values are set
    if (!pigmentData.geral) return false
    return (
      pigmentData.geral.temperatura !== null &&
      pigmentData.geral.temperatura !== undefined &&
      pigmentData.geral.intensidade !== null &&
      pigmentData.geral.intensidade !== undefined &&
      pigmentData.geral.profundidade !== null &&
      pigmentData.geral.profundidade !== undefined
    )
  }

  return false
}

// Helper function to get missing mask rows
const getMissingMaskRows = (maskData: MaskAnalysisDataDB | null): string[] => {
  if (!maskData) {
    return [
      'Temperatura',
      'Subtom',
      'Intensidade',
      'Profundidade',
      'Estação de Cores',
    ]
  }

  const missing: string[] = []

  if (!maskData.temperatura) missing.push('Temperatura')
  if (!maskData.subtom) missing.push('Subtom')
  if (!maskData.intensidade) missing.push('Intensidade')
  if (!maskData.profundidade) missing.push('Profundidade')
  if (!maskData.colorSeason) missing.push('Estação de Cores')

  return missing
}

export default function AnalysisPage({ params }: AnalysisPageProps) {
  const router = useRouter()
  const { message } = AntdApp.useApp()
  const { id: analysisId } = use(params)
  const [user, setUser] = useState<User | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [allColorsExtracted, setAllColorsExtracted] = useState(false)
  const [extractedColorsCount, setExtractedColorsCount] = useState(0)
  const [extractedColors, setExtractedColors] = useState<{ [key: string]: string }>({})
  const [pigmentAnalysisData, setPigmentAnalysisData] = useState<PigmentAnalysisDataDB | null>(null)
  const [maskAnalysisData, setMaskAnalysisData] = useState<MaskAnalysisDataDB | null>(null)
  const colorExtractionRef = useRef<InteractiveColorExtractionStepHandle>(null)

  // Initialize allColorsExtracted based on existing data
  useEffect(() => {
    if (analysis?.extracao) {
      const isExtracted = isAllColorsExtracted(analysis.extracao as SVGVectorData)
      setAllColorsExtracted(isExtracted)
      // Count extracted colors
      const svgData = analysis.extracao as SVGVectorData
      const count = Object.keys(svgData).length
      setExtractedColorsCount(count)
      // Store extracted colors
      const colors: { [key: string]: string } = {}
      Object.entries(svgData).forEach(([field, vectorData]) => {
        if (vectorData?.hex_color) {
          colors[field] = vectorData.hex_color
        }
      })
      setExtractedColors(colors)
    }
  }, [analysis?.id])

  const handleColorDataChange = useCallback((svgVectorData: SVGVectorData) => {
    const extracted = isAllColorsExtracted(svgVectorData)
    setAllColorsExtracted(extracted)
    // Count extracted colors
    const count = Object.keys(svgVectorData).length
    setExtractedColorsCount(count)
    // Store extracted colors
    const colors: { [key: string]: string } = {}
    Object.entries(svgVectorData).forEach(([field, vectorData]) => {
      if (vectorData?.hex_color) {
        colors[field] = vectorData.hex_color
      }
    })
    setExtractedColors(colors)
  }, [])

  // Callback for pigment data changes - wrapped in useCallback to prevent infinite loops
  const handlePigmentDataChange = useCallback((data: PigmentAnalysisDataDB) => {
    setPigmentAnalysisData(data)
  }, [])

  // Callback for mask analysis data changes
  const handleMaskAnalysisDataChange = useCallback((data: MaskAnalysisDataDB) => {
    setMaskAnalysisData(data)
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        // Fetch analysis
        const { data: analysisData, error: analysisError } = await supabase
          .from('analyses')
          .select('*')
          .eq('id', analysisId)
          .maybeSingle()

        if (analysisError) throw analysisError
        if (!analysisData) {
          message.error('Análise não encontrada')
          router.push('/')
          return
        }

        setAnalysis(analysisData)

        // Fetch user
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', analysisData.user_id)
          .maybeSingle()

        if (userError) throw userError
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
  }, [analysisId])

  // Save handler for step 0 (Color Extraction) - updates extracao
  const handleSaveColorExtractionStep = async (svgVectorData: any) => {
    if (!analysis) return

    try {
      setSaving(true)

      // Save SVG vectors directly to extracao column
      const updatePayload: any = {
        current_step: currentStep + 1,
        status: 'in_process' as AnalysisStatus,
        updated_at: new Date().toISOString(),
        extracao: svgVectorData, // SVG vectors stored as extracao
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

      // Move to next step
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

  // Merge pigment analysis data: combine current step data with existing data
  const mergePigmentAnalysisData = (
    currentStepIndex: number,
    newData: PigmentAnalysisDataDB
  ): PigmentAnalysisDataDB => {
    // Start with existing data
    let merged = analysis?.analise_pigmentos ? { ...analysis.analise_pigmentos } : {}

    // Determine which step we're saving (currentStep is 1-4 for pigment analysis)
    // currentStep 1 = temperatura, 2 = intensidade, 3 = profundidade, 4 = geral
    if (currentStepIndex === 1) {
      // Saving temperatura - merge only temperatura field
      merged.temperatura = newData.temperatura
    } else if (currentStepIndex === 2) {
      // Saving intensidade - merge only intensidade field
      merged.intensidade = newData.intensidade
    } else if (currentStepIndex === 3) {
      // Saving profundidade - merge only profundidade field
      merged.profundidade = newData.profundidade
    } else if (currentStepIndex === 4) {
      // Saving geral - merge only geral field
      merged.geral = newData.geral
    }

    return merged
  }

  // Generic save handler for other steps (steps 1-4) - saves pigment analysis data
  const handleSaveOtherStep = async () => {
    if (!analysis) return

    try {
      setSaving(true)

      // Update current_step, status, and analysis data
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
        // Merge with existing data to preserve other steps
        const mergedData = mergePigmentAnalysisData(currentStep - 1, pigmentAnalysisData)
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

      // Move to next step
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

  // Save and exit handler - updates extracao for step 0, pigment data for steps 1-4
  const handleSaveAndExit = async (svgVectorData: any) => {
    if (!analysis) return

    try {
      setSaving(true)

      const updatePayload: any = {
        current_step: currentStep + 1,
        status: 'in_process' as AnalysisStatus,
        updated_at: new Date().toISOString(),
      }

      // Update extracao if on step 0 (color extraction)
      if (currentStep === 0) {
        updatePayload.extracao = svgVectorData
      }

      // Save mask analysis data if we're in mask analysis step (1)
      if (currentStep === 1 && maskAnalysisData) {
        updatePayload.analise_mascaras = maskAnalysisData
      }

      // Save pigment analysis data if we're in pigment steps (2-5)
      if (currentStep >= 2 && currentStep <= 5 && pigmentAnalysisData) {
        // Merge with existing data to preserve other steps
        const mergedData = mergePigmentAnalysisData(currentStep - 1, pigmentAnalysisData)
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

  // Calculate total steps (7 steps total: 0=extraction, 1-4=pigment substeps, 5=mask, 6=final)
  const TOTAL_STEPS = 7
  const { mainStep, subStep } = getStepMapping(currentStep)

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
      <Content className="p-8">
        <div className="max-w-6xl mx-auto">

          {/* Header Card */}
          <div className="mb-4">
            <Card className="border-secondary border-2 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center justify-start gap-8 mb-4">
                  {user.face_photo_url && (
                    <img
                      src={user.face_photo_url}
                      alt={user.name}
                      className="w-20 h-20 rounded-lg object-cover shadow-md"
                    />
                  )}
                  <div className="flex-1">
                    <h1 className="font-fraunces text-2xl font-bold text-secondary mb-1">
                      {user.name}
                    </h1>
                    <Badge
                      status={
                        analysis.status === 'completed'
                          ? 'success'
                          : analysis.status === 'in_process'
                            ? 'processing'
                            : 'default'
                      }
                      text={
                        analysis.status === 'completed'
                          ? 'Concluída'
                          : analysis.status === 'in_process'
                            ? 'Em Progresso'
                            : 'Não Iniciada'
                      }
                    />
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="mb-8 flex justify-between">

                  <Space>
                    {currentStep > 0 && (
                      <Button
                        type="primary"
                        size="large"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => setCurrentStep(currentStep - 1)}
                      >
                        Anterior
                      </Button>
                    )}
                    <Button
                      size="large"
                      icon={<SaveOutlined />}
                      loading={saving}
                      onClick={async () => {
                        try {
                          let svgVectorData = {}
                          if (currentStep === 0 && colorExtractionRef.current) {
                            svgVectorData = colorExtractionRef.current.getSVGVectorData()
                          }
                          await handleSaveAndExit(svgVectorData)
                          await new Promise(resolve => setTimeout(resolve, 500))
                          router.push('/')
                        } catch (error) {
                          console.error('Error during save and exit:', error)
                          message.error('Erro ao salvar antes de sair')
                        }
                      }}
                    >
                      Salvar e Sair
                    </Button>

                    {currentStep === TOTAL_STEPS - 1 ? (
                      <Button
                        type="primary"
                        size="large"
                        icon={<SaveOutlined />}
                        loading={saving}
                        onClick={handleCompleteAnalysis}
                      >
                        Concluir Análise
                      </Button>
                    ) : (() => {
                      const isDisabled = currentStep === 0
                        ? !allColorsExtracted
                        : currentStep === 1
                          ? !maskAnalysisData || !maskAnalysisData.temperatura || !maskAnalysisData.intensidade || !maskAnalysisData.profundidade || !maskAnalysisData.subtom || !maskAnalysisData.colorSeason
                          : currentStep >= 2 && currentStep <= 5
                            ? !isPigmentStepComplete(currentStep - 1, pigmentAnalysisData, extractedColorsCount)
                            : currentStep === 6
                              ? false
                              : false

                      let disabledTooltip: string | null = null
                      if (isDisabled) {
                        if (currentStep === 0) {
                          disabledTooltip = 'Extraia todas as cores antes de prosseguir'
                        } else if (currentStep === 1) {
                          const missing = getMissingMaskRows(maskAnalysisData)
                          disabledTooltip = `Linhas faltando: ${missing.join(', ')}`
                        } else {
                          disabledTooltip = getDisabledReasonTooltip(currentStep - 1, pigmentAnalysisData, extractedColorsCount, extractedColors)
                        }
                      }

                      return (
                        <Tooltip title={disabledTooltip} color="#ff4d4f">
                          <Button
                            type="primary"
                            size="large"
                            loading={saving}
                            disabled={isDisabled}
                            onClick={() => {
                              if (currentStep === 0) {
                                // Step 0: Get color extraction data and save
                                let svgVectorData = {}
                                if (colorExtractionRef.current) {
                                  svgVectorData = colorExtractionRef.current.getSVGVectorData()
                                }
                                handleSaveColorExtractionStep(svgVectorData)
                              } else {
                                // Steps 1-6: Save without updating extracao
                                handleSaveOtherStep()
                              }
                            }}
                          >
                            Próximo
                            <ArrowRightOutlined />
                          </Button>
                        </Tooltip>
                      )
                    })()}
                  </Space>
                </div>

              </div>

              {/* Main Steps - Basic Style */}
              <div className="mb-4">
                <Steps
                  current={mainStep}
                  items={MAIN_ANALYSIS_STEPS.map((step) => ({
                    title: step.title,
                    status:
                      mainStep > MAIN_ANALYSIS_STEPS.indexOf(step)
                        ? 'finish'
                        : mainStep === MAIN_ANALYSIS_STEPS.indexOf(step)
                          ? 'process'
                          : 'wait',
                  }))}
                />
              </div>


            </Card>
          </div>

          {/* Step Content */}
          <div className="relative">
            {saving && (
              <div className="absolute inset-0 bg-white/50 rounded-lg flex items-center justify-center z-10">
                <Spin size="large" />
              </div>
            )}
            {currentStep === 0 && (
              <>
                <InteractiveColorExtractionStep
                  ref={colorExtractionRef}
                  userFacePhotoUrl={user.face_photo_url}
                  userEyePhotoUrl={user.eye_photo_url}
                  onSave={handleSaveColorExtractionStep}
                  initialData={analysis.extracao as SVGVectorData}
                  onDataChange={handleColorDataChange}
                />
              </>
            )}

            {currentStep === 1 && (
              <MaskAnalysisStep
                userFacePhotoUrl={user.face_photo_url}
                savedData={maskAnalysisData || undefined}
                onDataChange={handleMaskAnalysisDataChange}
              />
            )}

            {(currentStep === 2 || currentStep === 3 || currentStep === 4 || currentStep === 5) && (
              <PigmentAnalysisStep
                initialData={analysis.extracao as SVGVectorData}
                userFacePhotoUrl={user.face_photo_url || undefined}
                currentSubStep={currentStep - 2}
                savedAnalysisData={pigmentAnalysisData || undefined}
                onDataChange={handlePigmentDataChange}
                onSubStepChange={(subStep: number) => {
                  setCurrentStep(subStep + 2)
                }}
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
        </div>
      </Content>
    </Layout>
  )
}
