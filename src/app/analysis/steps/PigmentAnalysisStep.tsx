'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, Typography, Empty, Steps } from 'antd'
import { SVGVectorData } from '@/lib/types'
import { PigmentTemperatureDataUI, ProfundidadeComparisonUI, PigmentAnalysisDataUI } from '@/lib/types-ui'
import { PigmentAnalysisDataDB, COMPARISON_FIELD_NAMES } from '@/lib/types-db'
import { convertUIToDB, convertDBToUI } from '@/lib/pigment-conversion'
import { getLabelCategory, COLOR_FIELDS, ANALYSIS_STEPS } from './utils/PigmentAnalysisUtils'
import { SliderStepComponent } from './components/SliderStepComponent'
import { ProfundidadeComparisonComponent } from './components/ProfundidadeComparisonComponent'
import { GeralSummaryComponent } from './components/GeralSummaryComponent'

const { Paragraph } = Typography

interface PigmentAnalysisStepProps {
  initialData?: SVGVectorData
  userFacePhotoUrl?: string
  currentSubStep: number // 0 = temperatura, 1 = intensidade, 2 = profundidade
  savedAnalysisData?: PigmentAnalysisDataDB // Load previously saved data from Supabase
  onDataChange?: (data: PigmentAnalysisDataDB) => void // Send only DB types to parent
  onSubStepChange?: (subStep: number) => void
}
export default function PigmentAnalysisStep({
  initialData,
  userFacePhotoUrl,
  currentSubStep,
  savedAnalysisData,
  onDataChange,
  onSubStepChange,
}: PigmentAnalysisStepProps) {
  const [extractedColors, setExtractedColors] = useState<{
    [key: string]: string
  }>({})

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

  const savedDataLoadedRef = useRef(false)

  // Initialize with extracted colors from first step
  useEffect(() => {
    if (initialData) {
      const colors: { [key: string]: string } = {}
      Object.entries(initialData).forEach(([field, vectorData]) => {
        if (vectorData?.hex_color) {
          colors[field] = vectorData.hex_color
        }
      })
      setExtractedColors(colors)

      // Initialize data for all steps
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
  }, [initialData])

  // Load previously saved analysis data from Supabase (only once when extractedColors are ready)
  useEffect(() => {
    if (Object.keys(extractedColors).length > 0 && !savedDataLoadedRef.current) {
      savedDataLoadedRef.current = true
      if (savedAnalysisData) {
        const loadedData = convertDBToUI(savedAnalysisData, extractedColors)
        setAnalysisData(loadedData)
      }
    }
  }, [extractedColors, savedAnalysisData])

  // Store ref to onDataChange to avoid infinite loops
  const onDataChangeRef = useRef(onDataChange)
  onDataChangeRef.current = onDataChange

  // Notify parent of data changes - convert to DB format before sending
  useEffect(() => {
    if (
      onDataChangeRef.current &&
      Object.keys(extractedColors).length > 0 &&
      savedDataLoadedRef.current
    ) {
      const dbData = convertUIToDB(analysisData)
      onDataChangeRef.current(dbData)
    }
  }, [analysisData, extractedColors])

  const handleStepValueChange = (field: string, value: number) => {
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
  }

  const handleProfundidadeComparisonChange = (index: number, value: number) => {
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
  }

  const handleGeralChange = (
    key: 'temperatura' | 'intensidade' | 'profundidade',
    value: number
  ) => {
    setAnalysisData((prev) => ({
      ...prev,
      geral: {
        temperatura: prev.geral?.temperatura ?? null,
        intensidade: prev.geral?.intensidade ?? null,
        profundidade: prev.geral?.profundidade ?? null,
        [key]: value,
      },
    }))
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
    <Card className="border-secondary border-2 rounded-xl">
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
        <h2 className="text-2xl font-bold text-secondary mb-2">
          {ANALYSIS_STEPS[currentSubStep].title}
        </h2>
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
        />
      ) : currentSubStep === 3 ? (
        <GeralSummaryComponent
          extractedColors={extractedColors}
          analysisData={analysisData}
          userFacePhotoUrl={userFacePhotoUrl}
          onGeralChange={handleGeralChange}
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
        />
      )}
    </Card>
  )
}
