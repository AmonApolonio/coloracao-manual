'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, Typography, Empty, Steps, Button, App } from 'antd'
import { AimOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons'
import { SVGVectorData } from '@/lib/types'
import { PigmentTemperatureDataUI, ProfundidadeComparisonUI, PigmentAnalysisDataUI } from '@/lib/types-ui'
import { PigmentAnalysisDataDB, COMPARISON_FIELD_NAMES } from '@/lib/types-db'
import { convertUIToDB, convertDBToUI } from '@/lib/pigment-conversion'
import { getLabelCategory, COLOR_FIELDS, ANALYSIS_STEPS, calculateTemperaturaPosition, calculateIntensidadePosition, calculateProfundidadePosition } from '../shared/PigmentAnalysisUtils'
import { SliderStepComponent } from './components/SliderStepComponent'
import { ProfundidadeComparisonComponent } from './components/ProfundidadeComparisonComponent'
import { GeralSummaryComponent } from './components/GeralSummaryComponent'
import { useAuth } from '@/app/context/AuthContext'

const { Paragraph } = Typography

interface PigmentAnalysisStepProps {
  initialData?: SVGVectorData
  userFacePhotoUrl?: string
  currentSubStep: number // 0 = temperatura, 1 = intensidade, 2 = profundidade
  savedAnalysisData?: PigmentAnalysisDataDB // Load previously saved data from database
  onDataChange?: (data: PigmentAnalysisDataDB) => void // Send only DB types to parent
  onSubStepChange?: (subStep: number) => void
  isReadOnly?: boolean
}
export default function PigmentAnalysisStep({
  initialData,
  userFacePhotoUrl,
  currentSubStep,
  savedAnalysisData,
  onDataChange,
  onSubStepChange,
  isReadOnly,
}: PigmentAnalysisStepProps) {
  const [extractedColors, setExtractedColors] = useState<{
    [key: string]: string
  }>({})

  const [rangesLocked, setRangesLocked] = useState<boolean>(true)
  const { isAdmin } = useAuth()
  const { message } = App.useApp()

  const [analysisData, setAnalysisData] = useState<PigmentAnalysisDataUI>({
    temperatura: {},
    intensidade: {},
    profundidade: [],
    geral: {
      temperatura: null,
      intensidade: null,
      profundidade: null,
    },
  })

  // Track the last loaded savedAnalysisData to detect changes
  const lastLoadedDataRef = useRef<string | null>(null)
  // Track if we're currently loading saved data to prevent notifying parent
  const isLoadingDataRef = useRef(false)
  // Track last initialData to prevent unnecessary updates
  const lastInitialDataRef = useRef<string | null>(null)

  // Initialize with extracted colors from first step
  useEffect(() => {
    if (initialData) {
      // Create a hash to detect if initialData actually changed
      const dataHash = JSON.stringify(initialData)
      if (lastInitialDataRef.current === dataHash) {
        return // Skip if data hasn't changed
      }
      lastInitialDataRef.current = dataHash

      const colors: { [key: string]: string } = {}
      Object.entries(initialData).forEach(([field, vectorData]) => {
        if (vectorData?.hex_color) {
          colors[field] = vectorData.hex_color
        }
      })
      setExtractedColors(colors)

      // Initialize data for all steps (only if we don't have saved data)
      if (!savedAnalysisData) {
        const temperaturaData: PigmentTemperatureDataUI = {}
        const intensidadeData: PigmentTemperatureDataUI = {}

        Object.entries(colors).forEach(([field]) => {
          temperaturaData[field] = {
            hexColor: colors[field],
            temperature: null,
            temperatureCategory: '',
          }
          intensidadeData[field] = {
            hexColor: colors[field],
            temperature: null,
            temperatureCategory: '',
          }
        })

        const initData: PigmentAnalysisDataUI = {
          temperatura: temperaturaData,
          intensidade: intensidadeData,
          profundidade: [
            {
              field: 'iris_vs_pele',
              name: COMPARISON_FIELD_NAMES['iris_vs_pele'],
              colors1: ['iris'],
              colors2: ['testa', 'bochecha', 'queixo'],
              value: null,
              category: '',
            },
            {
              field: 'cavidade_ocular_vs_pele',
              name: COMPARISON_FIELD_NAMES['cavidade_ocular_vs_pele'],
              colors1: ['cavidade_ocular'],
              colors2: ['testa', 'bochecha', 'queixo'],
              value: null,
              category: '',
            },
            {
              field: 'cabelo_vs_pele',
              name: COMPARISON_FIELD_NAMES['cabelo_vs_pele'],
              colors1: ['raiz_cabelo', 'sobrancelha'],
              colors2: ['testa', 'bochecha', 'queixo'],
              value: null,
              category: '',
            },
            {
              field: 'contorno_boca_vs_boca',
              name: COMPARISON_FIELD_NAMES['contorno_boca_vs_boca'],
              colors1: ['contorno_boca'],
              colors2: ['boca'],
              value: null,
              category: '',
            },
          ],
          geral: {
            temperatura: null,
            intensidade: null,
            profundidade: null,
          },
        }

        setAnalysisData(initData)
      }
    }
  }, [initialData, savedAnalysisData])

  // Load previously saved analysis data from database
  // This runs whenever savedAnalysisData changes or becomes available
  useEffect(() => {
    if (Object.keys(extractedColors).length > 0 && savedAnalysisData) {
      // Create a hash of the savedAnalysisData to detect changes
      const dataHash = JSON.stringify(savedAnalysisData)
      
      // Only load if the data has changed
      if (lastLoadedDataRef.current !== dataHash) {
        isLoadingDataRef.current = true
        lastLoadedDataRef.current = dataHash
        const loadedData = convertDBToUI(savedAnalysisData, extractedColors)
        setAnalysisData(loadedData)
        // Reset the loading flag after a tick to allow state to settle
        setTimeout(() => {
          isLoadingDataRef.current = false
        }, 0)
      }
    }
  }, [extractedColors, savedAnalysisData])

  // Store ref to onDataChange to avoid infinite loops
  const onDataChangeRef = useRef(onDataChange)
  onDataChangeRef.current = onDataChange

  // Notify parent of data changes - convert to DB format before sending
  // Only notify after we've had a chance to load saved data (extractedColors are ready)
  // Skip notification when we're loading data from saved state to prevent loops
  useEffect(() => {
    if (
      onDataChangeRef.current &&
      Object.keys(extractedColors).length > 0 &&
      !isLoadingDataRef.current
    ) {
      const dbData = convertUIToDB(analysisData)
      onDataChangeRef.current(dbData)
    }
  }, [analysisData, extractedColors])

  const handleStepValueChange = useCallback((field: string, value: number) => {
    if (isReadOnly) return
    
    const stepKey = ANALYSIS_STEPS[currentSubStep]
      .key as keyof PigmentAnalysisDataUI
    const category = getLabelCategory(value, stepKey)

    setAnalysisData((prev) => {
      if (stepKey === 'profundidade') {
        // For profundidade, this shouldn't be called, but handle it just in case
        return prev
      }
      const stepData = prev[stepKey] as PigmentTemperatureDataUI
      return {
        ...prev,
        [stepKey]: {
          ...stepData,
          [field]: {
            hexColor: extractedColors[field] || '#000000',
            temperature: value,
            temperatureCategory: category,
          },
        },
      }
    })
  }, [isReadOnly, currentSubStep, extractedColors])

  const handleProfundidadeComparisonChange = useCallback((index: number, value: number) => {
    if (isReadOnly) return
    
    const category = getLabelCategory(value, 'profundidade')

    setAnalysisData((prev) => {
      const profundidadeData =
        (prev.profundidade as ProfundidadeComparisonUI[]) || []
      const updated = [...profundidadeData]
      updated[index] = {
        ...updated[index],
        value,
        category,
      }
      return {
        ...prev,
        profundidade: updated,
      }
    })
  }, [isReadOnly])

  const handleGeralChange = useCallback((
    key: 'temperatura' | 'intensidade' | 'profundidade',
    value: number
  ) => {
    if (isReadOnly) return
    
    setAnalysisData((prev) => ({
      ...prev,
      geral: {
        temperatura: prev.geral?.temperatura ?? null,
        intensidade: prev.geral?.intensidade ?? null,
        profundidade: prev.geral?.profundidade ?? null,
        [key]: value,
      },
    }))
  }, [isReadOnly])

  // Auto-fill all sliders with calculated values from the color scales
  const handleAutoFill = () => {
    if (isReadOnly) return

    const stepKey = ANALYSIS_STEPS[currentSubStep].key

    if (stepKey === 'temperatura') {
      // Auto-fill temperatura values
      setAnalysisData((prev) => {
        const temperaturaData = { ...prev.temperatura }
        Object.keys(extractedColors).forEach((field) => {
          const value = calculateTemperaturaPosition(extractedColors[field], field)
          const category = getLabelCategory(value, 'temperatura')
          temperaturaData[field] = {
            hexColor: extractedColors[field],
            temperature: value,
            temperatureCategory: category,
          }
        })
        return { ...prev, temperatura: temperaturaData }
      })
    } else if (stepKey === 'intensidade') {
      // Auto-fill intensidade values
      setAnalysisData((prev) => {
        const intensidadeData = { ...prev.intensidade }
        Object.keys(extractedColors).forEach((field) => {
          const value = calculateIntensidadePosition(extractedColors[field], field)
          const category = getLabelCategory(value, 'intensidade')
          intensidadeData[field] = {
            hexColor: extractedColors[field],
            temperature: value,
            temperatureCategory: category,
          }
        })
        return { ...prev, intensidade: intensidadeData }
      })
    } else if (stepKey === 'profundidade') {
      // Auto-fill profundidade values
      setAnalysisData((prev) => {
        const profundidadeData = [...(prev.profundidade as ProfundidadeComparisonUI[])]
        profundidadeData.forEach((comparison, index) => {
          const value = calculateProfundidadePosition(
            comparison.colors1,
            comparison.colors2,
            extractedColors,
            comparison.field
          )
          const category = getLabelCategory(value, 'profundidade')
          profundidadeData[index] = {
            ...profundidadeData[index],
            value,
            category,
          }
        })
        return { ...prev, profundidade: profundidadeData }
      })
    }
  }

  const handleLockToggle = () => {
    if (rangesLocked) {
      if (isAdmin) {
        setRangesLocked(false)
        message.success('Escalas desbloqueadas')
      } else {
        message.error('Apenas administradores podem desbloquear as escalas')
      }
    } else {
      setRangesLocked(true)
    }
  }

  const extractedColorFields = COLOR_FIELDS.filter(
    (field) => field.value in extractedColors
  )

  if (extractedColorFields.length === 0) {
    return (
      <Card className="border-secondary border-2">
        <Empty
          description="Nenhuma cor extraída"
          style={{ marginTop: 48, marginBottom: 48 }}
        />
        <Paragraph type="secondary" style={{ textAlign: 'center' }}>
          Complete a extração de cores na etapa anterior para continuar.
        </Paragraph>
      </Card>
    )
  }

  const currentStepKey = ANALYSIS_STEPS[currentSubStep].key

  return (
    <App>
      <Card className="border-secondary border-2 rounded-xl">
      {isReadOnly && (
        <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded mb-4">
          🔒 Modo visualização - Esta análise já foi concluída
        </div>
      )}
      {/* Sub Steps - Dot Style - Read Only (no clicking to jump) */}
      <div className="mb-6">
        <Steps
          type="dot"
          current={currentSubStep}
          items={ANALYSIS_STEPS.map((step) => ({
            title: step.title,
            status:
              currentSubStep > ANALYSIS_STEPS.indexOf(step)
                ? 'finish'
                : currentSubStep === ANALYSIS_STEPS.indexOf(step)
                  ? 'process'
                  : 'wait',
          }))}
        />
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-secondary">
            {ANALYSIS_STEPS[currentSubStep].title}
          </h2>
          <div className="flex items-center gap-2">
            {currentSubStep < 3 && !isReadOnly && (
              <Button
                type="default"
                icon={<AimOutlined />}
                onClick={handleAutoFill}
                size="middle"
              >
                Auto-preencher
              </Button>
            )}
            {currentSubStep < 3 && !isReadOnly && isAdmin && (
              <Button
                type="text"
                icon={rangesLocked ? <LockOutlined /> : <UnlockOutlined />}
                onClick={handleLockToggle}
                title={rangesLocked ? "Clique para desbloquear as escalas" : "Clique para bloquear as escalas"}
              />
            )}
          </div>
        </div>
        <Paragraph type="secondary">
          {currentSubStep === 2
            ? 'Classifique a profundidade comparando os tons de cores relacionadas. Mova o controle deslizante para atualizar o valor de cada comparação.'
            : `Classifique a ${ANALYSIS_STEPS[currentSubStep].title.toLowerCase()} de cada cor extraída. Mova o controle deslizante para atualizar o valor.`}
        </Paragraph>
      </div>

      {/* Step Content */}
      {currentSubStep === 2 ? (
        <ProfundidadeComparisonComponent
          extractedColors={extractedColors}
          data={(analysisData.profundidade as ProfundidadeComparisonUI[]) || []}
          onComparisonChange={handleProfundidadeComparisonChange}
          isReadOnly={isReadOnly}
          rangesLocked={rangesLocked}
        />
      ) : currentSubStep === 3 ? (
        <GeralSummaryComponent
          extractedColors={extractedColors}
          analysisData={analysisData}
          userFacePhotoUrl={userFacePhotoUrl}
          onGeralChange={handleGeralChange}
          isReadOnly={isReadOnly}
        />
      ) : (
        <SliderStepComponent
          stepKey={currentStepKey}
          extractedColors={extractedColors}
          data={
            (analysisData[
              currentStepKey as keyof PigmentAnalysisDataUI
            ] as PigmentTemperatureDataUI) || {}
          }
          onValueChange={handleStepValueChange}
          isReadOnly={isReadOnly}
          rangesLocked={rangesLocked}
        />
      )}

      </Card>
    </App>
  )
}
