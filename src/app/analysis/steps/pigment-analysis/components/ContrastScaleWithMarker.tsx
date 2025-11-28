'use client'

import React from 'react'
import { Tooltip, Typography, InputNumber } from 'antd'

const { Text } = Typography

interface ContrastScaleWithMarkerProps {
  contrastValue: number
  rangeMin: number
  rangeMax: number
  onRangeMinChange: (value: number) => void
  onRangeMaxChange: (value: number) => void
  baseColor: number // Base lightness (0-100)
  isReadOnly?: boolean
  rangesLocked?: boolean
  tooltipContent?: React.ReactNode
}

export const ContrastScaleWithMarker = ({
  contrastValue,
  rangeMin,
  rangeMax,
  onRangeMinChange,
  onRangeMaxChange,
  baseColor,
  isReadOnly,
  rangesLocked,
  tooltipContent
}: ContrastScaleWithMarkerProps) => {
  const steps = 15

  // Generate contrast scale showing what different ratios look like (REVERSED: high contrast on left, low contrast on right)
  const generateContrastPairs = () => {
    const pairs: { ratio: number; baseLightness: number; targetLightness: number }[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      // Reverse: go from rangeMax to rangeMin
      const ratio = rangeMax - t * (rangeMax - rangeMin)
      // Use a reference base lightness (like typical iris ~25-30)
      const baseLightness = baseColor > 0 ? baseColor : 25
      // Target lightness = base * ratio (clamped to 100)
      const targetLightness = Math.min(baseLightness * ratio, 100)
      pairs.push({ ratio, baseLightness, targetLightness })
    }
    return pairs
  }

  const pairs = generateContrastPairs()

  // Calculate marker position (0-100%) - REVERSED: high contrast (low ratio) = 0, low contrast (high ratio) = 100
  let markerPosition: number
  if (contrastValue <= rangeMin) {
    markerPosition = 100 // Low ratio = high contrast = right side (100)
  } else if (contrastValue >= rangeMax) {
    markerPosition = 0 // High ratio = low contrast = left side (0)
  } else {
    // Reverse the position: 100 - normal position
    markerPosition = 100 - ((contrastValue - rangeMin) / (rangeMax - rangeMin)) * 100
  }

  // Remap to 0-100 scale
  const remappedValue = markerPosition

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Label and range inputs in one row */}
      <div className="flex items-center gap-3 mb-2">
        <Text type="secondary" className="text-xs whitespace-nowrap">
          Escala de Contraste
        </Text>
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
      </div>

      {/* Contrast scale visualization */}
      <div className="relative">
        {/* Scale showing contrast pairs */}
        <div
          className="h-12 rounded-md flex overflow-hidden border border-gray-300"
          style={{ minWidth: '200px' }}
        >
          {pairs.map((pair, index) => (
            <div
              key={index}
              className="flex-1 h-full flex flex-col"
              title={`Ratio: ${pair.ratio.toFixed(2)}`}
            >
              {/* Base color (darker) */}
              <div
                className="flex-1"
                style={{ backgroundColor: `hsl(0, 0%, ${pair.baseLightness}%)` }}
              />
              {/* Target color (lighter based on ratio) */}
              <div
                className="flex-1"
                style={{ backgroundColor: `hsl(0, 0%, ${pair.targetLightness}%)` }}
              />
            </div>
          ))}
        </div>

        {/* Marker */}
        <Tooltip title={tooltipContent} color="#fff" placement="top">
          <div
            className="absolute top-0 h-full flex flex-col items-center justify-center cursor-help"
            style={{
              left: `${Math.max(0, Math.min(100, markerPosition))}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="w-1 h-full bg-red-500 border border-white" />
            <div
              className="absolute bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap cursor-help"
            >
              {Math.round(remappedValue)}
            </div>
          </div>
        </Tooltip>
      </div>
    </div>
  )
}
