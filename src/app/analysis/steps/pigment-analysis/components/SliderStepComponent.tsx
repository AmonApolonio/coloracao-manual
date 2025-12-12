'use client'

import { useState, useCallback, memo, useRef, useEffect } from 'react'
import { Slider, Tag, Typography } from 'antd'
import { PigmentTemperatureDataUI } from '@/lib/types-ui'
import { hexToRgb, rgbToHsl, getColorProperties, getHclFromHex, hclToHex, getHsvFromHex, hsvToHex } from '../../shared/colorConversion'
import { COLOR_FIELDS, getLabelColor, DEFAULT_RANGES, ColorFieldKey } from '../../shared/PigmentAnalysisUtils'
import { getTemperaturaCalculationDetails } from '../../shared/temperaturaUtils'
import { getIntensidadeCalculationDetails } from '../../shared/intensidadeUtils'
import { ColorScaleWithMarker } from './ColorScaleWithMarker'

const { Text } = Typography

interface SliderStepComponentProps {
  stepKey: string
  extractedColors: { [key: string]: string }
  data: PigmentTemperatureDataUI
  onValueChange: (field: string, value: number) => void
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

// Generate colors for a custom range
const generateHueScaleInRange = (
  saturation: number, 
  value: number, 
  startHue: number, 
  endHue: number, 
  steps: number = 36
): string[] => {
  const colors: string[] = []
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    // Handle wrap-around for hue (e.g., 350° to 10°)
    let hue: number
    if (startHue <= endHue) {
      hue = startHue + t * (endHue - startHue)
    } else {
      // Wrap around through 360°
      const range = (360 - startHue) + endHue
      hue = (startHue + t * range) % 360
    }
    colors.push(hsvToHex(hue, saturation, value))
  }
  return colors
}

const generateChromaScaleInRange = (
  hue: number, 
  lightness: number, 
  startChroma: number, 
  endChroma: number, 
  steps: number = 20
): string[] => {
  const colors: string[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const chroma = startChroma + t * (endChroma - startChroma)
    colors.push(hclToHex(hue, chroma, lightness))
  }
  return colors
}

// Component for color properties with range controls
const ColorPropertiesWithRange = ({ 
  hex, 
  stepKey,
  fieldKey,
  isReadOnly,
  rangesLocked,
  isAdmin
}: { 
  hex: string
  stepKey: string
  fieldKey: string
  isReadOnly?: boolean
  rangesLocked?: boolean
  isAdmin?: boolean
}) => {
  const props = getColorProperties(hex)
  const hcl = getHclFromHex(hex)
  const hsv = getHsvFromHex(hex)

  // Get default values based on field key
  const colorField = fieldKey as ColorFieldKey
  const hueDefaults = DEFAULT_RANGES.hue[colorField] || { zero: 0, hundred: 360 }
  const chromaDefaults = DEFAULT_RANGES.chroma[colorField] || { min: 0, max: 60 }

  // State for hue range (with defaults from the field)
  const [hueStart, setHueStart] = useState<number>(hueDefaults.zero)
  const [hueEnd, setHueEnd] = useState<number>(hueDefaults.hundred)

  // State for chroma range (with defaults from the field)
  const [chromaStart, setChromaStart] = useState<number>(chromaDefaults.min)
  const [chromaEnd, setChromaEnd] = useState<number>(chromaDefaults.max)

  if (stepKey === 'temperatura') {
    // Generate hue scale within the custom range using HSV
    const hueColors = generateHueScaleInRange(hsv.s, hsv.v, hueStart, hueEnd, 36)
    const calculationDetails = getTemperaturaCalculationDetails(hex, fieldKey)
    
    return (
      <ColorScaleWithMarker
        colors={hueColors}
        markerPosition={calculationDetails.finalValue}
        label="Escala de Matiz"
        actualValue={`${Math.round(hsv.h)}°`}
        rangeStart={hueStart}
        rangeEnd={hueEnd}
        onRangeStartChange={setHueStart}
        onRangeEndChange={setHueEnd}
        maxValue={360}
        isReadOnly={isReadOnly}
        rangesLocked={rangesLocked}
        isAdmin={isAdmin}
        calculationDetails={calculationDetails}
      />
    )
  } else if (stepKey === 'intensidade') {
    // Generate chroma scale within the custom range
    const chromaColors = generateChromaScaleInRange(hcl.h, hcl.l, chromaStart, chromaEnd, 20)
    
    // Calculate marker position within the range, remapped to 0-100
    let chromaPosition: number
    if (hcl.c < chromaStart) {
      chromaPosition = 0
    } else if (hcl.c > chromaEnd) {
      chromaPosition = 100
    } else {
      chromaPosition = ((hcl.c - chromaStart) / (chromaEnd - chromaStart)) * 100
    }

    const calculationDetails = getIntensidadeCalculationDetails(hex, fieldKey)

    return (
      <ColorScaleWithMarker
        colors={chromaColors}
        markerPosition={chromaPosition}
        label="Escala de Croma"
        actualValue={`C: ${Math.round(hcl.c)}`}
        rangeStart={chromaStart}
        rangeEnd={chromaEnd}
        onRangeStartChange={setChromaStart}
        onRangeEndChange={setChromaEnd}
        maxValue={150}
        isReadOnly={isReadOnly}
        rangesLocked={rangesLocked}
        isAdmin={isAdmin}
        calculationDetails={calculationDetails}
      />
    )
  } else if (stepKey === 'profundidade') {
    return (
      <>
        <div className="flex flex-col">
          <Text type="secondary" className="text-xs mb-2">
            Valor (HSV)
          </Text>
          <Text code className="text-base">
            {props.value}%
          </Text>
        </div>
        <div className="flex flex-col">
          <Text type="secondary" className="text-xs mb-2">
            Luminosidade (HCL)
          </Text>
          <Text code className="text-base">
            {props.lightness}
          </Text>
        </div>
      </>
    )
  }

  return null
}

