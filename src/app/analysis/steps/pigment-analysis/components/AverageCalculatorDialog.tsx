'use client'

import { useState, useMemo } from 'react'
import { Modal, Checkbox, Typography, Slider } from 'antd'
import { PigmentTemperatureDataUI } from '@/lib/types-ui'
import { calculateWeightedAverage, getWeightForValue } from '../../shared/PigmentAnalysisUtils'

const { Text } = Typography

interface AverageCalculatorDialogProps {
  isOpen: boolean
  onClose: () => void
  stepData: PigmentTemperatureDataUI | undefined
  stepName: 'temperatura' | 'intensidade'
  currentAverage: number | null
}

export const AverageCalculatorDialog = ({
  isOpen,
  onClose,
  stepData,
  stepName,
  currentAverage,
}: AverageCalculatorDialogProps) => {
  // Initialize selected items - all selected by default
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => {
    if (!stepData) return new Set()
    return new Set(Object.keys(stepData))
  })

  // Calculate filtered average based on selected items
  const { filteredAverage, items } = useMemo(() => {
    if (!stepData) return { filteredAverage: null, items: [] }

    // For temperatura and intensidade (object)
    const processedItems = Object.entries(stepData).map(([key, data]) => ({
      id: key,
      name: key,
      value: data.temperature,
      isSelected: selectedItems.has(key),
    }))

    const selectedValues = processedItems
      .filter((item) => item.isSelected && item.value !== null)
      .map((item) => item.value as number)

    const average = selectedValues.length > 0 ? calculateWeightedAverage(selectedValues) : null

    return { filteredAverage: average, items: processedItems }
  }, [stepData, selectedItems])

  const handleToggleItem = (id: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map((item) => item.id)))
    }
  }

  return (
    <Modal
      title={`Calculadora de Média - ${stepName.charAt(0).toUpperCase() + stepName.slice(1)}`}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={600}
      style={{ height: '90vh' }}
      styles={{ body: { height: 'calc(90vh - 130px)', display: 'flex', flexDirection: 'column', padding: '16px' } }}
    >
      <div className="flex flex-col h-full gap-3">
        {/* Header with Select All and Summary */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#F5F0EA' }}>
            <Checkbox
              checked={selectedItems.size === items.length && items.length > 0}
              indeterminate={selectedItems.size > 0 && selectedItems.size < items.length}
              onChange={handleSelectAll}
            >
              <Text strong className="text-sm">Selecionar Todos</Text>
            </Checkbox>
          </div>
          <Text type="secondary" className="text-xs">
            <span className="font-semibold">{selectedItems.size}</span> de <span className="font-semibold">{items.length}</span> itens
          </Text>
        </div>

        {/* Individual Items */}
        <div className="space-y-2 overflow-y-auto flex-1">
          {items.map((item) => {
            const weight = item.value !== null ? getWeightForValue(item.value) : null
            return (
              <div
                key={item.id}
                className={`p-3 rounded-lg border-2 transition-all ${item.isSelected
                    ? 'bg-gray-50 border-[#947B62]'
                    : 'bg-gray-50 border-gray-200'
                  }`}
                style={item.isSelected ? { backgroundColor: '#F5F0EA', borderColor: '#947B62' } : undefined}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    checked={item.isSelected}
                    onChange={() => handleToggleItem(item.id)}
                  />
                  <Text className="text-sm flex-1">{item.name}</Text>
                  {item.value !== null && (
                    <div className="flex items-center gap-2">
                      <Text code className="text-xs font-semibold">
                        {item.value}
                      </Text>
                      <Text className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#E8D7C3', color: '#5D4E37' }}>
                        peso {weight}
                      </Text>
                    </div>
                  )}
                </div>

                {item.value !== null && (
                  <div className="pl-6 pr-1">
                    <div className="relative">
                      <Slider
                        className={`average-calc-slider-${item.id}`}
                        value={item.value}
                        min={0}
                        max={100}
                        disabled
                        marks={{
                          0: '0',
                          12.5: '12.5',
                          47: '47',
                          53: '53',
                          87.5: '87.5',
                          100: '100',
                        }}
                        tooltip={{
                          open: false,
                        }}
                      />
                      {/* Highlighted dot marker */}
                      <div
                        className="absolute top-0 h-full pointer-events-none flex items-center"
                        style={{
                          left: `calc(${((item.value - 0) / (100 - 0)) * 100}% - 8px)`,
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded-full border-2 border-red-500 bg-red-300 shadow-md"
                          title={`Valor: ${item.value}`}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Average Comparison - Single Row with Weighted Average Details */}
        <div className="bg-gray-50 p-3 rounded-lg space-y-3 flex-shrink-0">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Text className="text-sm">Média Original (Ponderada):</Text>
              <Text code className="font-semibold">
                {currentAverage}
              </Text>
            </div>
            <div className="flex items-center gap-2">
              <Text className="text-sm">Média Filtrada (Ponderada):</Text>
              <Text code className="font-semibold">
                {filteredAverage}
              </Text>
            </div>
          </div>
          
          {/* Weight legend */}
          <div className="border-t border-gray-300 pt-2">
            <Text type="secondary" className="text-xs block mb-2">
              <span className="font-semibold">Tabela de Pesos:</span>
            </Text>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
              <div>• 0 - 12,5: <span className="font-semibold">Peso 4</span></div>
              <div>• 12,5 - 47: <span className="font-semibold">Peso 2</span></div>
              <div>• 47 - 53: <span className="font-semibold">Peso 1</span></div>
              <div>• 54 - 87,5: <span className="font-semibold">Peso 2</span></div>
              <div className="col-span-2">• 87,5 - 100: <span className="font-semibold">Peso 4</span></div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
