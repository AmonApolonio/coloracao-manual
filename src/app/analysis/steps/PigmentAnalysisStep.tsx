'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, Slider, Tag, Typography, Empty, Steps, Tooltip } from 'antd'
import { SVGVectorData, ColorField } from '@/lib/types'
import { PigmentTemperatureDataUI, ProfundidadeComparisonUI, PigmentAnalysisDataUI } from '@/lib/types-ui'
import { PigmentAnalysisDataDB, COMPARISON_FIELD_NAMES } from '@/lib/types-db'
import { convertUIToDB, convertDBToUI } from '@/lib/pigment-conversion'

const { Text, Paragraph } = Typography

interface PigmentAnalysisStepProps {
  initialData?: SVGVectorData
  userFacePhotoUrl?: string
  currentSubStep: number // 0 = temperatura, 1 = intensidade, 2 = profundidade
  savedAnalysisData?: PigmentAnalysisDataDB // Load previously saved data from Supabase
  onDataChange?: (data: PigmentAnalysisDataDB) => void // Send only DB types to parent
  onSubStepChange?: (subStep: number) => void
}

const COLOR_FIELDS: { value: ColorField; label: string }[] = [
  { value: 'iris', label: 'Iris' },
  { value: 'raiz_cabelo', label: 'Raiz Cabelo' },
  { value: 'sobrancelha', label: 'Sobrancelha' },
  { value: 'testa', label: 'Testa' },
  { value: 'bochecha', label: 'Bochecha' },
  { value: 'cavidade_ocular', label: 'Cavidade Ocular' },
  { value: 'queixo', label: 'Queixo' },
  { value: 'contorno_boca', label: 'Contorno Boca' },
  { value: 'boca', label: 'Boca' },
]

const TEMPERATURE_RANGES = [
  { min: 0, max: 12.5, label: 'Extremo Frio', color: '#8b5cf6' },
  { min: 12.5, max: 47, label: 'Neutro Frio', color: '#3b82f6' },
  { min: 47, max: 53, label: 'Neutro Puro', color: '#33d221' },
  { min: 53, max: 87.5, label: 'Neutro Quente', color: '#f97316' },
  { min: 87.5, max: 100, label: 'Extremo Quente', color: '#dc2626' },
]

const INTENSIDADE_RANGES = [
  { min: 0, max: 12.5, label: 'Extremo Suave', color: '#8b5cf6' },
  { min: 12.5, max: 47, label: 'Neutro Suave', color: '#3b82f6' },
  { min: 47, max: 53, label: 'Neutro Puro', color: '#33d221' },
  { min: 53, max: 87.5, label: 'Neutro Brilhante', color: '#f97316' },
  { min: 87.5, max: 100, label: 'Extremo Brilhante', color: '#dc2626' },
]

const PROFUNDIDADE_RANGES = [
  { min: 0, max: 12.5, label: 'Extremo Escuro', color: '#8b5cf6' },
  { min: 12.5, max: 47, label: 'Neutro Escuro', color: '#3b82f6' },
  { min: 47, max: 53, label: 'Neutro Puro', color: '#33d221' },
  { min: 53, max: 87.5, label: 'Neutro Claro', color: '#f97316' },
  { min: 87.5, max: 100, label: 'Extremo Claro', color: '#dc2626' },
]

const ANALYSIS_STEPS = [
  { title: 'Temperatura', key: 'temperatura' },
  { title: 'Intensidade', key: 'intensidade' },
  { title: 'Profundidade', key: 'profundidade' },
  { title: 'Geral', key: 'geral' },
]

// Convert hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    }
    : { r: 0, g: 0, b: 0 }
}

