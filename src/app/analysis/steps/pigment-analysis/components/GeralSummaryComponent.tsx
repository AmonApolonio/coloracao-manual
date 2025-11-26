'use client'

import { useCallback } from 'react'
import { Tag, Tooltip, Typography } from 'antd'
import { PigmentTemperatureDataUI, ProfundidadeComparisonUI, PigmentAnalysisDataUI } from '@/lib/types-ui'
import { hexToRgb, rgbToHsl } from '../../shared/colorConversion'
import { getLabelColor, getLabelCategory, COLOR_FIELDS } from '../../shared/PigmentAnalysisUtils'
import { detectSeasonFromSliders } from '../../shared/seasonDetection'
import { SliderWithAverageMarker } from './SliderWithAverageMarker'

const { Text } = Typography

/**
 * Calculate how far each value is from 50 (the center)
 * Returns the distance, where max is 50
 */
const getDistance = (value: number | null): number => {
  if (value === null) return 0
  return Math.abs(value - 50)
}

interface GeralSummaryComponentProps {
  extractedColors: { [key: string]: string }
  analysisData: PigmentAnalysisDataUI
  userFacePhotoUrl?: string
  onGeralChange: (
    key: 'temperatura' | 'intensidade' | 'profundidade',
    value: number
  ) => void
}

const calculateAverageFromStep = (
  stepData: PigmentTemperatureDataUI | ProfundidadeComparisonUI[] | undefined
): number | null => {
  if (!stepData) return null

  if (Array.isArray(stepData)) {
    // For profundidade (array of comparisons)
    const validValues = stepData
      .filter((item) => item.value !== null)
      .map((item) => item.value as number)
    if (validValues.length === 0) return null
    const sum = validValues.reduce((acc, item) => acc + item, 0)
    return Math.round(sum / validValues.length)
  } else {
    // For temperatura and intensidade (object)
    const values = Object.values(stepData)
      .filter((v) => v.temperature !== null)
      .map((v) => v.temperature as number)
    if (values.length === 0) return null
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  }
}

const getDesaturatedColor = (hex: string): string => {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  // Return grayscale by setting saturation to 0
  return `hsl(${hsl.h}, 0%, ${hsl.l}%)`
}

