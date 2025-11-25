'use client'

import { Slider } from 'antd'

interface SliderWithAverageMarkerProps {
  value: number | null
  averageValue: number | null
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}

export const SliderWithAverageMarker = ({
  value,
  averageValue,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: SliderWithAverageMarkerProps) => {
  // Calculate the percentage position of the average value
  const averagePercentage =
    averageValue !== null ? ((averageValue - min) / (max - min)) * 100 : 0

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
          formatter: (value) => `${value}`,
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
