'use client'

import { Tag, Tooltip, Typography } from 'antd'
import { PigmentTemperatureDataUI, ProfundidadeComparisonUI, PigmentAnalysisDataUI } from '@/lib/types-ui'
import { hexToRgb, rgbToHsl } from '../utils/colorConversion'
import { getLabelColor, getLabelCategory, COLOR_FIELDS } from '../utils/PigmentAnalysisUtils'
import { SliderWithAverageMarker } from './SliderWithAverageMarker'

const { Text } = Typography

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
                <Tooltip key={`orig-${field}`} title={label} color="#fff">
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
                <Tooltip key={`desat-${field}`} title={label} color="#fff">
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

            <Tooltip
              title={
                <div className="text-xs space-y-1">
                  <div className="font-semibold mb-2">
                    Cálculo da Média Individual
                  </div>
                  {analysisData.temperatura &&
                    Object.entries(analysisData.temperatura).map(
                      ([field, data]) => (
                        <div key={field}>
                          {
                            COLOR_FIELDS.find((f) => f.value === field)
                              ?.label
                          }
                          : {data.temperature}
                        </div>
                      )
                    )}
                  <div className="border-t border-gray-400 pt-1 mt-2 font-semibold">
                    Total:{' '}
                    {Object.values(analysisData.temperatura || {}).reduce(
                      (sum, d) => sum + (d.temperature ?? 0),
                      0
                    )}{' '}
                    ÷ {Object.keys(analysisData.temperatura || {}).length} ={' '}
                    {avgTemperatura}
                  </div>
                </div>
              }
              color="#fff"
            >
              <div className="flex flex-col cursor-help">
                <Text type="secondary" className="text-xs mb-2">
                  Média dos Individuais*
                </Text>
                <Text code className="text-base hover:text-blue-500">
                  {avgTemperatura}
                </Text>
              </div>
            </Tooltip>

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
            onChange={(value) => onGeralChange('temperatura', value)}
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

            <Tooltip
              title={
                <div className="text-xs space-y-1">
                  <div className="font-semibold mb-2">
                    Cálculo da Média Individual
                  </div>
                  {analysisData.intensidade &&
                    Object.entries(analysisData.intensidade).map(
                      ([field, data]) => (
                        <div key={field}>
                          {
                            COLOR_FIELDS.find((f) => f.value === field)
                              ?.label
                          }
                          : {data.temperature}
                        </div>
                      )
                    )}
                  <div className="border-t border-gray-400 pt-1 mt-2 font-semibold">
                    Total:{' '}
                    {Object.values(analysisData.intensidade || {}).reduce(
                      (sum, d) => sum + (d.temperature ?? 0),
                      0
                    )}{' '}
                    ÷ {Object.keys(analysisData.intensidade || {}).length} ={' '}
                    {avgIntensidade}
                  </div>
                </div>
              }
              color="#fff"
            >
              <div className="flex flex-col cursor-help">
                <Text type="secondary" className="text-xs mb-2">
                  Média dos Individuais*
                </Text>
                <Text code className="text-base hover:text-blue-500">
                  {avgIntensidade}
                </Text>
              </div>
            </Tooltip>

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
            onChange={(value) => onGeralChange('intensidade', value)}
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

            <Tooltip
              title={
                <div className="text-xs space-y-1">
                  <div className="font-semibold mb-2">
                    Cálculo da Média Individual
                  </div>
                  {analysisData.profundidade &&
                    analysisData.profundidade.map((comparison, idx) => (
                      <div key={idx}>
                        {comparison.name}: {comparison.value}
                      </div>
                    ))}
                  <div className="border-t border-gray-400 pt-1 mt-2 font-semibold">
                    Total:{' '}
                    {analysisData.profundidade?.reduce(
                      (sum, p) => sum + (p.value ?? 0),
                      0
                    ) || 0}{' '}
                    ÷ {analysisData.profundidade?.length || 1} ={' '}
                    {avgProfundidade}
                  </div>
                </div>
              }
              color="#fff"
            >
              <div className="flex flex-col cursor-help">
                <Text type="secondary" className="text-xs mb-2">
                  Média dos Individuais*
                </Text>
                <Text code className="text-base hover:text-blue-500">
                  {avgProfundidade}
                </Text>
              </div>
            </Tooltip>

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
            onChange={(value) => onGeralChange('profundidade', value)}
          />
        </div>
      </div>
    </div>
  )
}