// Convert RGB to HSL
const rgbToHsl = (r: number, g: number, b: number) => {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  let h = 0, s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

// Convert RGB to HSV
const rgbToHsv = (r: number, g: number, b: number) => {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  const v = max
  const s = max === 0 ? 0 : delta / max

  return {
    h: 0,
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  }
}

// Convert RGB to Lab (intermediate step for HCL)
const rgbToLab = (r: number, g: number, b: number) => {
  let [x, y, z] = [r, g, b].map(val => {
    val = val > 0.04045 ? Math.pow((val + 0.055) / 1.055, 2.4) : val / 12.92
    return val * 100
  })

  x = x / 95.047
  y = y / 100
  z = z / 108.883

  const [xn, yn, zn] = [x, y, z].map(val => {
    return val > 0.008856 ? Math.pow(val, 1 / 3) : 7.787 * val + 16 / 116
  })

  const l = 116 * yn - 16
  const a = 500 * (xn - yn)
  const b_val = 200 * (yn - zn)

  return { l, a, b: b_val }
}

// Convert Lab to HCL
const labToHcl = (l: number, a: number, b: number) => {
  const c = Math.sqrt(a * a + b * b)
  let h = Math.atan2(b, a) * (180 / Math.PI)
  if (h < 0) h += 360

  return {
    h: Math.round(h),
    c: Math.round(c),
    l: Math.round(l),
  }
}

// Get color properties from hex
const getColorProperties = (hex: string) => {
  const rgb = hexToRgb(hex)
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
  const lab = rgbToLab(rgb.r, rgb.g, rgb.b)
  const hcl = labToHcl(lab.l, lab.a, lab.b)

  return {
    hue: hcl.h,
    saturation: hsv.s,
    value: hsv.v,
    chroma: hcl.c,
    lightness: hcl.l,
  }
}

const getTemperatureCategory = (value: number | null, stepKey?: string): string => {
  if (value === null) return ''
  
  let ranges = TEMPERATURE_RANGES

  if (stepKey === 'intensidade') {
    ranges = INTENSIDADE_RANGES
  } else if (stepKey === 'profundidade') {
    ranges = PROFUNDIDADE_RANGES
  }

  for (const range of ranges) {
    if (value >= range.min && value <= range.max) {
      return range.label
    }
  }
  return 'Neutro Puro'
}

const getTemperatureColor = (value: number | null, stepKey?: string): string => {
  if (value === null) return '#d3d3d3'
  
  let ranges = TEMPERATURE_RANGES

  if (stepKey === 'intensidade') {
    ranges = INTENSIDADE_RANGES
  } else if (stepKey === 'profundidade') {
    ranges = PROFUNDIDADE_RANGES
  }

  for (const range of ranges) {
    if (value >= range.min && value <= range.max) {
      return range.color
    }
  }
  return '#8b5cf6'
}

// Slider Step Component (for Temperatura and Intensidade)
const SliderStepComponent = ({
  stepKey,
  extractedColors,
  data,
  onValueChange,
}: {
  stepKey: string
  extractedColors: { [key: string]: string }
  data: PigmentTemperatureDataUI
  onValueChange: (field: string, value: number) => void
}) => {
  const renderColorProperties = (hex: string) => {
    const props = getColorProperties(hex)

    if (stepKey === 'temperatura') {
      return (
        <div className="flex flex-col">
          <Text type="secondary" className="text-xs mb-2">Hue</Text>
          <Text code className="text-base">
            {props.hue}°
          </Text>
        </div>
      )
    } else if (stepKey === 'intensidade') {
      return (
        <>
          <div className="flex flex-col">
            <Text type="secondary" className="text-xs mb-2">Saturação (HSV)</Text>
            <Text code className="text-base">
              {props.saturation}%
            </Text>
          </div>
          <div className="flex flex-col">
            <Text type="secondary" className="text-xs mb-2">Chroma (HCL)</Text>
            <Text code className="text-base">
              {props.chroma}
            </Text>
          </div>
        </>
      )
    } else if (stepKey === 'profundidade') {
      return (
        <>
          <div className="flex flex-col">
            <Text type="secondary" className="text-xs mb-2">Valor (HSV)</Text>
            <Text code className="text-base">
              {props.value}%
            </Text>
          </div>
          <div className="flex flex-col">
            <Text type="secondary" className="text-xs mb-2">Luminosidade (HCL)</Text>
            <Text code className="text-base">
              {props.lightness}
            </Text>
          </div>
        </>
      )
    }
  }

  const getDesaturatedColor = (hex: string): string => {
    const rgb = hexToRgb(hex)
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
    // Return grayscale by setting saturation to 0
    return `hsl(${hsl.h}, 0%, ${hsl.l}%)`
  }

  return (
    <>
      <div className="space-y-8">
        {COLOR_FIELDS.filter(f => f.value in extractedColors).map(field => (
          <div key={field.value} className="bg-gray-50 rounded-lg p-6">
            {/* Header Row with Info Columns */}
            <div className="flex gap-6 mb-6">
              {/* Part Label Column */}
              <div className="flex flex-col">
                <Text type="secondary" className="text-xs mb-2">{field.label}</Text>
                {data && data[field.value] && (
                  <Tag
                    color={getTemperatureColor(data[field.value].temperature, stepKey)}
                    className="text-white font-semibold px-3 py-1 text-xs mt-2 w-fit"
                  >
                    {data[field.value].temperatureCategory}
                  </Tag>
                )}
              </div>

              {/* Hex Color Column */}
              <div className="flex flex-col">
                <Text type="secondary" className="text-xs mb-2">Hex</Text>
                <Text code className="text-base">
                  {extractedColors[field.value]}
                </Text>
              </div>

              {/* Value Column */}
              <div className="flex flex-col">
                <Text type="secondary" className="text-xs mb-2">
                  {stepKey.charAt(0).toUpperCase() + stepKey.slice(1)}
                </Text>
                <Text code className="text-base">
                  {data[field.value]?.temperature ?? '—'}
                </Text>
              </div>

              {/* Dynamic Color Properties */}
              {renderColorProperties(extractedColors[field.value])}
            </div>

            {/* Color Swatch - Full Width or Side by Side for Profundidade */}
            <div className="mb-6">
              {stepKey === 'profundidade' ? (
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col">
                    <Text type="secondary" className="text-xs mb-2">Original</Text>
                    <div
                      className="w-full h-32 rounded-lg border-2 border-gray-300 shadow-md"
                      style={{
                        backgroundColor: extractedColors[field.value],
                      }}
                    />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <Text type="secondary" className="text-xs mb-2">Escala de Cinza</Text>
                    <div
                      className="w-full h-32 rounded-lg border-2 border-gray-300 shadow-md"
                      style={{
                        backgroundColor: getDesaturatedColor(extractedColors[field.value]),
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className="w-full h-32 rounded-lg border-2 border-gray-300 shadow-md"
                  style={{
                    backgroundColor: extractedColors[field.value],
                  }}
                />
              )}
            </div>

            {/* Slider */}
            <div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={data[field.value]?.temperature ?? 50}
                onChange={value =>
                  onValueChange(field.value, value as number)
                }
                marks={{
                  0: '0',
                  12.5: '12.5',
                  47: '47',
                  53: '53',
                  87.5: '87.5',
                  100: '100',
                }}
                tooltip={{
                  formatter: value => `${value}`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// Profundidade Comparison Component
const ProfundidadeComparisonComponent = ({
  extractedColors,
  data,
  onComparisonChange,
}: {
  extractedColors: { [key: string]: string }
  data: ProfundidadeComparisonUI[]
  onComparisonChange: (index: number, value: number) => void
}) => {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null)

  const getFieldLabel = (field: string) => {
    const colorField = COLOR_FIELDS.find(f => f.value === field)
    return colorField ? colorField.label : field
  }

  const getDesaturatedColor = (hex: string): string => {
    const rgb = hexToRgb(hex)
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
    // Return grayscale by setting saturation to 0
    return `hsl(${hsl.h}, 0%, ${hsl.l}%)`
  }

  const getAverageColorProperties = (fields: string[]) => {
    const validFields = fields.filter(f => f in extractedColors)
    const properties = validFields.map(field => getColorProperties(extractedColors[field]))

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

    const hsvValues = properties.map(p => p.value)
    const hclValues = properties.map(p => p.lightness)

    const avgHsvValue = Math.round(hsvValues.reduce((sum, v) => sum + v, 0) / properties.length)
    const avgHclLightness = Math.round(hclValues.reduce((sum, l) => sum + l, 0) / properties.length)

    return {
      hsv: avgHsvValue,
      hcl: avgHclLightness,
      details: {
        hsvValues,
        hclValues,
        fieldLabels: validFields.map(f => getFieldLabel(f)),
      },
    }
  }

  const renderColorGroup = (fields: string[], title: string) => {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex gap-2">
          {fields
            .filter(f => f in extractedColors)
            .map(field => (
              <div key={field} className="flex-1 flex flex-col">
                <Text type="secondary" className="text-xs mb-1">{getFieldLabel(field)}</Text>
                <div
                  className="w-full h-20 rounded-lg border-2 border-gray-300 shadow-md transition-all duration-200 cursor-pointer"
                  style={{
                    backgroundColor: hoveredColor === field ? extractedColors[field] : getDesaturatedColor(extractedColors[field]),
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

  return (
    <div className="space-y-8">
      {(data || []).map((comparison, index) => {
        const group1Props = getAverageColorProperties(comparison.colors1)
        const group2Props = getAverageColorProperties(comparison.colors2)
        
        // Use division for ratio: target/reference (Group2/Group1)
        const hsvContrast = group1Props.hsv !== 0 ? (group2Props.hsv / group1Props.hsv).toFixed(2) : '0.00'
        const hclContrast = group1Props.hcl !== 0 ? (group2Props.hcl / group1Props.hcl).toFixed(2) : '0.00'

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
            
            <div className="mt-2 border-t border-gray-400 pt-1">Grupo 2 (Alvo): {group2Props.details.fieldLabels?.join(', ')}</div>
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

        const hsvTooltip = (
          <div className="text-xs space-y-1">
            <div className="font-semibold mb-2">Valor (HSV)</div>
            <div>Grupo 1: {group1Props.details.fieldLabels?.join(', ')}</div>
            {group1Props.details.hsvValues?.map((val, i) => (
              <div key={`g1-${i}`} className="text-xs ml-2">
                {group1Props.details.fieldLabels?.[i]}: {val}%
              </div>
            ))}
            <div className="mt-1">Média Grupo 1: {group1Props.hsv}%</div>
            
            <div className="mt-2 border-t border-gray-400 pt-1">Grupo 2: {group2Props.details.fieldLabels?.join(', ')}</div>
            {group2Props.details.hsvValues?.map((val, i) => (
              <div key={`g2-${i}`} className="text-xs ml-2">
                {group2Props.details.fieldLabels?.[i]}: {val}%
              </div>
            ))}
            <div className="mt-1">Média Grupo 2: {group2Props.hsv}%</div>
            
            <div className="mt-2 border-t border-gray-400 pt-1 font-semibold">
              Proporção: {group2Props.hsv}% ÷ {group1Props.hsv}% = {hsvContrast}
            </div>
          </div>
        )

        return (
          <div key={index} className="bg-gray-50 rounded-lg p-6">
            {/* Header Row with Info Columns */}
            <div className="flex gap-6 mb-6">
              {/* Comparison Name Column */}
              <div className="flex flex-col">
                <Text type="secondary" className="text-xs mb-2">{comparison.name}</Text>
                <Tag
                  color={getTemperatureColor(comparison.value, 'profundidade')}
                  className="text-white font-semibold px-3 py-1 text-xs mt-2 w-fit"
                >
                  {comparison.category}
                </Tag>
              </div>

              {/* Profundidade Value Column */}
              <div className="flex flex-col">
                <Text type="secondary" className="text-xs mb-2">Profundidade</Text>
                <Text code className="text-base">
                  {comparison.value ?? '—'}
                </Text>
              </div>

              {/* HCL Lightness Contrast Column */}
              <Tooltip title={hclTooltip} color="#fff">
                <div className="flex flex-col cursor-help">
                  <Text type="secondary" className="text-xs mb-2">Luminosidade (HCL)</Text>
                  <Text code className="text-base hover:text-blue-500">
                    {hclContrast}
                  </Text>
                </div>
              </Tooltip>

              {/* HSV Value Contrast Column */}
              <Tooltip title={hsvTooltip} color="#fff">
                <div className="flex flex-col cursor-help">
                  <Text type="secondary" className="text-xs mb-2">Valor (HSV)</Text>
                  <Text code className="text-base hover:text-blue-500">
                    {hsvContrast}%
                  </Text>
                </div>
              </Tooltip>
            </div>

            {/* Color Comparison Grid */}
            <div className="flex gap-6 mb-6">
              {renderColorGroup(comparison.colors1, '')}
              <div className="flex items-center justify-center">
                <Text type="secondary" className="text-2xl font-bold">vs</Text>
              </div>
              {renderColorGroup(comparison.colors2, '')}
            </div>

            {/* Slider */}
            <div className="bg-white rounded-lg p-4">
              <Slider
                min={0}
                max={100}
                step={1}
                value={comparison.value ?? 50}
                onChange={value => onComparisonChange(index, value as number)}
                marks={{
                  0: '0',
                  12.5: '12.5',
                  47: '47',
                  53: '53',
                  87.5: '87.5',
                  100: '100',
                }}
                tooltip={{
                  formatter: value => `${value}`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Custom Slider with Average Marker
const SliderWithAverageMarker = ({
  value,
  averageValue,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: {
  value: number | null
  averageValue: number | null
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}) => {
  // Calculate the percentage position of the average value
  const averagePercentage = averageValue !== null ? ((averageValue - min) / (max - min)) * 100 : 0

  return (
    <div className="relative">
      <Slider
        min={min}
        max={max}
        step={step}
        value={value ?? 50}
        onChange={onChange}
        marks={{
          0: '0',
          12.5: '12.5',
          47: '47',
          53: '53',
          87.5: '87.5',
          100: '100',
        }}
        tooltip={{
          formatter: value => `${value}`,
        }}
      />
      {/* Average marker dot */}
      {averageValue !== null && (
        <div
          className="absolute top-0 h-full pointer-events-none flex items-center"
          style={{
            left: `calc(${averagePercentage}% - 8px)`,
          }}
        >
          <div
            className="w-4 h-4 rounded-full border-2 border-red-500 bg-red-300 shadow-md"
            title={`Média Individual: ${averageValue}`}
          />
        </div>
      )}
    </div>
  )
}

// Geral Summary Component
const GeralSummaryComponent = ({
  extractedColors,
  analysisData,
  userFacePhotoUrl,
  onGeralChange,
}: {
  extractedColors: { [key: string]: string }
  analysisData: PigmentAnalysisDataUI
  userFacePhotoUrl?: string
  onGeralChange: (key: 'temperatura' | 'intensidade' | 'profundidade', value: number) => void
}) => {
  // Calculate averages from individual steps
  const calculateAverageFromStep = (stepData: PigmentTemperatureDataUI | ProfundidadeComparisonUI[] | undefined): number | null => {
    if (!stepData) return null

    if (Array.isArray(stepData)) {
      // For profundidade (array of comparisons)
      const validValues = stepData.filter(item => item.value !== null).map(item => item.value as number)
      if (validValues.length === 0) return null
      const sum = validValues.reduce((acc, item) => acc + item, 0)
      return Math.round(sum / validValues.length)
    } else {
      // For temperatura and intensidade (object)
      const values = Object.values(stepData).filter(v => v.temperature !== null).map(v => v.temperature as number)
      if (values.length === 0) return null
      return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    }
  }

  const avgTemperatura = calculateAverageFromStep(analysisData.temperatura)
  const avgIntensidade = calculateAverageFromStep(analysisData.intensidade)
  const avgProfundidade = calculateAverageFromStep(analysisData.profundidade)

  const geralTemperatura = analysisData.geral?.temperatura ?? avgTemperatura
  const geralIntensidade = analysisData.geral?.intensidade ?? avgIntensidade
  const geralProfundidade = analysisData.geral?.profundidade ?? avgProfundidade

  // Get all extracted colors for display - sorted by COLOR_FIELDS order
  const colorSwatches = COLOR_FIELDS.filter(field => field.value in extractedColors).map(field => {
    return {
      field: field.value,
      label: field.label,
      hex: extractedColors[field.value],
    }
  })

  const getDesaturatedColor = (hex: string): string => {
    const rgb = hexToRgb(hex)
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
    // Return grayscale by setting saturation to 0
    return `hsl(${hsl.h}, 0%, ${hsl.l}%)`
  }

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
              <Text type="secondary" className="text-xs mb-2">Temperatura</Text>
              <Tag
                color={getTemperatureColor(geralTemperatura, 'temperatura')}
                className="text-white font-semibold px-3 py-1 text-xs w-fit"
              >
                {getTemperatureCategory(geralTemperatura, 'temperatura')}
              </Tag>
            </div>

            <Tooltip
              title={
                <div className="text-xs space-y-1">
                  <div className="font-semibold mb-2">Cálculo da Média Individual</div>
                  {analysisData.temperatura && Object.entries(analysisData.temperatura).map(([field, data]) => (
                    <div key={field}>{COLOR_FIELDS.find(f => f.value === field)?.label}: {data.temperature}</div>
                  ))}
                  <div className="border-t border-gray-400 pt-1 mt-2 font-semibold">
                    Total: {Object.values(analysisData.temperatura || {}).reduce((sum, d) => sum + (d.temperature ?? 0), 0)} ÷ {Object.keys(analysisData.temperatura || {}).length} = {avgTemperatura}
                  </div>
                </div>
              }
              color="#fff"
            >
              <div className="flex flex-col cursor-help">
                <Text type="secondary" className="text-xs mb-2">Média dos Individuais</Text>
                <Text code className="text-base hover:text-blue-500">
                  {avgTemperatura}
                </Text>
              </div>
            </Tooltip>

            <div className="flex flex-col">
              <Text type="secondary" className="text-xs mb-2">Valor Final</Text>
              <Text code className="text-base">
                {geralTemperatura}
              </Text>
            </div>
          </div>

          <SliderWithAverageMarker
            value={geralTemperatura}
            averageValue={avgTemperatura}
            onChange={value => onGeralChange('temperatura', value)}
          />
        </div>

        {/* Intensidade */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex gap-6 mb-6">
            <div className="flex flex-col">
              <Text type="secondary" className="text-xs mb-2">Intensidade</Text>
              <Tag
                color={getTemperatureColor(geralIntensidade, 'intensidade')}
                className="text-white font-semibold px-3 py-1 text-xs w-fit"
              >
                {getTemperatureCategory(geralIntensidade, 'intensidade')}
              </Tag>
            </div>

            <Tooltip
              title={
                <div className="text-xs space-y-1">
                  <div className="font-semibold mb-2">Cálculo da Média Individual</div>
                  {analysisData.intensidade && Object.entries(analysisData.intensidade).map(([field, data]) => (
                    <div key={field}>{COLOR_FIELDS.find(f => f.value === field)?.label}: {data.temperature}</div>
                  ))}
                  <div className="border-t border-gray-400 pt-1 mt-2 font-semibold">
                    Total: {Object.values(analysisData.intensidade || {}).reduce((sum, d) => sum + (d.temperature ?? 0), 0)} ÷ {Object.keys(analysisData.intensidade || {}).length} = {avgIntensidade}
                  </div>
                </div>
              }
              color="#fff"
            >
              <div className="flex flex-col cursor-help">
                <Text type="secondary" className="text-xs mb-2">Média dos Individuais</Text>
                <Text code className="text-base hover:text-blue-500">
                  {avgIntensidade}
                </Text>
              </div>
            </Tooltip>

            <div className="flex flex-col">
              <Text type="secondary" className="text-xs mb-2">Valor Final</Text>
              <Text code className="text-base">
                {geralIntensidade}
              </Text>
            </div>
          </div>

          <SliderWithAverageMarker
            value={geralIntensidade}
            averageValue={avgIntensidade}
            onChange={value => onGeralChange('intensidade', value)}
          />
        </div>

        {/* Profundidade */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex gap-6 mb-6">
            <div className="flex flex-col">
              <Text type="secondary" className="text-xs mb-2">Profundidade</Text>
              <Tag
                color={getTemperatureColor(geralProfundidade, 'profundidade')}
                className="text-white font-semibold px-3 py-1 text-xs w-fit"
              >
                {getTemperatureCategory(geralProfundidade, 'profundidade')}
              </Tag>
            </div>

            <Tooltip
              title={
                <div className="text-xs space-y-1">
                  <div className="font-semibold mb-2">Cálculo da Média Individual</div>
                  {analysisData.profundidade && analysisData.profundidade.map((comparison, idx) => (
                    <div key={idx}>{comparison.name}: {comparison.value}</div>
                  ))}
                  <div className="border-t border-gray-400 pt-1 mt-2 font-semibold">
                    Total: {analysisData.profundidade?.reduce((sum, p) => sum + (p.value ?? 0), 0) || 0} ÷ {analysisData.profundidade?.length || 1} = {avgProfundidade}
                  </div>
                </div>
              }
              color="#fff"
            >
              <div className="flex flex-col cursor-help">
                <Text type="secondary" className="text-xs mb-2">Média dos Individuais</Text>
                <Text code className="text-base hover:text-blue-500">
                  {avgProfundidade}
                </Text>
              </div>
            </Tooltip>

            <div className="flex flex-col">
              <Text type="secondary" className="text-xs mb-2">Valor Final</Text>
              <Text code className="text-base">
                {geralProfundidade}
              </Text>
            </div>
          </div>

          <SliderWithAverageMarker
            value={geralProfundidade}
            averageValue={avgProfundidade}
            onChange={value => onGeralChange('profundidade', value)}
          />
        </div>
      </div>
    </div>
  )
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
    if (onDataChangeRef.current && Object.keys(extractedColors).length > 0 && savedDataLoadedRef.current) {
      const dbData = convertUIToDB(analysisData)
      onDataChangeRef.current(dbData)
    }
  }, [analysisData, extractedColors])

  const handleStepValueChange = (field: string, value: number) => {
    const stepKey = ANALYSIS_STEPS[currentSubStep].key as keyof PigmentAnalysisDataUI
    const category = getTemperatureCategory(value, stepKey)

    setAnalysisData(prev => {
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
    const category = getTemperatureCategory(value, 'profundidade')

    setAnalysisData(prev => {
      const profundidadeData = (prev.profundidade as ProfundidadeComparisonUI[]) || []
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

  const handleGeralChange = (key: 'temperatura' | 'intensidade' | 'profundidade', value: number) => {
    setAnalysisData(prev => ({
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
    field => field.value in extractedColors
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
            : `Classifique a ${ANALYSIS_STEPS[currentSubStep].title.toLowerCase()} de cada cor extraída. Mova o controle deslizante para atualizar o valor.`
          }
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
          data={(analysisData[currentStepKey as keyof PigmentAnalysisDataUI] as PigmentTemperatureDataUI) || {}}
          onValueChange={handleStepValueChange}
        />
      )}
    </Card>
  )
}
