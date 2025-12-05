'use client'

import { useState, useCallback, memo, useRef, useEffect } from 'react'
import { Slider, Tag, Typography, Tooltip } from 'antd'
import { ProfundidadeDataUI } from '@/lib/types-ui'
import { getColorProperties, hexToRgb, rgbToHsl } from '../../shared/colorConversion'
import { COLOR_FIELDS, getLabelColor, getLabelCategory } from '../../shared/PigmentAnalysisUtils'

const { Text } = Typography

interface ProfundidadeStepProps {
  extractedColors: { [key: string]: string }
  data: ProfundidadeDataUI
  onValueChange: (value: number) => void
  isReadOnly?: boolean
}

const getFieldLabel = (field: string) => {
  const colorField = COLOR_FIELDS.find((f) => f.value === field)
  return colorField ? colorField.label : field
}

// Convert a hex color to grayscale (desaturated) version
const getDesaturatedColor = (hex: string): string => {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  // Return grayscale by setting saturation to 0
  return `hsl(${hsl.h}, 0%, ${hsl.l}%)`
}

// Memoized slider component to prevent re-render loops
const ProfundidadeSlider = memo(({ 
  value, 
  onChange, 
  disabled 
}: { 
  value: number | null
  onChange: (value: number) => void
  disabled?: boolean 
}) => {
  const [localValue, setLocalValue] = useState<number>(value ?? 50)
  const isDraggingRef = useRef(false)

  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalValue(value ?? 50)
    }
  }, [value])

  const handleChange = useCallback((newValue: number) => {
    isDraggingRef.current = true
    setLocalValue(newValue)
  }, [])

  const handleChangeComplete = useCallback((newValue: number) => {
    isDraggingRef.current = false
    onChange(newValue)
  }, [onChange])

  return (
    <Slider
      min={0}
      max={100}
      step={1}
      value={localValue}
      onChange={handleChange}
      onChangeComplete={handleChangeComplete}
      disabled={disabled}
      marks={{
        0: '0',
        12.5: '12.5',
        47: '47',
        53: '53',
        87.5: '87.5',
        100: '100',
      }}
      tooltip={{ open: false }}
    />
  )
})

ProfundidadeSlider.displayName = 'ProfundidadeSlider'

