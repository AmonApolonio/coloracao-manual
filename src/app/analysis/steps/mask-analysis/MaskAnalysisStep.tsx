'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Card } from 'antd'
import MaskCanvas from './MaskCanvas'
import PositionControlsPanel from './PositionControlsPanel'
import { MaskAnalysisDataDB, ColorSeason, MaskSelection } from '@/lib/types-db'
import {
  PROFUNDIDADE_ESCURA_COLORS,
  PROFUNDIDADE_CLARO_COLORS,
  TEMPERATURA_FRIA_COLORS,
  TEMPERATURA_QUENTE_COLORS,
  INTENSIDADE_SUAVE_COLORS,
  INTENSIDADE_BRILHANTE_COLORS,
  INTENSIDADE_SUAVE_COLORS2,
  INTENSIDADE_BRILHANTE_COLORS2,
  INTENSIDADE_SUAVE_COLORS3,
  INTENSIDADE_BRILHANTE_COLORS3,
  PROFUNDIDADE_ESCURA_COLORS2,
  PROFUNDIDADE_CLARO_COLORS2,
  PROFUNDIDADE_ESCURA_COLORS3,
  PROFUNDIDADE_CLARO_COLORS3,
  PROFUNDIDADE_ESCURA_COLORS4,
  PROFUNDIDADE_CLARO_COLORS4,
  TEMPERATURA_FRIA_COLORS2,
  TEMPERATURA_QUENTE_COLORS2,
  OURO_GRADIENT,
  PRATA_GRADIENT,
  type GradientConfig,
} from './constants/maskAnalysisColors'
import { detectSeason, getSeasonVariants, getSeasonColors } from '../shared/seasonDetection'
import { getColorSeason } from '@/lib/types'
import {
  calculateCategoryValue,
  getMaskSelectionExplanation,
  toggleMaskSelection,
  isMaskSelected,
} from './maskSelectionUtils'

// Helper function to parse markdown bold syntax and render with JSX
function renderSuggestionText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-bold text-gray-800">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={idx}>{part}</span>
  })
}

interface FacePositionData {
  x: number
  y: number
  scale: number
}

interface MaskAnalysisStepProps {
  userFacePhotoUrl: string | null | undefined
  savedData?: MaskAnalysisDataDB
  onDataChange?: (data: MaskAnalysisDataDB) => void
  isReadOnly?: boolean
}

interface MaskComparison {
  id: string
  title: string
  leftLabel: string
  rightLabel: string
  leftValue: 'frio' | 'suave' | 'escuro' | 'prata'
  rightValue: 'quente' | 'brilhante' | 'claro' | 'ouro'
  leftColors?: string[]
  rightColors?: string[]
  leftGradient?: GradientConfig
  rightGradient?: GradientConfig
  backgroundType?: 'rays' | 'gradient'
}

const MASK_COMPARISONS: MaskComparison[] = [
  {
    id: 'temperatura',
    title: 'Temperatura',
    leftLabel: 'Frio',
    rightLabel: 'Quente',
    leftValue: 'frio',
    rightValue: 'quente',
    leftColors: TEMPERATURA_FRIA_COLORS,
    rightColors: TEMPERATURA_QUENTE_COLORS,
  },
  {
    id: 'temperatura2',
    title: 'Temperatura',
    leftLabel: 'Frio',
    rightLabel: 'Quente',
    leftValue: 'frio',
    rightValue: 'quente',
    leftColors: TEMPERATURA_FRIA_COLORS2,
    rightColors: TEMPERATURA_QUENTE_COLORS2,
  },
  {
    id: 'subtom',
    title: 'Subtom',
    leftLabel: 'Prata',
    rightLabel: 'Ouro',
    leftValue: 'prata',
    rightValue: 'ouro',
    leftGradient: PRATA_GRADIENT,
    rightGradient: OURO_GRADIENT,
    backgroundType: 'gradient',
  },
  {
    id: 'intensidade',
    title: 'Intensidade',
    leftLabel: 'Suave',
    rightLabel: 'Brilhante',
    leftValue: 'suave',
    rightValue: 'brilhante',
    leftColors: INTENSIDADE_SUAVE_COLORS,
    rightColors: INTENSIDADE_BRILHANTE_COLORS,
  },
  {
    id: 'intensidade2',
    title: 'Intensidade',
    leftLabel: 'Suave',
    rightLabel: 'Brilhante',
    leftValue: 'suave',
    rightValue: 'brilhante',
    leftColors: INTENSIDADE_SUAVE_COLORS2,
    rightColors: INTENSIDADE_BRILHANTE_COLORS2,
  },
  {
    id: 'intensidade3',
    title: 'Intensidade',
    leftLabel: 'Suave',
    rightLabel: 'Brilhante',
    leftValue: 'suave',
    rightValue: 'brilhante',
    leftColors: INTENSIDADE_SUAVE_COLORS3,
    rightColors: INTENSIDADE_BRILHANTE_COLORS3,
  },
  {
    id: 'profundidade2',
    title: 'Profundidade',
    leftLabel: 'Escuro',
    rightLabel: 'Claro',
    leftValue: 'escuro',
    rightValue: 'claro',
    leftColors: PROFUNDIDADE_ESCURA_COLORS2,
    rightColors: PROFUNDIDADE_CLARO_COLORS2,
  },
  {
    id: 'profundidade',
    title: 'Profundidade',
    leftLabel: 'Escuro',
    rightLabel: 'Claro',
    leftValue: 'escuro',
    rightValue: 'claro',
    leftColors: PROFUNDIDADE_ESCURA_COLORS,
    rightColors: PROFUNDIDADE_CLARO_COLORS,
  },
  {
    id: 'profundidade3',
    title: 'Profundidade',
    leftLabel: 'Escuro',
    rightLabel: 'Claro',
    leftValue: 'escuro',
    rightValue: 'claro',
    leftColors: PROFUNDIDADE_ESCURA_COLORS3,
    rightColors: PROFUNDIDADE_CLARO_COLORS3,
  },
  {
    id: 'profundidade4',
    title: 'Profundidade',
    leftLabel: 'Escuro',
    rightLabel: 'Claro',
    leftValue: 'escuro',
    rightValue: 'claro',
    leftColors: PROFUNDIDADE_ESCURA_COLORS4,
    rightColors: PROFUNDIDADE_CLARO_COLORS4,
  },
]

