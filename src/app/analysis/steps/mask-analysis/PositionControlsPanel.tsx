'use client'

import React, { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronUp, faChevronDown, faChevronLeft, faChevronRight, faMagnifyingGlassMinus, faMagnifyingGlassPlus, faRotateLeft, faXmark } from '@fortawesome/free-solid-svg-icons'

interface FacePositionData {
  x: number
  y: number
  scale: number
}

interface PositionControlsPanelProps {
  isOpen: boolean
  onClose: () => void
  faceData: FacePositionData
  onDataChange: (data: FacePositionData) => void
}

const STEP_SIZE = 5
const ZOOM_STEP = 0.05
const MIN_SCALE = 0.2
const MAX_SCALE = 3
const PRIMARY_COLOR = '#947B62'

const PositionControlsPanel: React.FC<PositionControlsPanelProps> = ({
  isOpen,
  onClose,
  faceData,
  onDataChange,
}) => {
  const [position, setPosition] = useState({ x: 16, y: 16 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  const handlePositionChange = (field: 'x' | 'y', delta: number) => {
    onDataChange({
      ...faceData,
      [field]: faceData[field] + delta,
    })
  }

  const handleZoomChange = (delta: number) => {
    const newScale = faceData.scale + delta
    const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))
    onDataChange({
      ...faceData,
      scale: clampedScale,
    })
  }

  const handleReset = () => {
    onDataChange({
      x: 160,
      y: 240,
      scale: 1,
    })
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
      }}
      className="w-80 rounded-xl bg-white/95 backdrop-blur-sm shadow-2xl border border-gray-200 cursor-move select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200" style={{ backgroundColor: `${PRIMARY_COLOR}15` }}>
        <h3 className="text-sm font-semibold" style={{ color: PRIMARY_COLOR }}>
          Ajustar Posição
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="p-1 hover:bg-red-100 rounded-lg transition-colors text-gray-600 hover:text-red-600"
          title="Fechar painel"
        >
          <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
        </button>
      </div>

      {/* Content - 2 Column Layout */}
      <div className="p-5 grid gap-5" style={{ gridTemplateColumns: '1fr 3fr' }}>
        {/* Left Column - Vertical Control (1/3 width) */}
        <div className="flex flex-col items-center space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Vertical</p>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePositionChange('y', -STEP_SIZE)
            }}
            className="w-full h-10 rounded-lg transition-all hover:shadow-md active:shadow-inner flex items-center justify-center"
            style={{
              backgroundColor: `${PRIMARY_COLOR}20`,
              color: PRIMARY_COLOR,
              border: `2px solid ${PRIMARY_COLOR}40`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${PRIMARY_COLOR}30`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${PRIMARY_COLOR}20`
            }}
            title="Mover para cima"
          >
            <FontAwesomeIcon icon={faChevronUp} className="w-5 h-5" />
          </button>
          <div className="w-full h-10 rounded-lg flex items-center justify-center bg-gray-50 border border-gray-200">
            <span className="text-sm font-bold text-gray-800">
              {Math.round(faceData.y)}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePositionChange('y', STEP_SIZE)
            }}
            className="w-full h-10 rounded-lg transition-all hover:shadow-md active:shadow-inner flex items-center justify-center"
            style={{
              backgroundColor: `${PRIMARY_COLOR}20`,
              color: PRIMARY_COLOR,
              border: `2px solid ${PRIMARY_COLOR}40`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${PRIMARY_COLOR}30`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${PRIMARY_COLOR}20`
            }}
            title="Mover para baixo"
          >
            <FontAwesomeIcon icon={faChevronDown} className="w-5 h-5" />
          </button>
        </div>

        {/* Right Column - Horizontal and Zoom Controls */}
        <div className="flex flex-col justify-between">
          {/* Horizontal Control */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Horizontal</p>
            <div className="flex gap-2 items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePositionChange('x', -STEP_SIZE)
                }}
                className="flex-1 h-10 rounded-lg transition-all hover:shadow-md active:shadow-inner flex items-center justify-center"
                style={{
                  backgroundColor: `${PRIMARY_COLOR}20`,
                  color: PRIMARY_COLOR,
                  border: `2px solid ${PRIMARY_COLOR}40`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${PRIMARY_COLOR}30`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = `${PRIMARY_COLOR}20`
                }}
                title="Mover para esquerda"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
              </button>
              <div className="flex-1 h-10 rounded-lg flex items-center justify-center bg-gray-50 border border-gray-200">
                <span className="text-sm font-bold text-gray-800">
                  {Math.round(faceData.x)}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePositionChange('x', STEP_SIZE)
                }}
                className="flex-1 h-10 rounded-lg transition-all hover:shadow-md active:shadow-inner flex items-center justify-center"
                style={{
                  backgroundColor: `${PRIMARY_COLOR}20`,
                  color: PRIMARY_COLOR,
                  border: `2px solid ${PRIMARY_COLOR}40`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${PRIMARY_COLOR}30`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = `${PRIMARY_COLOR}20`
                }}
                title="Mover para direita"
              >
                <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Zoom Control */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Zoom</p>
            <div className="flex gap-2 items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleZoomChange(-ZOOM_STEP)
                }}
                disabled={faceData.scale <= MIN_SCALE}
                className="flex-1 h-10 rounded-lg transition-all hover:shadow-md active:shadow-inner disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center"
                style={{
                  backgroundColor: faceData.scale <= MIN_SCALE ? '#e5e7eb' : `${PRIMARY_COLOR}20`,
                  color: faceData.scale <= MIN_SCALE ? '#9ca3af' : PRIMARY_COLOR,
                  border: faceData.scale <= MIN_SCALE ? '2px solid #d1d5db' : `2px solid ${PRIMARY_COLOR}40`,
                }}
                onMouseEnter={(e) => {
                  if (faceData.scale > MIN_SCALE) {
                    e.currentTarget.style.backgroundColor = `${PRIMARY_COLOR}30`
                  }
                }}
                onMouseLeave={(e) => {
                  if (faceData.scale > MIN_SCALE) {
                    e.currentTarget.style.backgroundColor = `${PRIMARY_COLOR}20`
                  }
                }}
                title="Diminuir zoom"
              >
                <FontAwesomeIcon icon={faMagnifyingGlassMinus} className="w-4 h-4" />
              </button>
              <div className="flex-1 h-10 rounded-lg flex flex-col items-center justify-center bg-gray-50 border border-gray-200">
                <span className="text-xs font-bold text-gray-800 leading-none">
                  {Math.round(faceData.scale * 100)}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleZoomChange(ZOOM_STEP)
                }}
                disabled={faceData.scale >= MAX_SCALE}
                className="flex-1 h-10 rounded-lg transition-all hover:shadow-md active:shadow-inner disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center"
                style={{
                  backgroundColor: faceData.scale >= MAX_SCALE ? '#e5e7eb' : `${PRIMARY_COLOR}20`,
                  color: faceData.scale >= MAX_SCALE ? '#9ca3af' : PRIMARY_COLOR,
                  border: faceData.scale >= MAX_SCALE ? '2px solid #d1d5db' : `2px solid ${PRIMARY_COLOR}40`,
                }}
                onMouseEnter={(e) => {
                  if (faceData.scale < MAX_SCALE) {
                    e.currentTarget.style.backgroundColor = `${PRIMARY_COLOR}30`
                  }
                }}
                onMouseLeave={(e) => {
                  if (faceData.scale < MAX_SCALE) {
                    e.currentTarget.style.backgroundColor = `${PRIMARY_COLOR}20`
                  }
                }}
                title="Aumentar zoom"
              >
                <FontAwesomeIcon icon={faMagnifyingGlassPlus} className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Button - Full Width Below */}
      <div className="px-5 pb-5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleReset()
          }}
          className="w-full h-10 rounded-lg transition-all hover:shadow-md active:shadow-inner font-medium flex items-center justify-center gap-2"
          style={{
            backgroundColor: `${PRIMARY_COLOR}20`,
            color: PRIMARY_COLOR,
            border: `2px solid ${PRIMARY_COLOR}40`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${PRIMARY_COLOR}30`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = `${PRIMARY_COLOR}20`
          }}
        >
          <FontAwesomeIcon icon={faRotateLeft} className="w-4 h-4" />
          Resetar
        </button>
      </div>
    </div>
  )
}

export default PositionControlsPanel
