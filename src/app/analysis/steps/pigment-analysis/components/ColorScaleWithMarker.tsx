'use client'

import { Tooltip, Typography, InputNumber } from 'antd'

const { Text } = Typography

interface ColorScaleWithMarkerProps {
  colors: string[]
  markerPosition: number // 0-100 percentage
  label: string
  actualValue: string | number
  displayValue: string | number
  rangeStart: number
  rangeEnd: number
  onRangeStartChange: (value: number) => void
  onRangeEndChange: (value: number) => void
  maxValue: number
  isReadOnly?: boolean
  rangesLocked?: boolean
}

export const ColorScaleWithMarker = ({
  colors,
  markerPosition,
  label,
  actualValue,
  displayValue,
  rangeStart,
  rangeEnd,
  onRangeStartChange,
  onRangeEndChange,
  maxValue,
  isReadOnly,
  rangesLocked
}: ColorScaleWithMarkerProps) => {
  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Label and range inputs in one row */}
      <div className="flex items-center gap-3 mb-2">
        <Text type="secondary" className="text-xs whitespace-nowrap">
          {label}
        </Text>
        <div className="flex items-center gap-2">
          <InputNumber
            size="small"
            min={0}
            max={maxValue}
            value={rangeStart}
            onChange={(val) => onRangeStartChange(val ?? 0)}
            disabled={isReadOnly || rangesLocked}
            className="w-10"
            controls={false}
          />
          <Text type="secondary" className="text-xs">—</Text>
          <InputNumber
            size="small"
            min={0}
            max={maxValue}
            value={rangeEnd}
            onChange={(val) => onRangeEndChange(val ?? maxValue)}
            disabled={isReadOnly || rangesLocked}
            className="w-10"
            controls={false}
          />
        </div>
      </div>
      <div className="relative">
        {/* Color scale bar */}
        <div
          className="h-8 rounded-md flex overflow-hidden border border-gray-300"
          style={{ minWidth: '200px' }}
        >
          {colors.map((color, index) => (
            <div
              key={index}
              className="flex-1 h-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        {/* Marker - always show, clamped to 0-100 */}
        <div
          className="absolute top-0 h-full flex flex-col items-center justify-center pointer-events-none"
          style={{
            left: `${Math.max(0, Math.min(100, markerPosition))}%`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="w-0.5 h-full bg-black" />
          <Tooltip
            title={`Valor: ${actualValue}`}
            color="#fff"
            placement="top"
          >
            <div
              className="absolute bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-auto cursor-help"
            >
              {displayValue}
            </div>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
