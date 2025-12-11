'use client'

import { useMemo, useState } from 'react'
import { Select, Tooltip, Typography, Tag, Divider } from 'antd'
import { SVGVectorData, PigmentAnalysisDataDB, MaskAnalysisDataDB, ColorSeason } from '@/lib/types-db'
import { SEASON_VARIANTS, getColorSeason } from '@/lib/types-season'
import { detectSeasonFromSliders } from '../shared/seasonDetection'
import { SliderWithAverageMarker } from '../pigment-analysis/components/SliderWithAverageMarker'
import { hexToRgb, rgbToHsl } from '../shared/colorConversion'
import { getLabelColor, getLabelCategory, COLOR_FIELDS } from '../shared/PigmentAnalysisUtils'

const { Text } = Typography

/**
 * Calculate how far each value is from 50 (the center)
 */
const getDistance = (value: number | null): number => {
  if (value === null) return 0
  return Math.abs(value - 50)
}

const getDesaturatedColor = (hex: string): string => {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  return `hsl(${hsl.h}, 0%, ${hsl.l}%)`
}

interface FinalClassificationStepProps {
  initialData: SVGVectorData | undefined
  userFacePhotoUrl?: string
  pigmentAnalysisData: PigmentAnalysisDataDB | undefined
  maskAnalysisData: MaskAnalysisDataDB | undefined
  extractedColors: { [key: string]: string }
  selectedColorSeason: ColorSeason | null | undefined
  onColorSeasonChange: (season: ColorSeason) => void
  isReadOnly?: boolean
}

