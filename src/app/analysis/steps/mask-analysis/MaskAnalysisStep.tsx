'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Card } from 'antd'
import MaskCanvas from './MaskCanvas'
import { MaskAnalysisDataDB, ColorSeason } from '@/lib/types-db'
import { PROFUNDIDADE_ESCURA_COLORS, PROFUNDIDADE_CLARA_COLORS, TEMPERATURA_FRIA_COLORS, TEMPERATURA_QUENTE_COLORS, INTENSIDADE_SUAVE_COLORS, INTENSIDADE_BRILHANTE_COLORS, PROFUNDIDADE_ESCURA_COLORS2, PROFUNDIDADE_CLARA_COLORS2, TEMPERATURA_FRIA_COLORS2, TEMPERATURA_QUENTE_COLORS2, OURO_GRADIENT, PRATA_GRADIENT, type GradientConfig } from './constants/maskAnalysisColors'
import { detectSeason, getSeasonVariants, getSeasonColors } from '../shared/seasonDetection'
import { getColorSeason } from '@/lib/types'

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
  id: 'temperatura' | 'temperatura2' | 'intensidade' | 'profundidade' | 'profundidade2' | 'subtom'
  title: string
  leftLabel: string
  rightLabel: string
  leftValue: 'fria' | 'suave' | 'escuro' | 'prata'
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
    leftLabel: 'Fria',
    rightLabel: 'Quente',
    leftValue: 'fria',
    rightValue: 'quente',
    leftColors: TEMPERATURA_FRIA_COLORS,
    rightColors: TEMPERATURA_QUENTE_COLORS,
  },
  {
    id: 'temperatura2',
    title: 'Temperatura (2)',
    leftLabel: 'Fria',
    rightLabel: 'Quente',
    leftValue: 'fria',
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
    id: 'profundidade',
    title: 'Profundidade',
    leftLabel: 'Escuro',
    rightLabel: 'Claro',
    leftValue: 'escuro',
    rightValue: 'claro',
    leftColors: PROFUNDIDADE_ESCURA_COLORS,
    rightColors: PROFUNDIDADE_CLARA_COLORS,
  },
  {
    id: 'profundidade2',
    title: 'Profundidade (2)',
    leftLabel: 'Escuro',
    rightLabel: 'Claro',
    leftValue: 'escuro',
    rightValue: 'claro',
    leftColors: PROFUNDIDADE_ESCURA_COLORS2,
    rightColors: PROFUNDIDADE_CLARA_COLORS2,
  },
]

