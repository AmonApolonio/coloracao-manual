'use client'

import { useState, useRef, useCallback, memo } from 'react'
import { Slider } from 'antd'

interface SliderWithAverageMarkerProps {
  value: number | null
  averageValue: number | null
  onChange?: (value: number) => void
  disabled?: boolean
  min?: number
  max?: number
  step?: number
}

export const SliderWithAverageMarker = memo(({
  value,
  averageValue,
  onChange = () => {},
  disabled = false,
  min = 0,
  max = 100,
  step = 1,
}: SliderWithAverageMarkerProps) => {
  // Local state for smooth dragging without triggering parent re-renders
  const [localValue, setLocalValue] = useState<number>(value ?? 50)
  const isDraggingRef = useRef(false)
  
  // Sync from prop only when not dragging and value actually changed
  const lastPropValueRef = useRef(value)
  if (!isDraggingRef.current && value !== lastPropValueRef.current) {
    lastPropValueRef.current = value
    setLocalValue(value ?? 50)
  }

  // Handle slider change during drag - only update local state
  const handleChange = useCallback((newValue: number) => {
    isDraggingRef.current = true
    setLocalValue(newValue)
  }, [])

  // Handle when dragging stops - notify parent
  const handleChangeComplete = useCallback((newValue: number) => {
    isDraggingRef.current = false
    onChange(newValue)
  }, [onChange])

  // Calculate the percentage position of the average value
  const averagePercentage =
    averageValue !== null ? ((averageValue - min) / (max - min)) * 100 : 0

  return (
    <div className="relative">
      <Slider
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        value={localValue}
        onChange={handleChange}
        onChangeComplete={handleChangeComplete}
        marks={{
          0: '0',
          12.5: '12.5',
          47: '47',
          53: '53',
          87.5: '87.5',
          100: '100',
        }}
        tooltip={{
          open: false, // Disable tooltip to prevent positioning loops
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
})