export const FinalClassificationStep = ({
  initialData,
  userFacePhotoUrl,
  pigmentAnalysisData,
  maskAnalysisData,
  extractedColors,
  selectedColorSeason,
  onColorSeasonChange,
  isReadOnly,
}: FinalClassificationStepProps) => {
  // Extract geral values from pigment analysis
  const geralTemperatura = pigmentAnalysisData?.geral?.temperatura ?? null
  const geralIntensidade = pigmentAnalysisData?.geral?.intensidade ?? null
  const geralProfundidade = pigmentAnalysisData?.geral?.profundidade ?? null

  // Get detected season from sliders
  const detectedSeasonFromSliders = useMemo(
    () => detectSeasonFromSliders(geralTemperatura, geralIntensidade, geralProfundidade),
    [geralTemperatura, geralIntensidade, geralProfundidade]
  )

  // Build list of available ColorSeason options
  const colorSeasonOptions = useMemo(() => {
    const options: { label: string; value: ColorSeason }[] = []
    const seasons = ['Primavera', 'Verão', 'Outono', 'Inverno'] as const

    seasons.forEach((season) => {
      const variants = SEASON_VARIANTS[season] || []
      variants.forEach((variant) => {
        try {
          const colorSeason = getColorSeason(season, variant)
          options.push({
            label: colorSeason,
            value: colorSeason,
          })
        } catch {
          // Skip invalid combinations
        }
      })
    })

    return options
  }, [])

  // Get extracted colors for display
  const colorSwatches = useMemo(() => {
    return COLOR_FIELDS.filter((field) => field.value in extractedColors).map((field) => {
      return {
        field: field.value,
        label: field.label,
        hex: extractedColors[field.value],
      }
    })
  }, [extractedColors])

  return (
    <div className="space-y-6 w-full py-5">
      {isReadOnly && (
        <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded">
          🔒 Modo visualização - Esta análise já foi concluída
        </div>
      )}
      {/* Main Season Selection - Prominent at top */}
      <div className="rounded-xl p-6 border-2 border-secondary shadow-sm" style={{ backgroundColor: '#F5F0EA' }}>
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1">
            <Text type="secondary" className="text-xs font-semibold uppercase tracking-wide block mb-3 text-white">
              Classificação Final da Estação
            </Text>
            <Select
              value={selectedColorSeason || undefined}
              onChange={isReadOnly ? undefined : onColorSeasonChange}
              options={colorSeasonOptions}
              placeholder="Selecione a estação..."
              className="w-full"
              size="large"
              disabled={isReadOnly}
              style={{
                borderColor: selectedColorSeason ? '#947B62' : undefined,
              }}
            />
          </div>
        </div>
      </div>

      {/* Grid Layout for compact information */}
      <div className="grid grid-cols-3 gap-4">
        {/* Photo and Colors */}
        <div className="col-span-1">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase text-gray-600">Foto</h4>

            {userFacePhotoUrl && (
              <img
                src={userFacePhotoUrl}
                alt="User face"
                className="w-full h-auto rounded-lg object-cover border border-gray-300 shadow-sm"
              />
            )}
          </div>
        </div>

        {/* Season from Mask */}
        <div className="col-span-1">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase text-gray-600">Análise Máscaras</h4>

            {maskAnalysisData?.temperatura && (
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-300 space-y-2">
                <div className="flex gap-1 flex-wrap">
                  <Tag color="blue" className="text-xs">
                    {maskAnalysisData.temperatura === 'quente' ? '🔥 Quente' : '❄️ Frio'}
                  </Tag>
                  <Tag color="blue" className="text-xs">
                    {maskAnalysisData.intensidade === 'brilhante' ? '✨ Brilhante' : '🌙 Suave'}
                  </Tag>
                  <Tag color="blue" className="text-xs">
                    {maskAnalysisData.profundidade === 'claro' ? '☀️ Claro' : '🌑 Escuro'}
                  </Tag>
                </div>

                {maskAnalysisData.subtom && (
                  <div className="pt-2 border-t border-gray-300">
                    <Text type="secondary" className="text-xs block mb-1">Subtom</Text>
                    <Tag color="gold" className="text-xs">
                      {maskAnalysisData.subtom === 'ouro' ? '🟡 Ouro' : '⚪ Prata'}
                    </Tag>
                  </div>
                )}

                {maskAnalysisData.colorSeason && (
                  <div className="pt-2 border-t border-gray-300">
                    <Text type="secondary" className="text-xs block mb-1">Estação Detectada</Text>
                    <Text className="font-bold text-sm">
                      {maskAnalysisData.colorSeason}
                    </Text>
                  </div>
                )}
              </div>
            )}

          </div>
          <div className="space-y-3 mt-4">
            <h4 className="text-xs font-semibold uppercase text-gray-600">Cores</h4>
            <div className="space-y-1.5">
              {colorSwatches.map(({ field, label, hex }) => (
                <Tooltip key={`orig-${field}`} title={label} color="#fff" destroyOnHidden>
                  <div
                    className="h-6 rounded border border-gray-200 shadow-xs cursor-pointer hover:shadow-sm transition-shadow"
                    style={{ backgroundColor: hex }}
                  />
                </Tooltip>
              ))}
            </div>
          </div>
        </div>

        {/* Análise Pigmentos - Vertical Stacking */}
        <div className="col-span-1 space-y-3">
          <h4 className="text-xs font-semibold uppercase text-gray-600">Análise Pigmentos</h4>

          {/* Season from Sliders */}
          {detectedSeasonFromSliders && (
            <Tooltip
              title={
                <div className="text-xs space-y-1">
                  <div className="font-semibold mb-1">Pelos Sliders:</div>
                  <div>• Temp: {getDistance(geralTemperatura)} {geralTemperatura && geralTemperatura > 50 ? '→ Quente' : '→ Frio'}</div>
                  <div>• Intens: {getDistance(geralIntensidade)} {geralIntensidade && geralIntensidade > 50 ? '→ Brilhante' : '→ Suave'}</div>
                  <div>• Prof: {getDistance(geralProfundidade)} {geralProfundidade && geralProfundidade > 50 ? '→ Claro' : '→ Escuro'}</div>
                </div>
              }
              color="#fff"
              destroyOnHidden
            >
              <div className="p-3 bg-gray-50 rounded-lg cursor-help">
                <Text type="secondary" className="text-xs block mb-1">Estação Detectada</Text>
                <Text className="font-bold text-sm">
                  {detectedSeasonFromSliders.colorSeason}
                </Text>
              </div>
            </Tooltip>
          )}

          {/* Temperatura */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <div>
                <Text type="secondary" className="text-xs pr-2">Temperatura</Text>
                <Tag
                  color={getLabelColor(geralTemperatura, 'temperatura')}
                  className="text-white font-semibold px-2 py-0 text-xs"
                >
                  {getLabelCategory(geralTemperatura, 'temperatura')}
                </Tag>
              </div>
              <Text code className="text-sm">{geralTemperatura}</Text>
            </div>
            <SliderWithAverageMarker value={geralTemperatura} averageValue={null} disabled />
          </div>

          {/* Intensidade */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <div>
                <Text type="secondary" className="text-xs pr-2">Intensidade</Text>
                <Tag
                  color={getLabelColor(geralIntensidade, 'intensidade')}
                  className="text-white font-semibold px-2 py-0 text-xs"
                >
                  {getLabelCategory(geralIntensidade, 'intensidade')}
                </Tag>
              </div>
              <Text code className="text-sm">{geralIntensidade}</Text>
            </div>
            <SliderWithAverageMarker value={geralIntensidade} averageValue={null} disabled />
          </div>

          {/* Profundidade */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <div>
                <Text type="secondary" className="text-xs pr-2">Profundidade</Text>
                <Tag
                  color={getLabelColor(geralProfundidade, 'profundidade')}
                  className="text-white font-semibold px-2 py-0 text-xs"
                >
                  {getLabelCategory(geralProfundidade, 'profundidade')}
                </Tag>
              </div>
              <Text code className="text-sm">{geralProfundidade}</Text>
            </div>
            <SliderWithAverageMarker value={geralProfundidade} averageValue={null} disabled />
          </div>
        </div>
      </div>
    </div>
  )
}

export default FinalClassificationStep
