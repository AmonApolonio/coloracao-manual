'use client'

import { Slider, Tag, Typography } from 'antd'
import { PigmentTemperatureDataUI } from '@/lib/types-ui'
import { hexToRgb, rgbToHsl, getColorProperties } from '../utils/colorConversion'
import { COLOR_FIELDS, getLabelColor } from '../utils/PigmentAnalysisUtils'

const { Text } = Typography

interface SliderStepComponentProps {
  stepKey: string
  extractedColors: { [key: string]: string }
  data: PigmentTemperatureDataUI
  onValueChange: (field: string, value: number) => void
}

const getDesaturatedColor = (hex: string): string => {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  // Return grayscale by setting saturation to 0
  return `hsl(${hsl.h}, 0%, ${hsl.l}%)`
}

const renderColorProperties = (hex: string, stepKey: string) => {
  const props = getColorProperties(hex)

  if (stepKey === 'temperatura') {
    return (
      <div className="flex flex-col">
        <Text type="secondary" className="text-xs mb-2">
          Hue
        </Text>
        <Text code className="text-base">
          {props.hue}°
        </Text>
      </div>
    )
  } else if (stepKey === 'intensidade') {
    return (
      <>
        <div className="flex flex-col">
          <Text type="secondary" className="text-xs mb-2">
            Saturação (HSV)
          </Text>
          <Text code className="text-base">
            {props.saturation}%
          </Text>
        </div>
        <div className="flex flex-col">
          <Text type="secondary" className="text-xs mb-2">
            Chroma (HCL)
          </Text>
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
}

export const SliderStepComponent = ({
  stepKey,
  extractedColors,
  data,
  onValueChange,
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
              {renderColorProperties(extractedColors[field.value], stepKey)}
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
              <Slider
                min={0}
                max={100}
                step={1}
                value={data[field.value]?.temperature ?? 50}
                onChange={(value) => onValueChange(field.value, value as number)}
                marks={{
                  0: '0',
                  12.5: '12.5',
                  47: '47',
                  53: '53',
                  87.5: '87.5',
                  100: '100',
                }}
                tooltip={{
                  formatter: (value) => `${value}`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