// Memoized slider component to prevent re-render loops
const FieldSlider = memo(({ 
  value, 
  onChange, 
  disabled 
}: { 
  value: number | null | undefined
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

export const SliderStepComponent = ({
  stepKey,
  extractedColors,
  data,
  onValueChange,
  isReadOnly,
  rangesLocked,
  isAdmin,
}: SliderStepComponentProps) => {
  return (
    <>
      <div className="space-y-8">
        {COLOR_FIELDS.filter((f) => f.value in extractedColors).map((field) => (
          <div key={field.value} className="bg-gray-50 rounded-lg p-6">
            {/* Header Row with Info Columns */}
            <div className="flex gap-6 mb-6">
              {/* Part Label Column */}
              <div className="flex flex-col">
                <Text type="secondary" className="text-xs mb-2">
                  {field.label}
                </Text>
                {data && data[field.value] && (
                  <Tag
                    color={getLabelColor(
                      data[field.value].temperature,
                      stepKey
                    )}
                    className="text-white font-semibold px-3 py-1 text-xs mt-2 w-fit"
                  >
                    {data[field.value].temperatureCategory}
                  </Tag>
                )}
              </div>

              {/* Hex Color Column */}
              <div className="flex flex-col">
                <Text type="secondary" className="text-xs mb-2">
                  Hex
                </Text>
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
              <ColorPropertiesWithRange 
                hex={extractedColors[field.value]} 
                stepKey={stepKey}
                fieldKey={field.value}
                isReadOnly={isReadOnly}
                rangesLocked={rangesLocked}
                isAdmin={isAdmin}
              />
            </div>

            {/* Color Swatch - Full Width or Side by Side for Profundidade */}
            <div className="mb-6">
              {stepKey === 'profundidade' ? (
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col">
                    <Text type="secondary" className="text-xs mb-2">
                      Original
                    </Text>
                    <div
                      className="w-full h-32 rounded-lg border-2 border-gray-300 shadow-md"
                      style={{
                        backgroundColor: extractedColors[field.value],
                      }}
                    />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <Text type="secondary" className="text-xs mb-2">
                      Escala de Cinza
                    </Text>
                    <div
                      className="w-full h-32 rounded-lg border-2 border-gray-300 shadow-md"
                      style={{
                        backgroundColor: getDesaturatedColor(
                          extractedColors[field.value]
                        ),
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
              <FieldSlider
                value={data[field.value]?.temperature}
                onChange={(value) => onValueChange(field.value, value)}
                disabled={isReadOnly}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
