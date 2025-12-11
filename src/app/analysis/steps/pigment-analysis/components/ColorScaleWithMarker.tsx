'use client'

import { Tooltip, Typography, InputNumber } from 'antd'
import { TemperaturaCalculationDetails, IntensidadeCalculationDetails } from '../../shared/PigmentAnalysisUtils'

const { Text } = Typography

interface ColorScaleWithMarkerProps {
  colors: string[]
  markerPosition: number // 0-100 percentage
  label: string
  actualValue: string | number
  rangeStart: number
  rangeEnd: number
  onRangeStartChange: (value: number) => void
  onRangeEndChange: (value: number) => void
  maxValue: number
  isReadOnly?: boolean
  rangesLocked?: boolean
  isAdmin?: boolean
  calculationDetails?: TemperaturaCalculationDetails | IntensidadeCalculationDetails
}

export const ColorScaleWithMarker = ({
  colors,
  markerPosition,
  label,
  actualValue,
  rangeStart,
  rangeEnd,
  onRangeStartChange,
  onRangeEndChange,
  maxValue,
  isReadOnly,
  rangesLocked,
  isAdmin,
  calculationDetails
}: ColorScaleWithMarkerProps) => {
  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Label and range inputs in one row */}
      <div className="flex items-center gap-3 mb-2 justify-end">
        <Text type="secondary" className="text-xs whitespace-nowrap">
          {label}
        </Text>
        {isAdmin && (
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
        )}
      </div>
      <div className="relative flex justify-end">
        {/* Color scale bar */}
        <div
          className="relative h-8 rounded-md flex overflow-hidden border border-gray-300 flex-1"
          style={{ maxWidth: '500px' }}
        >
          {colors.map((color, index) => (
            <div
              key={index}
              className="flex-1 h-full"
              style={{ backgroundColor: color }}
            />
          ))}
          {/* Marker - always show, clamped to 0-100 */}
          <div
            className="absolute top-0 h-full flex flex-col items-center justify-center pointer-events-none"
            style={{
              left: `${Math.max(0, Math.min(100, markerPosition))}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="w-2 h-full bg-red-500 border-y-0 border-x-[2px] border-white" />
            {(
              <Tooltip
                title={
                  calculationDetails ? (
                    <div className="text-left space-y-1 text-xs">
                      {/* Check if it's TemperaturaCalculationDetails (has saturation field) */}
                      {'saturation' in calculationDetails ? (
                        <>
                          <div className="text-xs font-semibold mb-2">Cálculo de Temperatura</div>
                          <div>Hue: <span>{calculationDetails.actualHue}°</span></div>
                          <div>Range: <span>{calculationDetails.hueStart}° → {calculationDetails.hueEnd}°</span></div>
                          <div className="border-t border-gray-400 pt-1 mt-1">
                            Re-mapeado: <span>{calculationDetails.remappedValue}</span>
                          </div>
                          <div>
                            Saturação: <span>{calculationDetails.saturation}%</span>
                          </div>
                          <div>
                            Ajuste: <span>-{calculationDetails.saturationAdjustment}</span>
                          </div>
                          <div className="border-t border-gray-400 pt-1 mt-1 font-semibold">
                            Final: <span>{calculationDetails.finalValue}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs font-semibold mb-2">Cálculo de Intensidade</div>
                          <div>Chroma: <span>{calculationDetails.actualChroma}</span></div>
                          <div>Range: <span>{calculationDetails.chromaStart} → {calculationDetails.chromaEnd}</span></div>
                          <div className="border-t border-gray-400 pt-1 mt-1 font-semibold">
                            Re-mapeado: <span>{calculationDetails.remappedValue}</span>
                          </div>
                          <div className="border-t border-gray-400 pt-1 mt-1 font-semibold">
                            Final: <span>{calculationDetails.finalValue}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    `Valor: ${actualValue}`
                  )
                }
                color="#fff"
                placement="top"
              >
                <div
                  className="absolute bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-auto cursor-help"
                >
                  {calculationDetails?.finalValue ?? (typeof markerPosition === 'number' ? Math.round(markerPosition) : actualValue)}
                </div>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
