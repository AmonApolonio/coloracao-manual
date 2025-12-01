'use client'

import React from 'react'
import { Tooltip, Typography, InputNumber } from 'antd'

const { Text } = Typography

interface ColorProps {
  hcl: number
  hsv: number
  details: {
    hclValues: number[]
    hsvValues: number[]
    fieldLabels: string[]
  }
}

interface ContrastScaleWithMarkerProps {
  group1Props: ColorProps // Target color (variable below)
  group2Props: ColorProps // Reference/base color (fixed at top)
  rangeMin: number
  rangeMax: number
  onRangeMinChange: (value: number) => void
  onRangeMaxChange: (value: number) => void
  isReadOnly?: boolean
  rangesLocked?: boolean
  tooltipContent?: React.ReactNode
  isAdmin?: boolean
}

export const ContrastScaleWithMarker = ({
  group1Props,
  group2Props,
  rangeMin,
  rangeMax,
  onRangeMinChange,
  onRangeMaxChange,
  isReadOnly,
  rangesLocked,
  tooltipContent,
  isAdmin
}: ContrastScaleWithMarkerProps) => {
  const steps = 15

  // Base color from group2 (fixed reference)
  const baseGroup2Lightness = group2Props.hcl

  // Target color from group1 (will vary to show contrast)
  const targetGroup1Lightness = group1Props.hcl

  // Generate contrast scale pairs
  // The scale uses the range values to show what contrast ratios look like
  // At rangeMin: group2 / group1 = rangeMin
  // At rangeMax: group2 / group1 = rangeMax
  const generateContrastPairs = () => {
    const pairs: {
      ratio: number
      group2Lightness: number
      group1Lightness: number
    }[] = []

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      // Go from rangeMin to rangeMax for the visible range
      const ratio = rangeMin + t * (rangeMax - rangeMin)

      // Group2 stays fixed (reference)
      const group2Lightness = baseGroup2Lightness

      // Group1 is calculated from the contrast formula: group2 / group1 = ratio
      // Therefore: group1 = group2 / ratio
      const group1Lightness = baseGroup2Lightness !== 0 
        ? Math.max(0, Math.min(100, baseGroup2Lightness / ratio))
        : baseGroup2Lightness

      pairs.push({ ratio, group2Lightness, group1Lightness })
    }
    return pairs
  }

  const pairs = generateContrastPairs()

  // Calculate marker position based on where group1's original lightness falls
  // Using the contrast formula: contrast = group2 / group1
  const group1ToGroup2Ratio = baseGroup2Lightness !== 0 && targetGroup1Lightness !== 0 
    ? baseGroup2Lightness / targetGroup1Lightness 
    : 1

  let markerPosition: number
  if (group1ToGroup2Ratio <= rangeMin) {
    markerPosition = 0 // At or below minimum = left edge
  } else if (group1ToGroup2Ratio >= rangeMax) {
    markerPosition = 100 // At or above maximum = right edge
  } else {
    // Linear interpolation between rangeMin and rangeMax to 0-100%
    markerPosition = ((group1ToGroup2Ratio - rangeMin) / (rangeMax - rangeMin)) * 100
  }

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Label and range inputs in one row */}
      <div className="flex items-center gap-3 mb-2 justify-end">
        <Text type="secondary" className="text-xs whitespace-nowrap">
          Escala de Contraste
        </Text>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <InputNumber
              size="small"
              min={0.5}
              max={10}
              step={0.1}
              value={rangeMin}
              onChange={(val) => onRangeMinChange(val ?? 1.0)}
              disabled={isReadOnly || rangesLocked}
              className="w-12"
              controls={false}
            />
            <Text type="secondary" className="text-xs">—</Text>
            <InputNumber
              size="small"
              min={0.5}
              max={10}
              step={0.1}
              value={rangeMax}
              onChange={(val) => onRangeMaxChange(val ?? 4.0)}
              disabled={isReadOnly || rangesLocked}
              className="w-12"
              controls={false}
            />
          </div>
        )}
      </div>

      {/* Contrast scale visualization */}
      <div className="relative flex justify-end">
        {/* Scale showing contrast pairs */}
        <div
          className="relative h-12 rounded-md flex overflow-hidden border border-gray-300 flex-1"
          style={{ maxWidth: '500px' }}
        >
          {pairs.map((pair, index) => (
            <div
              key={index}
              className="flex-1 h-full flex flex-col"
              title={`Ratio: ${pair.ratio.toFixed(2)}`}
            >
              {/* Group2 color (fixed reference at top) */}
              <div
                className="flex-1"
                style={{ backgroundColor: `hsl(0, 0%, ${pair.group2Lightness}%)` }}
              />
              {/* Group1 color (varies with contrast at bottom) */}
              <div
                className="flex-1"
                style={{ backgroundColor: `hsl(0, 0%, ${pair.group1Lightness}%)` }}
              />
            </div>
          ))}

          {/* Marker showing where original group1 color is on the scale */}
          <Tooltip title={tooltipContent} color="#fff" placement="top">
            <div
              className="absolute top-0 h-full flex flex-col items-center justify-center cursor-help"
              style={{
                left: `${Math.max(0, Math.min(100, markerPosition))}%`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="w-2 h-full bg-red-500 border-y-0 border-x-[2px] border-white" />
              {isAdmin && (
                <div
                  className="absolute bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap cursor-help"
                >
                  {group1ToGroup2Ratio.toFixed(2)}
                </div>
              )}
            </div>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