export const GeralSummaryComponent = ({
  extractedColors,
  analysisData,
  userFacePhotoUrl,
  onGeralChange,
}: GeralSummaryComponentProps) => {
  // Calculate averages from individual steps
  const avgTemperatura = calculateAverageFromStep(analysisData.temperatura)
  const avgIntensidade = calculateAverageFromStep(analysisData.intensidade)
  const avgProfundidade = calculateAverageFromStep(analysisData.profundidade)

  const geralTemperatura = analysisData.geral?.temperatura ?? avgTemperatura
  const geralIntensidade = analysisData.geral?.intensidade ?? avgIntensidade
  const geralProfundidade = analysisData.geral?.profundidade ?? avgProfundidade

  // Get all extracted colors for display - sorted by COLOR_FIELDS order
  const colorSwatches = COLOR_FIELDS.filter(
    (field) => field.value in extractedColors
  ).map((field) => {
    return {
      field: field.value,
      label: field.label,
      hex: extractedColors[field.value],
    }
  })

  // Get expected season based on slider positions
  const expectedSeason = detectSeasonFromSliders(geralTemperatura, geralIntensidade, geralProfundidade)

  // Memoize change handlers to prevent unnecessary re-renders
  const handleTemperaturaChange = useCallback((value: number) => {
    onGeralChange('temperatura', value)
  }, [onGeralChange])

  const handleIntensidadeChange = useCallback((value: number) => {
    onGeralChange('intensidade', value)
  }, [onGeralChange])

  const handleProfundidadeChange = useCallback((value: number) => {
    onGeralChange('profundidade', value)
  }, [onGeralChange])

  return (
    <div className="space-y-8">
      {/* Colors Reference Section */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Cores Extraídas</h3>

        {/* Three Column Layout: Photo | Original Colors | Desaturated Colors */}
        <div className="grid grid-cols-3 gap-5">
          {/* User Photo Column */}
          <div className="flex flex-col items-center justify-start">
            {userFacePhotoUrl && (
              <img
                src={userFacePhotoUrl}
                alt="User face"
                className="w-full h-auto rounded-lg object-cover border-2 border-gray-300 shadow-md"
              />
            )}
          </div>

          {/* Original Colors Column */}
          <div>
            <div className="space-y-2">
              {colorSwatches.map(({ field, label, hex }) => (
                <Tooltip key={`orig-${field}`} title={label} color="#fff" destroyOnHidden>
                  <div
                    className="w-full h-10 rounded-lg border-2 border-gray-300 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                    style={{ backgroundColor: hex }}
                  />
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Desaturated Colors Column */}
          <div>
            <div className="space-y-2">
              {colorSwatches.map(({ field, label, hex }) => (
                <Tooltip key={`desat-${field}`} title={label} color="#fff" destroyOnHidden>
                  <div
                    className="w-full h-10 rounded-lg border-2 border-gray-300 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                    style={{ backgroundColor: getDesaturatedColor(hex) }}
                  />
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expected Season Section */}
      {expectedSeason && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Estação Resultante</h3>
          
          <div className="flex gap-3">
            <Tooltip 
              title={
                <div className="text-xs space-y-2">
                  <div className="font-semibold">Detectado por:</div>
                  <div className="space-y-1 text-gray-700">
                    <div>• Temperatura: <span className="font-medium">{getDistance(geralTemperatura)} para o {geralTemperatura && geralTemperatura > 50 ? 'Quente' : 'Frio'}</span></div>
                    <div>• Intensidade: <span className="font-medium">{getDistance(geralIntensidade)} para o {geralIntensidade && geralIntensidade > 50 ? 'Brilhante' : 'Suave'}</span></div>
                    <div>• Profundidade: <span className="font-medium">{getDistance(geralProfundidade)} para o {geralProfundidade && geralProfundidade > 50 ? 'Claro' : 'Escuro'}</span></div>
                  </div>
                </div>
              }
              color="#fff"
              destroyOnHidden
            >
              <div className="px-3 py-2 rounded bg-gray-100 border border-gray-400 cursor-help hover:bg-gray-200 hover:border-gray-500 transition-all shadow-sm">
                <Text className="text-sm font-bold text-gray-900">
                  {expectedSeason.season}
                </Text>
              </div>
            </Tooltip>

            <Tooltip 
              title={
                <div className="text-xs space-y-2">
                  <div className="font-semibold">Detectado por:</div>
                  <div className="space-y-1 text-gray-700">
                    <div>• Temperatura: <span className="font-medium">{getDistance(geralTemperatura)} para o {geralTemperatura && geralTemperatura > 50 ? 'Quente' : 'Frio'}</span></div>
                    <div>• Intensidade: <span className="font-medium">{getDistance(geralIntensidade)} para o {geralIntensidade && geralIntensidade > 50 ? 'Brilhante' : 'Suave'}</span></div>
                    <div>• Profundidade: <span className="font-medium">{getDistance(geralProfundidade)} para o {geralProfundidade && geralProfundidade > 50 ? 'Claro' : 'Escuro'}</span></div>
                  </div>
                </div>
              }
              color="#fff"
              destroyOnHidden
            >
              <div className="px-3 py-2 rounded bg-gray-100 border border-gray-400 cursor-help hover:bg-gray-200 hover:border-gray-500 transition-all shadow-sm">
                <Text className="text-sm font-bold text-gray-900">
                  {expectedSeason.variant}
                </Text>
              </div>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Summary Sliders Section */}
      <div className="space-y-6">
        {/* Temperatura */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex gap-6 mb-6">
            <div className="flex flex-col">
              <Text type="secondary" className="text-xs mb-2">
                Temperatura
              </Text>
              <Tag
                color={getLabelColor(geralTemperatura, 'temperatura')}
                className="text-white font-semibold px-3 py-1 text-xs w-fit"
              >
                {getLabelCategory(geralTemperatura, 'temperatura')}
              </Tag>
            </div>

            <div 
              className="flex flex-col cursor-help"
              title="Clique para ver o cálculo detalhado da média"
            >
              <Text type="secondary" className="text-xs mb-2">
                Média dos Individuais*
              </Text>
              <Text code className="text-base hover:text-blue-500">
                {avgTemperatura}
              </Text>
            </div>

            <div className="flex flex-col">
              <Text type="secondary" className="text-xs mb-2">
                Valor Final
              </Text>
              <Text code className="text-base">
                {geralTemperatura}
              </Text>
            </div>
          </div>

          <SliderWithAverageMarker
            value={geralTemperatura}
            averageValue={avgTemperatura}
            onChange={handleTemperaturaChange}
          />
        </div>

        {/* Intensidade */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex gap-6 mb-6">
            <div className="flex flex-col">
              <Text type="secondary" className="text-xs mb-2">
                Intensidade
              </Text>
              <Tag
                color={getLabelColor(geralIntensidade, 'intensidade')}
                className="text-white font-semibold px-3 py-1 text-xs w-fit"
              >
                {getLabelCategory(geralIntensidade, 'intensidade')}
              </Tag>
            </div>

            <div 
              className="flex flex-col cursor-help"
              title="Clique para ver o cálculo detalhado da média"
            >
              <Text type="secondary" className="text-xs mb-2">
                Média dos Individuais*
              </Text>
              <Text code className="text-base hover:text-blue-500">
                {avgIntensidade}
              </Text>
            </div>

            <div className="flex flex-col">
              <Text type="secondary" className="text-xs mb-2">
                Valor Final
              </Text>
              <Text code className="text-base">
                {geralIntensidade}
              </Text>
            </div>
          </div>

          <SliderWithAverageMarker
            value={geralIntensidade}
            averageValue={avgIntensidade}
            onChange={handleIntensidadeChange}
          />
        </div>

        {/* Profundidade */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex gap-6 mb-6">
            <div className="flex flex-col">
              <Text type="secondary" className="text-xs mb-2">
                Profundidade
              </Text>
              <Tag
                color={getLabelColor(geralProfundidade, 'profundidade')}
                className="text-white font-semibold px-3 py-1 text-xs w-fit"
              >
                {getLabelCategory(geralProfundidade, 'profundidade')}
              </Tag>
            </div>

            <div 
              className="flex flex-col cursor-help"
              title="Clique para ver o cálculo detalhado da média"
            >
              <Text type="secondary" className="text-xs mb-2">
                Média dos Individuais*
              </Text>
              <Text code className="text-base hover:text-blue-500">
                {avgProfundidade}
              </Text>
            </div>

            <div className="flex flex-col">
              <Text type="secondary" className="text-xs mb-2">
                Valor Final
              </Text>
              <Text code className="text-base">
                {geralProfundidade}
              </Text>
            </div>
          </div>

          <SliderWithAverageMarker
            value={geralProfundidade}
            averageValue={avgProfundidade}
            onChange={handleProfundidadeChange}
          />
        </div>
      </div>
    </div>
  )
}