const MaskAnalysisStep: React.FC<MaskAnalysisStepProps> = ({ userFacePhotoUrl, savedData, onDataChange, isReadOnly }) => {
  const [sharedFacePosition, setSharedFacePosition] = useState<FacePositionData>(
    savedData?.facePosition || { x: 160, y: 240, scale: 1 }
  )
  const [selectedMasks, setSelectedMasks] = useState<{ [key: string]: 'fria' | 'quente' | 'suave' | 'brilhante' | 'escuro' | 'claro' | 'ouro' | 'prata' | null }>({
    temperatura: savedData?.temperatura ?? null,
    temperatura2: savedData?.temperatura ?? null,
    intensidade: savedData?.intensidade ?? null,
    profundidade: savedData?.profundidade ?? null,
    profundidade2: savedData?.profundidade ?? null,
    subtom: savedData?.subtom ?? null,
  })
  const [selectedSeason, setSelectedSeason] = useState<ColorSeason | null>(
    (savedData?.colorSeason as ColorSeason) ?? null
  )
  
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
        setSelectedMasks({
          temperatura: savedData.temperatura ?? null,
          temperatura2: savedData.temperatura ?? null,
          intensidade: savedData.intensidade ?? null,
          profundidade: savedData.profundidade ?? null,
          profundidade2: savedData.profundidade ?? null,
          subtom: savedData.subtom ?? null,
        })
        setSelectedSeason((savedData.colorSeason as ColorSeason) ?? null)
        
        // Reset the loading flag after a tick to allow state to settle
        setTimeout(() => {
          isLoadingDataRef.current = false
        }, 0)
      }
    }
  }, [savedData])

  // Detect season based on selections
  const seasonResult = detectSeason(
    selectedMasks.temperatura as 'fria' | 'quente' | null,
    selectedMasks.intensidade as 'suave' | 'brilhante' | null,
    selectedMasks.profundidade as 'escuro' | 'claro' | null
  )

  // Emit data changes to parent - only emit primary temperature and profundidade
  // temperatura2 and profundidade2 are synced locally but not saved to DB
  // Skip notification when we're loading data from saved state to prevent loops
  useEffect(() => {
    if (isLoadingDataRef.current) return
    
    onDataChange?.({
      temperatura: selectedMasks.temperatura as 'fria' | 'quente' | null,
      intensidade: selectedMasks.intensidade as 'suave' | 'brilhante' | null,
      profundidade: selectedMasks.profundidade as 'escuro' | 'claro' | null,
      subtom: selectedMasks.subtom as 'ouro' | 'prata' | null,
      colorSeason: selectedSeason,
      facePosition: sharedFacePosition,
    })
  }, [selectedMasks, sharedFacePosition, selectedSeason, onDataChange])

  const handleFacePositionChange = useCallback((data: FacePositionData) => {
    setSharedFacePosition(data)
  }, [])

  const handleMaskSelection = useCallback((comparisonId: string, value: 'fria' | 'quente' | 'suave' | 'brilhante' | 'escuro' | 'claro' | 'ouro' | 'prata') => {
    if (isReadOnly) return
    
    setSelectedMasks((prev) => {
      const updated = {
        ...prev,
        [comparisonId]: prev[comparisonId] === value ? null : value,
      }

      // Sync temperatura and temperatura2 - both rows always show the same value
      if (comparisonId === 'temperatura') {
        updated.temperatura2 = updated.temperatura
      } else if (comparisonId === 'temperatura2') {
        updated.temperatura = updated.temperatura2
      }

      // Sync profundidade and profundidade2 - both rows always show the same value
      if (comparisonId === 'profundidade') {
        updated.profundidade2 = updated.profundidade
      } else if (comparisonId === 'profundidade2') {
        updated.profundidade = updated.profundidade2
      }

      return updated
    })
    
    // Clear selected season when any mask changes (since season depends on the other options)
    setSelectedSeason(null)
  }, [isReadOnly])

  return (
    <div className="space-y-6">
      {isReadOnly && (
        <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded">
          🔒 Modo visualização - Esta análise já foi concluída
        </div>
      )}
      {MASK_COMPARISONS.map((comparison) => (
        <Card key={comparison.id} className="border-secondary border-2 rounded-xl">
          <div className="mb-6">
            <h2 className="text-2xl font-fraunces font-bold text-secondary mb-1">
              {comparison.title}
            </h2>
            <p className="text-sm text-gray-600">
              {isReadOnly ? 'Visualize a seleção da máscara.' : 'Selecione qual máscara melhor se adapta ao rosto.'}
            </p>
          </div>

          <div className="grid items-start" style={{ gridTemplateColumns: '1fr auto 1fr', gap: '1rem' }}>
            {/* Left Option */}
            <div
              className={`relative ${isReadOnly ? '' : 'cursor-pointer'} transition-all duration-200 rounded-xl p-1 ${
                selectedMasks[comparison.id] === comparison.leftValue
                  ? 'ring-2 ring-secondary'
                  : isReadOnly ? 'border-2 border-gray-200' : 'border-2 border-dashed border-gray-300 hover:border-secondary'
              }`}
              onClick={() => !isReadOnly && handleMaskSelection(comparison.id, comparison.leftValue)}
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
              />
              {selectedMasks[comparison.id] === comparison.leftValue && (
                <div className="absolute top-4 right-4 bg-secondary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  ✓
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-400 text-4xl font-bold p-4">×</span>
            </div>

            {/* Right Option */}
            <div
              className={`relative ${isReadOnly ? '' : 'cursor-pointer'} transition-all duration-200 rounded-xl p-1 ${
                selectedMasks[comparison.id] === comparison.rightValue
                  ? 'ring-2 ring-secondary'
                  : isReadOnly ? 'border-2 border-gray-200' : 'border-2 border-dashed border-gray-300 hover:border-secondary'
              }`}
              onClick={() => !isReadOnly && handleMaskSelection(comparison.id, comparison.rightValue)}
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
              />
              {selectedMasks[comparison.id] === comparison.rightValue && (
                <div className="absolute top-4 right-4 bg-secondary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  ✓
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}

      {/* Season Selection - Shows after all masks are selected */}
      {selectedMasks.temperatura && selectedMasks.intensidade && selectedMasks.profundidade && (
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

              <div className="grid items-start" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {getSeasonVariants(seasonResult.season!).map((variant) => (
                  <div
                    key={variant}
                    className={`relative ${isReadOnly ? '' : 'cursor-pointer'} transition-all duration-200 rounded-xl p-4 text-center ${
                      selectedSeason === getColorSeason(seasonResult.season!, variant)
                        ? 'ring-2 ring-secondary bg-white'
                        : isReadOnly ? 'border-2 border-gray-200 bg-gray-50' : 'border-2 border-dashed border-gray-300 hover:border-secondary bg-gray-50'
                    }`}
                    onClick={() => !isReadOnly && setSelectedSeason(getColorSeason(seasonResult.season!, variant))}
                  >
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-700">{variant}</h3>
                    </div>
                    <MaskCanvas
                      userFacePhotoUrl={userFacePhotoUrl}
                      faceData={sharedFacePosition}
                      onDataChange={handleFacePositionChange}
                      rayColors={getSeasonColors(seasonResult.season!, variant)}
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
                  Combinação Inválida
                </h2>
                <p className="text-sm text-gray-700 mb-4">
                  A combinação selecionada (Temperatura: <strong>{selectedMasks.temperatura}</strong>, 
                  Intensidade: <strong>{selectedMasks.intensidade}</strong>, 
                  Profundidade: <strong>{selectedMasks.profundidade}</strong>) não corresponde a nenhuma estação.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                <p className="text-sm font-semibold text-gray-700 mb-3">Sugestões:</p>
                <ul className="space-y-2">
                  {seasonResult.suggestions?.map((suggestion, idx) => (
                    suggestion.trim() === '' ? (
                      <div key={idx} />
                    ) : suggestion.startsWith('**Outras') ? (
                      <li key={idx} className="text-sm font-semibold text-gray-700 mt-4 pt-3 border-t border-gray-200">
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
