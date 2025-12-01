'use client'

import { useCallback, useState } from 'react'
import { Tag, Tooltip, Typography, Button } from 'antd'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlassChart } from '@fortawesome/free-solid-svg-icons'
import { PigmentTemperatureDataUI, ProfundidadeComparisonUI, PigmentAnalysisDataUI } from '@/lib/types-ui'
import { hexToRgb, rgbToHsl } from '../../shared/colorConversion'
import { getLabelColor, getLabelCategory, COLOR_FIELDS } from '../../shared/PigmentAnalysisUtils'
import { detectSeasonFromSliders } from '../../shared/seasonDetection'
import { SliderWithAverageMarker } from './SliderWithAverageMarker'
import { AverageCalculatorDialog } from './AverageCalculatorDialog'

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
  isReadOnly?: boolean
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

/**
 * Build tooltip content showing individual values and average calculation
 */
const buildAverageTooltipContent = (
  stepData: PigmentTemperatureDataUI | ProfundidadeComparisonUI[] | undefined,
  average: number | null
) => {
  if (!stepData || average === null) return 'Sem dados'

  if (Array.isArray(stepData)) {
    // For profundidade (array of comparisons)
    const values = stepData
      .filter((item) => item.value !== null)
      .map((item) => item.value as number)

    if (values.length === 0) return 'Sem dados'

    return (
      <div className="text-xs space-y-1">
        <div className="font-semibold mb-2">Valores individuais:</div>
        {values.map((val, idx) => (
          <div key={idx} className="text-gray-700">
            • {val}
          </div>
        ))}
        <div className="border-t border-gray-400 pt-1 mt-2 font-semibold">
          Média: ({values.join(' + ')}) / {values.length} = <span>{average}</span>
        </div>
      </div>
    )
  } else {
    // For temperatura and intensidade (object)
    const values = Object.entries(stepData)
      .filter(([, v]) => v.temperature !== null)
      .map(([key, v]) => ({ key, value: v.temperature as number }))

    if (values.length === 0) return 'Sem dados'

    const numValues = values.map(v => v.value)
    return (
      <div className="text-xs space-y-1">
        <div className="font-semibold mb-2">Valores individuais:</div>
        {values.map(({ key, value }, idx) => (
          <div key={idx} className="text-gray-700">
            • {key}: {value}
          </div>
        ))}
        <div className="border-t border-gray-400 pt-1 mt-2 font-semibold">
          Média: ({numValues.join(' + ')}) / {numValues.length} = <span>{average}</span>
        </div>
      </div>
    )
  }
}

export const GeralSummaryComponent = ({
  extractedColors,
  analysisData,
  userFacePhotoUrl,
  onGeralChange,
  isReadOnly,
}: GeralSummaryComponentProps) => {
  // Dialog state management
  const [openDialog, setOpenDialog] = useState<'temperatura' | 'intensidade' | 'profundidade' | null>(null)

  // Calculate averages from individual steps
  const avgTemperatura = calculateAverageFromStep(analysisData.temperatura)
  const avgIntensidade = calculateAverageFromStep(analysisData.intensidade)
  const avgProfundidade = calculateAverageFromStep(analysisData.profundidade)

  const geralTemperatura = analysisData.geral?.temperatura ?? 50
  const geralIntensidade = analysisData.geral?.intensidade ?? 50
  const geralProfundidade = analysisData.geral?.profundidade ?? 50

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
    <>
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
            <div className="flex gap-6 mb-6 items-end justify-between">

              <div className="flex items-end gap-4">
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
                  title={buildAverageTooltipContent(analysisData.temperatura, avgTemperatura)}
                  color="#fff"
                  destroyOnHidden
                >
                  <div
                    className="flex flex-col cursor-help"
                  >
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

              <Button
                type="primary"
                size="small"
                className="!w-8 !h-8 !p-0 flex items-center justify-center"
                onClick={() => setOpenDialog('temperatura')}
              >
                <FontAwesomeIcon icon={faMagnifyingGlassChart} />
              </Button>
            </div>

            <SliderWithAverageMarker
              value={geralTemperatura}
              averageValue={avgTemperatura}
              onChange={handleTemperaturaChange}
              disabled={isReadOnly}
            />
          </div>

          {/* Intensidade */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex gap-6 mb-6 items-end justify-between">

              <div className="flex items-end gap-4">
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
                  title={buildAverageTooltipContent(analysisData.intensidade, avgIntensidade)}
                  color="#fff"
                  destroyOnHidden
                >
                  <div
                    className="flex flex-col cursor-help"
                  >
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

              <Button
                type="primary"
                size="small"
                className="!w-8 !h-8 !p-0 flex items-center justify-center"
                onClick={() => setOpenDialog('intensidade')}
              >
                <FontAwesomeIcon icon={faMagnifyingGlassChart} />
              </Button>
            </div>

            <SliderWithAverageMarker
              value={geralIntensidade}
              averageValue={avgIntensidade}
              onChange={handleIntensidadeChange}
              disabled={isReadOnly}
            />
          </div>

          {/* Profundidade */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex gap-6 mb-6 items-end justify-between">

              <div className="flex items-end gap-4">
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
                  title={buildAverageTooltipContent(analysisData.profundidade, avgProfundidade)}
                  color="#fff"
                  destroyOnHidden
                >
                  <div
                    className="flex flex-col cursor-help"
                  >
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

              <Button
                type="primary"
                size="small"
                className="!w-8 !h-8 !p-0 flex items-center justify-center"
                onClick={() => setOpenDialog('profundidade')}
              >
                <FontAwesomeIcon icon={faMagnifyingGlassChart} />
              </Button>
            </div>

            <SliderWithAverageMarker
              value={geralProfundidade}
              averageValue={avgProfundidade}
              onChange={handleProfundidadeChange}
              disabled={isReadOnly}
            />
          </div>
        </div>
      </div>

      {/* Average Calculator Dialogs */}
      <AverageCalculatorDialog
        isOpen={openDialog === 'temperatura'}
        onClose={() => setOpenDialog(null)}
        stepData={analysisData.temperatura}
        stepName="temperatura"
        currentAverage={avgTemperatura}
      />

      <AverageCalculatorDialog
        isOpen={openDialog === 'intensidade'}
        onClose={() => setOpenDialog(null)}
        stepData={analysisData.intensidade}
        stepName="intensidade"
        currentAverage={avgIntensidade}
      />

      <AverageCalculatorDialog
        isOpen={openDialog === 'profundidade'}
        onClose={() => setOpenDialog(null)}
        stepData={analysisData.profundidade}
        stepName="profundidade"
        currentAverage={avgProfundidade}
      />
    </>
  )
}