export const ProfundidadeStep = ({
  extractedColors,
  data,
  onValueChange,
  isReadOnly,
}: ProfundidadeStepProps) => {
  // Calculate lightness for all extracted colors
  const colorLightnessData = Object.entries(extractedColors).map(([field, hex]) => {
    const properties = getColorProperties(hex)
    return {
      field,
      hex,
      lightness: properties.lightness, // HCL lightness 0-100
      label: getFieldLabel(field),
    }
  })

  // Calculate average lightness across all colors
  const avgLightness = colorLightnessData.length > 0
    ? Math.round(colorLightnessData.reduce((sum, c) => sum + c.lightness, 0) / colorLightnessData.length)
    : 50

  // Find min and max lightness for difference calculation
  const minLightness = colorLightnessData.length > 0
    ? Math.min(...colorLightnessData.map(c => c.lightness))
    : 0
  const maxLightness = colorLightnessData.length > 0
    ? Math.max(...colorLightnessData.map(c => c.lightness))
    : 100
  const lightnessDifference = maxLightness - minLightness

  // Find the darkest and lightest colors for tooltip
  const darkestColor = colorLightnessData.find(c => c.lightness === minLightness)
  const lightestColor = colorLightnessData.find(c => c.lightness === maxLightness)

  return (
    <div className="space-y-6">
      {/* Header with classification info */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex flex-col">
            <Text type="secondary" className="text-xs mb-1">
              Profundidade
            </Text>
            <Text code className="text-lg">
              {data.value ?? '—'}
            </Text>
          </div>
          <div className="flex flex-col">
            <Text type="secondary" className="text-xs mb-1">
              Classificação
            </Text>
            <Tag
              color={getLabelColor(data.value, 'profundidade')}
              className="text-white font-semibold px-3 py-1 text-sm w-fit"
            >
              {data.category || 'Não classificado'}
            </Tag>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <Tooltip
              title={
                <div className="text-xs">
                  <div className="font-semibold mb-1">Cálculo da Média:</div>
                  <div className="space-y-0.5">
                    {colorLightnessData.map((c, i) => (
                      <div key={c.field}>{c.label}: {c.lightness}%</div>
                    ))}
                  </div>
                  <div className="border-t border-gray-400 mt-1 pt-1">
                    ({colorLightnessData.map(c => c.lightness).join(' + ')}) / {colorLightnessData.length} = <span className="font-semibold">{avgLightness}%</span>
                  </div>
                </div>
              }
              color="#fff"
              placement="top"
            >
              <div className="flex flex-col cursor-help">
                <Text type="secondary" className="text-xs mb-1">
                  Luminosidade Média
                </Text>
                <Text code className="text-base hover:text-blue-500">
                  {avgLightness}%
                </Text>
              </div>
            </Tooltip>
            <Tooltip
              title={
                <div className="text-xs">
                  <div className="font-semibold mb-1">Diferença entre Extremos:</div>
                  <div>Mais claro: {lightestColor?.label} ({maxLightness}%)</div>
                  <div>Mais escuro: {darkestColor?.label} ({minLightness}%)</div>
                  <div className="border-t border-gray-400 mt-1 pt-1">
                    {maxLightness} - {minLightness} = <span className="font-semibold">{lightnessDifference}%</span>
                  </div>
                </div>
              }
              color="#fff"
              placement="top"
            >
              <div className="flex flex-col cursor-help">
                <Text type="secondary" className="text-xs mb-1">
                  Diferença Extremos
                </Text>
                <Text code className="text-base hover:text-blue-500">
                  {lightnessDifference}%
                </Text>
              </div>
            </Tooltip>
          </div>
        </div>

        {/* Lightness Scale Gradient with Color Markers */}
        <div className="mb-6">
          <Text type="secondary" className="text-xs mb-2 block">
            Escala de Luminosidade
          </Text>
          <div className="relative">
            {/* Gradient bar */}
            <div
              className="h-16 rounded-lg border border-gray-300 relative overflow-hidden"
              style={{
                background: 'linear-gradient(to right, #000000, #ffffff)',
              }}
            >
              {/* Area separators */}
              <div className="absolute top-0 h-full w-px bg-white/30" style={{ left: '12.5%' }} />
              <div className="absolute top-0 h-full w-px bg-white/30" style={{ left: '47%' }} />
              <div className="absolute top-0 h-full w-px bg-white/30" style={{ left: '53%' }} />
              <div className="absolute top-0 h-full w-px bg-white/30" style={{ left: '87.5%' }} />
            </div>
            
            {/* Scale labels */}
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-gray-400">0</span>
              <span className="text-[10px] text-gray-400" style={{ position: 'absolute', left: '12.5%', transform: 'translateX(-50%)' }}>12.5</span>
              <span className="text-[10px] text-gray-400" style={{ position: 'absolute', left: '47%', transform: 'translateX(-50%)' }}>47</span>
              <span className="text-[10px] text-gray-400" style={{ position: 'absolute', left: '53%', transform: 'translateX(-50%)' }}>53</span>
              <span className="text-[10px] text-gray-400" style={{ position: 'absolute', left: '87.5%', transform: 'translateX(-50%)' }}>87.5</span>
              <span className="text-[10px] text-gray-400">100</span>
            </div>
            
            {/* Color markers */}
            {colorLightnessData.map((colorData, index) => (
              <Tooltip
                key={colorData.field}
                title={
                  <div className="text-xs">
                    <div className="font-semibold">{colorData.label}</div>
                    <div>Luminosidade: {colorData.lightness}%</div>
                    <div className="flex items-center gap-1 mt-1">
                      <div
                        className="w-3 h-3 rounded border border-white"
                        style={{ backgroundColor: colorData.hex }}
                      />
                      <span>{colorData.hex}</span>
                    </div>
                  </div>
                }
                color="#fff"
                placement="top"
              >
                <div
                  className="absolute h-16 flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-110"
                  style={{
                    top: 0,
                    left: `${colorData.lightness}%`,
                    transform: 'translateX(-50%)',
                    zIndex: 10 + index,
                  }}
                >
                  {/* Marker line - using desaturated color */}
                  <div 
                    className="w-3 h-full rounded-sm border-2 border-white shadow-md"
                    style={{ backgroundColor: getDesaturatedColor(colorData.hex) }}
                  />
                </div>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Single Classification Slider */}
        <div className="bg-white rounded-lg p-4">
          <Text type="secondary" className="text-xs mb-2 block">
            Classificação de Profundidade
          </Text>
          <ProfundidadeSlider
            value={data.value}
            onChange={onValueChange}
            disabled={isReadOnly}
          />
          <div className="flex justify-between mt-2">
            <Text type="secondary" className="text-xs">Extremo Escuro</Text>
            <Text type="secondary" className="text-xs">Neutro Puro</Text>
            <Text type="secondary" className="text-xs">Extremo Claro</Text>
          </div>
        </div>
      </div>
    </div>
  )
}
