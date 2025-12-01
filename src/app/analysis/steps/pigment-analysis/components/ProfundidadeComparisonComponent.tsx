'use client'

import { useState, useCallback, memo, useRef, useEffect } from 'react'
import { Slider, Tag, Typography } from 'antd'
import { ProfundidadeComparisonUI } from '@/lib/types-ui'
import { hexToRgb, rgbToHsl, getColorProperties } from '../../shared/colorConversion'
import { COLOR_FIELDS, getLabelColor, DEFAULT_RANGES } from '../../shared/PigmentAnalysisUtils'
import { ContrastScaleWithMarker } from './ContrastScaleWithMarker'

const { Text } = Typography

interface ProfundidadeComparisonComponentProps {
  extractedColors: { [key: string]: string }
  data: ProfundidadeComparisonUI[]
  onComparisonChange: (index: number, value: number) => void
  isReadOnly?: boolean
  rangesLocked?: boolean
  isAdmin?: boolean
}

const getDesaturatedColor = (hex: string): string => {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  // Return grayscale by setting saturation to 0
  return `hsl(${hsl.h}, 0%, ${hsl.l}%)`
}

const getFieldLabel = (field: string) => {
  const colorField = COLOR_FIELDS.find((f) => f.value === field)
  return colorField ? colorField.label : field
}

const getAverageColorProperties = (
  fields: string[],
  extractedColors: { [key: string]: string }
) => {
  const validFields = fields.filter((f) => f in extractedColors)
  const properties = validFields.map((field) =>
    getColorProperties(extractedColors[field])
  )

  if (properties.length === 0) {
    return {
      hsv: 0,
      hcl: 0,
      details: {
        hsvValues: [],
        hclValues: [],
        fieldLabels: [],
      },
    }
  }

  const hsvValues = properties.map((p) => p.value)
  const hclValues = properties.map((p) => p.lightness)

  const avgHsvValue = Math.round(
    hsvValues.reduce((sum, v) => sum + v, 0) / properties.length
  )
  const avgHclLightness = Math.round(
    hclValues.reduce((sum, l) => sum + l, 0) / properties.length
  )

  return {
    hsv: avgHsvValue,
    hcl: avgHclLightness,
    details: {
      hsvValues,
      hclValues,
      fieldLabels: validFields.map((f) => getFieldLabel(f)),
    },
  }
}

