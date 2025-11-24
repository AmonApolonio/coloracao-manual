'use client'

import { useState, useEffect, use, useRef } from 'react'
import { Layout, Card, Steps, Button, Space, message, Spin, Badge } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, Analysis, AnalysisStatus, StepData } from '@/lib/types'
import InteractiveColorExtractionStep, { type InteractiveColorExtractionStepHandle } from '../steps/InteractiveColorExtractionStep'

const { Content } = Layout

const ANALYSIS_STEPS = [
  { title: 'Extração de Cor', key: 'color-extraction' },
  { title: 'Análise Complementar', key: 'complementary' },
  { title: 'Diagnóstico', key: 'diagnosis' },
  { title: 'Revisão Final', key: 'review' },
]

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
  const colorExtractionRef = useRef<InteractiveColorExtractionStepHandle>(null)

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

  const handleSaveStep = async (stepData: StepData, hexColors?: Record<string, any>) => {
    if (!analysis) return

    try {
      setSaving(true)

      const updatedStepData = {
        ...analysis.step_data,
        ...stepData,
      }

      // Extract color_hex and shapes from step data
      const colorHexData: Record<string, any> = {}
      const shapesData: Record<string, any> = {}

      // Build color_hex from passed hexColors parameter
      if (hexColors) {
        Object.entries(hexColors).forEach(([field, hex]) => {
          if (hex) {
            colorHexData[field] = hex
          }
        })
      }

      // Build shapes from the color extraction data
      Object.entries(updatedStepData).forEach(([field, data]: [string, any]) => {
        if (data && typeof data === 'object') {
          // Store polygon shapes in shapes column
          if (data.shapes && Array.isArray(data.shapes) && data.shapes.length > 0) {
            shapesData[field] = data.shapes
          }
        }
      })

      console.log('Saving with color_hex:', colorHexData)
      console.log('Saving with shapes:', shapesData)

      const updatePayload: any = {
        current_step: currentStep + 1,
        step_data: updatedStepData,
        status: 'in_process' as AnalysisStatus,
        updated_at: new Date().toISOString(),
      }

      // Only add color_hex and shapes if they have data
      if (Object.keys(colorHexData).length > 0) {
        updatePayload.color_hex = colorHexData
      }
      if (Object.keys(shapesData).length > 0) {
        updatePayload.shapes = shapesData
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
        step_data: updatedStepData,
        color_hex: colorHexData,
        shapes: shapesData,
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
                        icon={<ArrowLeftOutlined />}
                        onClick={() => setCurrentStep(currentStep - 1)}
                      >
                        Voltar
                      </Button>
                    )}
                  </Space>

                  <Space>
                    <Button
                      size="large"
                      icon={<SaveOutlined />}
                      loading={saving}
                      onClick={async () => {
                        try {
                          setSaving(true)
                          // Get current step data from the ref if on step 0
                          let stepData = analysis?.step_data || {}
                          let hexColors = {}
                          if (currentStep === 0 && colorExtractionRef.current) {
                            stepData = colorExtractionRef.current.getColorData()
                            hexColors = colorExtractionRef.current.getHexColors()
                          }
                          await handleSaveStep(stepData, hexColors)
                          // Wait a moment for the save to complete
                          await new Promise(resolve => setTimeout(resolve, 500))
                          router.push('/')
                        } catch (error) {
                          console.error('Error during save and exit:', error)
                          message.error('Erro ao salvar antes de sair')
                        } finally {
                          setSaving(false)
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
                        onClick={() => {
                          // Get current step data from the ref if on step 0
                          let stepData = analysis?.step_data || {}
                          let hexColors = {}
                          if (currentStep === 0 && colorExtractionRef.current) {
                            stepData = colorExtractionRef.current.getColorData()
                            hexColors = colorExtractionRef.current.getHexColors()
                          }
                          handleSaveStep(stepData, hexColors)
                        }}
                      >
                        Próximo
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
              <InteractiveColorExtractionStep
                ref={colorExtractionRef}
                userFacePhotoUrl={user.face_photo_url}
                userEyePhotoUrl={user.eye_photo_url}
                onSave={handleSaveStep}
                initialData={analysis.step_data}
                initialHexColors={analysis.color_hex}
              />
            )}

            {currentStep === 1 && (
              <Card className="border-secondary border-2">
                <h2 className="text-xl font-bold text-secondary mb-4">Análise Complementar</h2>
                <div className="text-center py-12 text-gray-400">
                  <p>Próximas etapas em desenvolvimento...</p>
                </div>
              </Card>
            )}

            {currentStep === 2 && (
              <Card className="border-secondary border-2">
                <h2 className="text-xl font-bold text-secondary mb-4">Diagnóstico</h2>
                <div className="text-center py-12 text-gray-400">
                  <p>Próximas etapas em desenvolvimento...</p>
                </div>
              </Card>
            )}

            {currentStep === 3 && (
              <Card className="border-secondary border-2">
                <h2 className="text-xl font-bold text-secondary mb-4">Revisão Final</h2>
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
