'use client'

import { useState, useEffect, use, useRef } from 'react'
import { Layout, Card, Steps, Button, Space, message, Spin, Badge } from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined, SaveOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, Analysis, AnalysisStatus, SVGVectorData } from '@/lib/types'
import InteractiveColorExtractionStep, { type InteractiveColorExtractionStepHandle } from '../steps/InteractiveColorExtractionStep'

const { Content } = Layout

const ANALYSIS_STEPS = [
  { title: 'Extração de Cor', key: 'color-extraction' },
  { title: 'Análise dos Pigmentos', key: 'pigment-analysis' },
  { title: 'Análise das Máscaras', key: 'mask-analysis' },
  { title: 'Classificação Final', key: 'final-classification' },
]

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

export default function AnalysisPage({ params }: AnalysisPageProps) {
  const router = useRouter()
  const { id: analysisId } = use(params)
  const [user, setUser] = useState<User | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [allColorsExtracted, setAllColorsExtracted] = useState(false)
  const colorExtractionRef = useRef<InteractiveColorExtractionStepHandle>(null)

  // Initialize allColorsExtracted based on existing data
  useEffect(() => {
    if (analysis?.extracao) {
      setAllColorsExtracted(isAllColorsExtracted(analysis.extracao as SVGVectorData))
    }
  }, [analysis?.extracao])

  const handleColorDataChange = (svgVectorData: SVGVectorData) => {
    const extracted = isAllColorsExtracted(svgVectorData)
    setAllColorsExtracted(extracted)
  }

  useEffect(() => {
    loadData()
  }, [analysisId])

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

      // Set current step from analysis
      setCurrentStep(analysisData.current_step - 1)
    } catch (error) {
      console.error('Error loading data:', error)
      message.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

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
      if (currentStep < ANALYSIS_STEPS.length - 1) {
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

  // Generic save handler for other steps (steps 1-3) - does NOT update extracao
  const handleSaveOtherStep = async () => {
    if (!analysis) return

    try {
      setSaving(true)

      // Update only current_step and status, preserving existing extracao data
      const updatePayload: any = {
        current_step: currentStep + 1,
        status: 'in_process' as AnalysisStatus,
        updated_at: new Date().toISOString(),
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
      })

      // Move to next step
      if (currentStep < ANALYSIS_STEPS.length - 1) {
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

  // Save and exit handler - only updates extracao for step 0
  const handleSaveAndExit = async (svgVectorData: any) => {
    if (!analysis) return

    try {
      setSaving(true)

      const updatePayload: any = {
        status: 'in_process' as AnalysisStatus,
        updated_at: new Date().toISOString(),
      }

      // Only update extracao if on step 0 (color extraction)
      if (currentStep === 0) {
        updatePayload.extracao = svgVectorData
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
          current_step: ANALYSIS_STEPS.length,
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

  if (loading) {
    return (
      <Layout className="min-h-screen bg-background">
        <Content className="p-8 flex items-center justify-center">
          <Spin size="large" fullscreen />
        </Content>
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

                    {currentStep === ANALYSIS_STEPS.length - 1 ? (
                      <Button
                        type="primary"
                        size="large"
                        icon={<SaveOutlined />}
                        loading={saving}
                        onClick={handleCompleteAnalysis}
                      >
                        Concluir Análise
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        size="large"
                        loading={saving}
                        disabled={(() => {
                          const isDisabled = currentStep === 0 && !allColorsExtracted
                          return isDisabled
                        })()}
                        onClick={() => {
                          if (currentStep === 0) {
                            // Step 0: Get color extraction data and save
                            let svgVectorData = {}
                            if (colorExtractionRef.current) {
                              svgVectorData = colorExtractionRef.current.getSVGVectorData()
                            }
                            handleSaveColorExtractionStep(svgVectorData)
                          } else {
                            // Steps 1-3: Save without updating extracao
                            handleSaveOtherStep()
                          }
                        }}
                      >
                        Próximo
                        <ArrowRightOutlined />
                      </Button>
                    )}
                  </Space>
                </div>

              </div>

              {/* Horizontal Steps */}
              <Steps
                current={currentStep}
                size="small"
                items={ANALYSIS_STEPS.map((step, idx) => ({
                  title: step.title,
                  status:
                    idx < currentStep
                      ? 'finish'
                      : idx === currentStep
                        ? 'process'
                        : 'wait',
                }))}
              />
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
              <Card className="border-secondary border-2">
                <h2 className="text-xl font-bold text-secondary mb-4">Análise dos Pigmentos</h2>
                <div className="text-center py-12 text-gray-400">
                  <p>Próximas etapas em desenvolvimento...</p>
                </div>
              </Card>
            )}

            {currentStep === 2 && (
              <Card className="border-secondary border-2">
                <h2 className="text-xl font-bold text-secondary mb-4">Análise das Máscaras</h2>
                <div className="text-center py-12 text-gray-400">
                  <p>Próximas etapas em desenvolvimento...</p>
                </div>
              </Card>
            )}

            {currentStep === 3 && (
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