// Memoized slider component to prevent re-render loops
const ComparisonSlider = memo(({ 
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

  // Sync from prop only when not dragging - using useEffect to avoid render-phase updates
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

const renderColorGroup = (
  fields: string[],
  extractedColors: { [key: string]: string },
  hoveredColor: string | null,
  setHoveredColor: (color: string | null) => void
) => {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex gap-2">
        {fields
          .filter((f) => f in extractedColors)
          .map((field) => (
            <div key={field} className="flex-1 flex flex-col">
              <Text type="secondary" className="text-xs mb-1">
                {getFieldLabel(field)}
              </Text>
              <div
                className="w-full h-20 rounded-lg border-2 border-gray-300 shadow-md transition-all duration-200 cursor-pointer"
                style={{
                  backgroundColor:
                    hoveredColor === field
                      ? extractedColors[field]
                      : getDesaturatedColor(extractedColors[field]),
                }}
                onMouseEnter={() => setHoveredColor(field)}
                onMouseLeave={() => setHoveredColor(null)}
              />
            </div>
          ))}
      </div>
    </div>
  )
}

export const ProfundidadeComparisonComponent = ({
  extractedColors,
  data,
  onComparisonChange,
  isReadOnly,
  rangesLocked,
  isAdmin,
}: ProfundidadeComparisonComponentProps) => {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null)

  // State for contrast ranges per comparison
  const [contrastRanges, setContrastRanges] = useState<{ [key: number]: { min: number; max: number } }>({})

  const getContrastRange = (index: number, comparisonField?: string) => {
    if (contrastRanges[index]) {
      return contrastRanges[index]
    }
    // Use field-specific range from shared config, fallback to default
    if (comparisonField && comparisonField in DEFAULT_RANGES.contrast) {
      const fieldRange = DEFAULT_RANGES.contrast[comparisonField as keyof typeof DEFAULT_RANGES.contrast]
      if (fieldRange && typeof fieldRange === 'object' && 'min' in fieldRange && 'max' in fieldRange) {
        return fieldRange as { min: number; max: number }
      }
    }
    return DEFAULT_RANGES.contrast.default
  }

  const updateContrastRange = (index: number, field: 'min' | 'max', value: number) => {
    setContrastRanges(prev => ({
      ...prev,
      [index]: {
        ...getContrastRange(index),
        [field]: value
      }
    }))
  }

  return (
    <div className="space-y-8">
      {(data || []).map((comparison, index) => {
        const group1Props = getAverageColorProperties(
          comparison.colors1,
          extractedColors
        )
        const group2Props = getAverageColorProperties(
          comparison.colors2,
          extractedColors
        )

        // Use division for ratio: target/reference (Group2/Group1)
        const hclContrastNum = group1Props.hcl !== 0 ? group2Props.hcl / group1Props.hcl : 0
        const hclContrast = hclContrastNum.toFixed(2)

        const contrastRange = getContrastRange(index, comparison.field)

        const hclTooltip = (
          <div className="text-xs space-y-1">
            <div className="font-semibold mb-2">Luminosidade (HCL)</div>
            <div>Grupo 1: {group1Props.details.fieldLabels?.join(', ')}</div>
            {group1Props.details.hclValues?.map((val, i) => (
              <div key={`g1-${i}`} className="text-xs ml-2">
                {group1Props.details.fieldLabels?.[i]}: {val}
              </div>
            ))}
            <div className="mt-1">Média Grupo 1: {group1Props.hcl}</div>

            <div className="mt-2 border-t border-gray-400 pt-1">
              Grupo 2 (Alvo): {group2Props.details.fieldLabels?.join(', ')}
            </div>
            {group2Props.details.hclValues?.map((val, i) => (
              <div key={`g2-${i}`} className="text-xs ml-2">
                {group2Props.details.fieldLabels?.[i]}: {val}
              </div>
            ))}
            <div className="mt-1">Média Grupo 2: {group2Props.hcl}</div>

            <div className="mt-2 border-t border-gray-400 pt-1 font-semibold">
              Proporção: {group2Props.hcl} ÷ {group1Props.hcl} = {hclContrast}
            </div>
          </div>
        )

        return (
          <div key={index} className="bg-gray-50 rounded-lg p-6">
            {/* Header Row with Info Columns */}
            <div className="flex gap-6 mb-6">
              {/* Comparison Name Column */}
              <div className="flex flex-col">
                <Text type="secondary" className="text-xs mb-2">
                  {comparison.name}
                </Text>
                <Tag
                  color={getLabelColor(
                    comparison.value,
                    'profundidade'
                  )}
                  className="text-white font-semibold px-3 py-1 text-xs mt-2 w-fit"
                >
                  {comparison.category}
                </Tag>
              </div>

              {/* Profundidade Value Column */}
              <div className="flex flex-col">
                <Text type="secondary" className="text-xs mb-2">
                  Profundidade
                </Text>
                <Text code className="text-base">
                  {comparison.value ?? '—'}
                </Text>
              </div>

              {/* Contrast Scale */}
              <ContrastScaleWithMarker
                group1Props={group1Props}
                group2Props={group2Props}
                rangeMin={contrastRange.min}
                rangeMax={contrastRange.max}
                onRangeMinChange={(val) => updateContrastRange(index, 'min', val)}
                onRangeMaxChange={(val) => updateContrastRange(index, 'max', val)}
                isReadOnly={isReadOnly}
                rangesLocked={rangesLocked}
                tooltipContent={hclTooltip}
                isAdmin={isAdmin}
              />
            </div>

            {/* Color Comparison Grid */}
            <div className="flex gap-6 mb-6">
              {renderColorGroup(
                comparison.colors1,
                extractedColors,
                hoveredColor,
                setHoveredColor
              )}
              <div className="flex items-center justify-center">
                <Text type="secondary" className="text-2xl font-bold">
                  vs
                </Text>
              </div>
              {renderColorGroup(
                comparison.colors2,
                extractedColors,
                hoveredColor,
                setHoveredColor
              )}
            </div>

            {/* Slider */}
            <div className="bg-white rounded-lg p-4">
              <ComparisonSlider
                value={comparison.value}
                onChange={(value) => onComparisonChange(index, value)}
                disabled={isReadOnly}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