const MaskAnalysisStep: React.FC<MaskAnalysisStepProps> = ({
  userFacePhotoUrl,
  savedData,
  onDataChange,
  isReadOnly,
}) => {
  const [sharedFacePosition, setSharedFacePosition] = useState<FacePositionData>(
    savedData?.facePosition || { x: 160, y: 240, scale: 1 }
  )

  // Store individual mask selections
  const [selectedMasks, setSelectedMasks] = useState<MaskSelection[]>(
    savedData?.selectedMasks || []
  )

  const [selectedSeason, setSelectedSeason] = useState<ColorSeason | null>(
    (savedData?.colorSeason as ColorSeason) ?? null
  )

  const [settingsModalOpen, setSettingsModalOpen] = useState(false)

  // Track the last loaded savedData to detect changes
  const lastLoadedDataRef = useRef<string | null>(null)
  // Track if we're currently loading saved data to prevent notifying parent
  const isLoadingDataRef = useRef(false)

  // Load saved data when it becomes available or changes
  useEffect(() => {
    if (savedData) {
      const dataHash = JSON.stringify(savedData)

      // Only load if the data has changed
      if (lastLoadedDataRef.current !== dataHash) {
        isLoadingDataRef.current = true
        lastLoadedDataRef.current = dataHash

        setSharedFacePosition(savedData.facePosition || { x: 160, y: 240, scale: 1 })
        setSelectedMasks(savedData.selectedMasks || [])
        setSelectedSeason((savedData.colorSeason as ColorSeason) ?? null)

        // Reset the loading flag after a tick to allow state to settle
        setTimeout(() => {
          isLoadingDataRef.current = false
        }, 0)
      }
    }
  }, [savedData])

  // Calculate final values from selected masks
  const calculatedTemperatura = calculateCategoryValue(selectedMasks, 'temperatura')
  const calculatedIntensidade = calculateCategoryValue(selectedMasks, 'intensidade')
  const calculatedProfundidade = calculateCategoryValue(selectedMasks, 'profundidade')

  // Get subtom selection (only one allowed)
  const subtomSelection = selectedMasks.find(
    (m) => m.id === 'subtom'
  )

  // Detect season based on calculated values
  const seasonResult = detectSeason(
    calculatedTemperatura as 'frio' | 'quente' | 'neutro' | null,
    calculatedIntensidade as 'suave' | 'brilhante' | 'neutro' | null,
    calculatedProfundidade as 'escuro' | 'claro' | 'neutro' | null
  )

  // Emit data changes to parent
  useEffect(() => {
    if (isLoadingDataRef.current) return

    onDataChange?.({
      selectedMasks,
      temperatura: calculatedTemperatura,
      intensidade: calculatedIntensidade,
      profundidade: calculatedProfundidade,
      subtom: subtomSelection ? (subtomSelection.value as 'ouro' | 'prata') : null,
      colorSeason: selectedSeason,
      facePosition: sharedFacePosition,
    })
  }, [
    selectedMasks,
    sharedFacePosition,
    selectedSeason,
    calculatedTemperatura,
    calculatedIntensidade,
    calculatedProfundidade,
    subtomSelection,
    onDataChange,
  ])

  const handleFacePositionChange = useCallback((data: FacePositionData) => {
    setSharedFacePosition(data)
  }, [])

  const handleMaskSelection = useCallback(
    (
      comparisonId: string,
      value: 'frio' | 'quente' | 'suave' | 'brilhante' | 'escuro' | 'claro' | 'ouro' | 'prata'
    ) => {
      if (isReadOnly) return

      // For subtom, only allow one selection
      if (comparisonId === 'subtom') {
        const existingSubtom = selectedMasks.find((m) => m.id === 'subtom')
        if (existingSubtom && existingSubtom.value === value) {
          // Toggle off
          setSelectedMasks(selectedMasks.filter((m) => m.id !== 'subtom'))
        } else {
          // Replace existing or add new
          const filtered = selectedMasks.filter((m) => m.id !== 'subtom')
          setSelectedMasks([...filtered, { id: comparisonId, value }])
        }
      } else {
        // For other masks, allow multiple selections
        setSelectedMasks(toggleMaskSelection(selectedMasks, comparisonId, value))
      }

      // Clear selected season when any mask changes (since season depends on the values)
      setSelectedSeason(null)
    },
    [selectedMasks, isReadOnly]
  )

  const temperatureExplanation = getMaskSelectionExplanation(selectedMasks, 'temperatura')
  const intensidadeExplanation = getMaskSelectionExplanation(selectedMasks, 'intensidade')
  const profundidadeExplanation = getMaskSelectionExplanation(selectedMasks, 'profundidade')

  return (
    <div className="space-y-6">
      <PositionControlsPanel
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        faceData={sharedFacePosition}
        onDataChange={setSharedFacePosition}
      />

      {isReadOnly && (
        <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded">
          🔒 Modo visualização - Esta análise já foi concluída
        </div>
      )}

      {/* Display current parameters - Fixed Floating Component */}
      {selectedMasks.length > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white shadow-lg rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
              Parâmetros
            </span>
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Temp:</span>
                <span className={`font-semibold ${!calculatedTemperatura ? 'text-gray-400' : 'text-secondary'}`}>
                  {calculatedTemperatura || '-'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Int:</span>
                <span className={`font-semibold ${!calculatedIntensidade ? 'text-gray-400' : 'text-secondary'}`}>
                  {calculatedIntensidade || '-'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Prof:</span>
                <span className={`font-semibold ${!calculatedProfundidade ? 'text-gray-400' : 'text-secondary'}`}>
                  {calculatedProfundidade || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mask Comparisons */}
      {MASK_COMPARISONS.map((comparison) => (
        <Card key={comparison.id} className="border-secondary border-2 rounded-xl">
          <div className="mb-6">
            <h2 className="text-2xl font-fraunces font-bold text-secondary mb-1">
              {comparison.title}
            </h2>
            <p className="text-sm text-gray-600">
              {isReadOnly
                ? 'Visualize a seleção da máscara.'
                : 'Selecione uma ou ambas as máscaras.'}
            </p>
          </div>

          <div className="grid items-start" style={{ gridTemplateColumns: '1fr auto 1fr', gap: '1rem' }}>
            {/* Left Option */}
            <div
              className={`relative ${isReadOnly ? '' : 'cursor-pointer'} transition-all duration-200 rounded-xl p-1 ${
                isMaskSelected(selectedMasks, comparison.id, comparison.leftValue)
                  ? 'ring-2 ring-secondary'
                  : isReadOnly
                    ? 'border-2 border-gray-200'
                    : 'border-2 border-dashed border-gray-300 hover:border-secondary'
              }`}
              onClick={() =>
                !isReadOnly && handleMaskSelection(comparison.id, comparison.leftValue)
              }
            >
              <div className="my-2 text-center">
                <h3 className="text-sm font-semibold text-gray-700">{comparison.leftLabel}</h3>
              </div>
              <MaskCanvas
                userFacePhotoUrl={userFacePhotoUrl}
                faceData={sharedFacePosition}
                onDataChange={handleFacePositionChange}
                rayColors={comparison.leftColors}
                gradient={comparison.leftGradient}
                backgroundType={comparison.backgroundType || 'rays'}
                desaturate={comparison.id === 'profundidade2'}
                onSettingsClick={() => setSettingsModalOpen(true)}
              />
              {isMaskSelected(selectedMasks, comparison.id, comparison.leftValue) && (
                <div className="absolute top-4 right-4 bg-secondary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  ✓
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-400 text-4xl font-bold p-4">+</span>
            </div>

            {/* Right Option */}
            <div
              className={`relative ${isReadOnly ? '' : 'cursor-pointer'} transition-all duration-200 rounded-xl p-1 ${
                isMaskSelected(selectedMasks, comparison.id, comparison.rightValue)
                  ? 'ring-2 ring-secondary'
                  : isReadOnly
                    ? 'border-2 border-gray-200'
                    : 'border-2 border-dashed border-gray-300 hover:border-secondary'
              }`}
              onClick={() =>
                !isReadOnly && handleMaskSelection(comparison.id, comparison.rightValue)
              }
            >
              <div className="my-2 text-center">
                <h3 className="text-sm font-semibold text-gray-700">{comparison.rightLabel}</h3>
              </div>
              <MaskCanvas
                userFacePhotoUrl={userFacePhotoUrl}
                faceData={sharedFacePosition}
                onDataChange={handleFacePositionChange}
                rayColors={comparison.rightColors}
                gradient={comparison.rightGradient}
                backgroundType={comparison.backgroundType || 'rays'}
                desaturate={comparison.id === 'profundidade2'}
                onSettingsClick={() => setSettingsModalOpen(true)}
              />
              {isMaskSelected(selectedMasks, comparison.id, comparison.rightValue) && (
                <div className="absolute top-4 right-4 bg-secondary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  ✓
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}

      {/* Season Selection - Shows after all parameters are set */}
      {calculatedTemperatura && calculatedIntensidade && calculatedProfundidade && (
        <>
          {seasonResult.valid && seasonResult.season && (
            <Card className="border-secondary border-2 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="mb-6">
                <h2 className="text-2xl font-fraunces font-bold text-secondary mb-1">
                  {seasonResult.season}
                </h2>
                <p className="text-sm text-gray-600">
                  Selecione a variante do {seasonResult.season} que melhor corresponde ao seu tom.
                </p>
              </div>

              <div
                className="grid items-start"
                style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}
              >
                {getSeasonVariants(seasonResult.season!).map((variant) => (
                  <div
                    key={variant}
                    className={`relative ${
                      isReadOnly ? '' : 'cursor-pointer'
                    } transition-all duration-200 rounded-xl p-2 text-center ${
                      selectedSeason === getColorSeason(seasonResult.season!, variant)
                        ? 'ring-2 ring-secondary bg-white'
                        : isReadOnly
                          ? 'border-2 border-gray-200 bg-gray-50'
                          : 'border-2 border-dashed border-gray-300 hover:border-secondary bg-gray-50'
                    }`}
                    onClick={() =>
                      !isReadOnly &&
                      setSelectedSeason(getColorSeason(seasonResult.season!, variant))
                    }
                  >
                    <div className="mb-2">
                      <h3 className="font-semibold text-gray-700">{variant}</h3>
                    </div>
                    <MaskCanvas
                      userFacePhotoUrl={userFacePhotoUrl}
                      faceData={sharedFacePosition}
                      onDataChange={handleFacePositionChange}
                      rayColors={getSeasonColors(seasonResult.season!, variant)}
                      onSettingsClick={() => setSettingsModalOpen(true)}
                    />
                    {selectedSeason === getColorSeason(seasonResult.season!, variant) && (
                      <div className="absolute top-4 right-4 bg-secondary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                        ✓
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {!seasonResult.valid && (
            <Card className="border-red-400 border-2 rounded-xl bg-red-50">
              <div className="mb-4">
                <h2 className="text-2xl font-fraunces font-bold text-red-600 mb-2">
                  {seasonResult.hasneutroValue
                    ? 'Parâmetro(s) neutro(s)'
                    : 'Combinação Inválida'}
                </h2>
                <p className="text-sm text-gray-700 mb-4">
                  A combinação selecionada não corresponde a nenhuma estação de cores válida.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                <p className="text-sm font-semibold text-gray-700 mb-3">O que fazer para conseguir as seguintes estações:</p>
                <ul className="space-y-2">
                  {seasonResult.suggestions?.map((suggestion, idx) => (
                    suggestion.trim() === '' ? (
                      <div key={idx} />
                    ) : suggestion.startsWith('**Outras') || suggestion.startsWith('❌') ? (
                      <li
                        key={idx}
                        className="text-sm font-semibold text-gray-700 mt-4 pt-3 border-t border-gray-200"
                      >
                        {renderSuggestionText(suggestion)}
                      </li>
                    ) : suggestion.startsWith('  •') ? (
                      <li key={idx} className="text-sm text-gray-600 ml-4">
                        {renderSuggestionText(suggestion)}
                      </li>
                    ) : (
                      <li key={idx} className="text-sm text-gray-600 flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span>{renderSuggestionText(suggestion)}</span>
                      </li>
                    )
                  ))}
                </ul>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

export default MaskAnalysisStep
