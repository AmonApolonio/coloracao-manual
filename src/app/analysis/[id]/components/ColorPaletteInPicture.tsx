'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { CloseOutlined, ExpandOutlined, CompressOutlined, CopyOutlined } from '@ant-design/icons'
import { App as AntdApp } from 'antd'
import { SVGVectorData } from '@/lib/types-db'
import { round2Decimals } from '@/app/analysis/steps/shared/PigmentAnalysisUtils'

interface ColorPaletteInPictureProps {
  extractedColors: SVGVectorData
  onClose: () => void
}

interface Position {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

const COLOR_FIELD_ORDER = [
  'iris',
  'raiz_cabelo',
  'sobrancelha',
  'testa',
  'bochecha',
  'cavidade_ocular',
  'queixo',
  'contorno_boca',
  'boca',
] as const

const COLOR_FIELD_LABELS: Record<string, string> = {
  iris: 'Íris',
  raiz_cabelo: 'Raiz do Cabelo',
  sobrancelha: 'Sobrancelha',
  testa: 'Testa',
  bochecha: 'Bochecha',
  cavidade_ocular: 'Cavidade Ocular',
  queixo: 'Queixo',
  contorno_boca: 'Contorno da Boca',
  boca: 'Boca',
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 }
}

const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: round2Decimals(h * 360),
    s: round2Decimals(s * 100),
    l: round2Decimals(l * 100),
  }
}

const getDesaturatedColor = (hex: string): string => {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  return `hsl(${hsl.h}, 0%, ${hsl.l}%)`
}

const adjustDarknessRGB = (r: number, g: number, b: number, delta: number): string => {
  const adjustedR = Math.min(255, Math.max(0, r - delta))
  const adjustedG = Math.min(255, Math.max(0, g - delta))
  const adjustedB = Math.min(255, Math.max(0, b - delta))
  return rgbToHex(adjustedR, adjustedG, adjustedB)
}

const getDesaturatedDarkenedColor = (hex: string, darknessAmount: number = 0): string => {
  const rgb = hexToRgb(hex)
  // First convert to grayscale RGB (equal values for all channels based on luminosity)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const grayValue = Math.round((hsl.l / 100) * 255)
  // Then apply darkness by reducing the gray value
  return adjustDarknessRGB(grayValue, grayValue, grayValue, darknessAmount)
}

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

const adjustBrightnessRGB = (r: number, g: number, b: number, delta: number): string => {
  const adjustedR = Math.min(255, Math.max(0, r + delta))
  const adjustedG = Math.min(255, Math.max(0, g + delta))
  const adjustedB = Math.min(255, Math.max(0, b + delta))
  return rgbToHex(adjustedR, adjustedG, adjustedB)
}

const getBrightenedColor = (hex: string, brightnessAmount: number = 0): string => {
  const rgb = hexToRgb(hex)
  return adjustBrightnessRGB(rgb.r, rgb.g, rgb.b, brightnessAmount)
}

const SLIDER_STYLES = `
  .color-palette-slider::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    border: 2px solid #fbbf24;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
  }
  
  .color-palette-slider::-webkit-slider-thumb:hover {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    transform: scale(1.1);
  }
  
  .color-palette-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    border: 2px solid #fbbf24;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
  }
  
  .color-palette-slider::-moz-range-thumb:hover {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    transform: scale(1.1);
  }
`

export function ColorPaletteInPicture({ extractedColors, onClose }: ColorPaletteInPictureProps) {
  const { message } = AntdApp.useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<Position>({ x: 20, y: 100 })
  const [size, setSize] = useState<Size>({ width: 300, height: 700 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeDirection, setResizeDirection] = useState<string>('')
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  const [isExpanded, setIsExpanded] = useState(false)
  const [preExpandState, setPreExpandState] = useState<{ position: Position; size: Size } | null>(null)
  const [toneMode, setToneMode] = useState<'colored' | 'grayscale'>('colored')
  const [brightnessAmount, setBrightnessAmount] = useState(0)

  const squareSize = 120 // pixels
  const gap = 12 // pixels (from gap-3 = 0.75rem = 12px)
  const padding = 22 // pixels (from p-4 = 1rem = 16px on each side)
  const MIN_WIDTH = squareSize * 2 + gap + padding * 2 // Minimum width to fit 2 columns
  const MIN_HEIGHT = 200
  const MAX_WIDTH = 600
  const MAX_HEIGHT = 700

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.pip-resize') || (e.target as HTMLElement).closest('.color-palette-slider')) {
      return
    }
    e.preventDefault()
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }, [position])

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeDirection(direction)
  }, [])

  // Handle mouse move for both drag and resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x
        const newY = e.clientY - dragOffset.y
        setPosition({ x: newX, y: newY })
      }

      if (isResizing && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        let newWidth = size.width
        let newHeight = size.height
        let newX = position.x
        let newY = position.y

        if (resizeDirection.includes('e')) {
          newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX - rect.left))
        }
        if (resizeDirection.includes('w')) {
          const delta = rect.left - e.clientX
          newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, size.width + delta))
          if (newWidth !== size.width) {
            newX = position.x - (newWidth - size.width)
          }
        }
        if (resizeDirection.includes('s')) {
          newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, e.clientY - rect.top))
        }
        if (resizeDirection.includes('n')) {
          const delta = rect.top - e.clientY
          newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, size.height + delta))
          if (newHeight !== size.height) {
            newY = position.y - (newHeight - size.height)
          }
        }

        setSize({ width: newWidth, height: newHeight })
        setPosition({ x: newX, y: newY })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
      setResizeDirection('')
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, dragOffset, resizeDirection, size, position])

  // Toggle expanded/collapsed state
  const toggleExpand = () => {
    if (isExpanded && preExpandState) {
      setPosition(preExpandState.position)
      setSize(preExpandState.size)
      setPreExpandState(null)
    } else {
      setPreExpandState({ position, size })
      setSize({ width: 430, height: 490 })
      setPosition({ x: window.innerWidth / 2 - 215, y: window.innerHeight / 2 - 240 })
    }
    setIsExpanded(!isExpanded)
  }

  // Resize handles
  const resizeHandles = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']

  const getResizeHandleStyle = (direction: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      zIndex: 10,
    }

    const edgeSize = 20
    const cornerSize = 24
    const edgeOffset = -10
    const cornerOffset = -12

    switch (direction) {
      case 'n':
        return { ...base, top: edgeOffset, left: cornerSize, right: cornerSize, height: edgeSize, cursor: 'n-resize' }
      case 'ne':
        return { ...base, top: cornerOffset, right: cornerOffset, width: cornerSize, height: cornerSize, cursor: 'ne-resize' }
      case 'e':
        return { ...base, top: cornerSize, right: edgeOffset, bottom: cornerSize, width: edgeSize, cursor: 'e-resize' }
      case 'se':
        return { ...base, bottom: cornerOffset, right: cornerOffset, width: cornerSize, height: cornerSize, cursor: 'se-resize' }
      case 's':
        return { ...base, bottom: edgeOffset, left: cornerSize, right: cornerSize, height: edgeSize, cursor: 's-resize' }
      case 'sw':
        return { ...base, bottom: cornerOffset, left: cornerOffset, width: cornerSize, height: cornerSize, cursor: 'sw-resize' }
      case 'w':
        return { ...base, top: cornerSize, left: edgeOffset, bottom: cornerSize, width: edgeSize, cursor: 'w-resize' }
      case 'nw':
        return { ...base, top: cornerOffset, left: cornerOffset, width: cornerSize, height: cornerSize, cursor: 'nw-resize' }
      default:
        return base
    }
  }

  // Get array of colors from SVGVectorData in correct order
  const colorEntries = COLOR_FIELD_ORDER
    .filter(field => extractedColors[field])
    .map(field => ({
      field,
      label: COLOR_FIELD_LABELS[field] || field,
      hexColor: extractedColors[field]!.hex_color,
    }))

  // Calculate number of columns based on container width to maintain square sizes
  const cols = Math.max(2, Math.floor((size.width - padding * 2 + gap) / (squareSize + gap)))

  return (
    <div
      ref={containerRef}
      className={`
        fixed z-[9999] bg-gradient-to-br from-white/50 to-white/20 backdrop-blur-xl rounded-2xl shadow-2xl
        border-none ring-4 ring-white/20 overflow-hidden
        transition-shadow duration-200
        ${isDragging ? 'shadow-3xl cursor-grabbing' : 'cursor-grab'}
        ${isResizing ? 'select-none' : ''}
      `}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
      onMouseDown={handleDragStart}
    >
      <style>{SLIDER_STYLES}</style>
      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/5 to-transparent flex flex-col z-20">
        <div className="h-10 flex items-center justify-between px-3">
          <button
            onClick={() => {
              const modes: Array<'colored' | 'grayscale'> = ['colored', 'grayscale']
              const currentIndex = modes.indexOf(toneMode)
              const nextIndex = (currentIndex + 1) % modes.length
              setToneMode(modes[nextIndex])
              setBrightnessAmount(0)
            }}
            className={`px-2 py-1 text-xs rounded-full font-medium transition-all duration-150 ${
              toneMode === 'colored'
                ? 'text-white hover:opacity-90'
                : 'bg-gray-700 text-white hover:bg-gray-800'
            }`}
            style={toneMode === 'colored' ? { backgroundColor: '#947B62' } : {}}
            title="Alternar entre escalas: Colorida, Cinza"
          >
            {toneMode === 'colored' && 'Escala Colorida'}
            {toneMode === 'grayscale' && 'Escala de Cinza'}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const colorMap: Record<string, string> = {
                  raiz_cabelo: 'hair_root',
                  sobrancelha: 'eyebrows',
                  iris: 'iris',
                  testa: 'forehead',
                  bochecha: 'cheek',
                  cavidade_ocular: 'under_eye_skin',
                  queixo: 'chin',
                  contorno_boca: 'mouth_contour',
                  boca: 'mouth',
                }
                
                const colorsObj: Record<string, string> = {}
                COLOR_FIELD_ORDER.forEach(field => {
                  if (extractedColors[field]) {
                    const mappedKey = colorMap[field]
                    if (mappedKey) {
                      colorsObj[mappedKey] = extractedColors[field]!.hex_color
                    }
                  }
                })
                
                const jsonString = `"colors": {
        ${Object.entries(colorsObj)
          .map(([key, value]) => `"${key}": "${value}"`)
          .join(',\n        ')}
        }`
                
                navigator.clipboard.writeText(jsonString)
                message.success('Cores originais copiadas!')
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150"
              title="Copiar cores originais"
            >
              <CopyOutlined className="text-xs" />
            </button>
            <button
              onClick={toggleExpand}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-black/5 transition-all duration-150"
              title={isExpanded ? 'Reduzir' : 'Expandir'}
            >
              {isExpanded ? <CompressOutlined className="text-xs" /> : <ExpandOutlined className="text-xs" />}
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-red-500 transition-all duration-150"
              title="Fechar"
            >
              <CloseOutlined className="text-xs" />
            </button>
          </div>
        </div>
        {toneMode === 'colored' && (
          <div className="h-8 flex items-center justify-center gap-2 px-3 border-t border-gray-200/30">
            <span className="text-xs text-gray-600 font-medium">Brilho:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={brightnessAmount}
              onChange={(e) => setBrightnessAmount(Number(e.target.value))}
              className="color-palette-slider h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer w-24"
              title={`Brilho: ${brightnessAmount}`}
            />
            <span className="text-xs text-gray-600 font-medium w-8 text-right">+{brightnessAmount}</span>
          </div>
        )}
        {toneMode === 'grayscale' && (
          <div className="h-8 flex items-center justify-center gap-2 px-3 border-t border-gray-200/30">
            <span className="text-xs text-gray-600 font-medium">Escuro:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={brightnessAmount}
              onChange={(e) => setBrightnessAmount(Number(e.target.value))}
              className="color-palette-slider h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer w-24"
              title={`Escuro: ${brightnessAmount}`}
            />
            <span className="text-xs text-gray-600 font-medium w-8 text-right">-{brightnessAmount}</span>
          </div>
        )}
      </div>

      {/* Palette Container */}
      <div className="w-full h-full p-4 pt-20 overflow-y-auto">
        {colorEntries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Nenhuma cor extraída ainda
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, ${squareSize}px)`,
              gap: `${gap}px`,
            }}
          >
            {colorEntries.map(({ field, label, hexColor }) => (
              <div
                key={field}
                onClick={() => {
                  navigator.clipboard.writeText(hexColor)
                  message.success(`Tom copiado: ${hexColor}`)
                }}
                className="relative group cursor-pointer"
                title="Clique para copiar"
              >
                {/* Color swatch */}
                <div
                  className="rounded-lg shadow-md border border-gray-200/50 transition-all duration-200 group-hover:shadow-lg group-hover:scale-105 flex items-center justify-center overflow-hidden"
                  style={{
                    width: squareSize,
                    height: squareSize,
                    backgroundColor:
                      toneMode === 'grayscale'
                        ? getDesaturatedDarkenedColor(hexColor, brightnessAmount)
                        : getBrightenedColor(hexColor, brightnessAmount),
                  }}
                >
                  {/* Overlay with text - visible on hover */}
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <p className="text-xs font-medium text-white text-center px-2">
                      {label}
                    </p>
                    <p className="text-xs text-white/90 font-mono mt-1">
                      {hexColor.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subtle label */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/40 backdrop-blur-sm rounded-full">
        <span className="text-[10px] text-white/90 font-medium tracking-wide uppercase">
          Paleta
        </span>
      </div>

      {/* Resize handles */}
      {resizeHandles.map((direction) => (
        <div
          key={direction}
          className="pip-resize"
          style={getResizeHandleStyle(direction)}
          onMouseDown={(e) => handleResizeStart(e, direction)}
        />
      ))}

      {/* Corner indicators */}
      <div className="absolute bottom-1 right-1 w-4 h-4 opacity-30 pointer-events-none">
        <svg viewBox="0 0 16 16" fill="currentColor" className="text-gray-400">
          <path d="M14 16V14H16V16H14ZM14 12V10H16V12H14ZM10 16V14H12V16H10ZM14 8V6H16V8H14ZM6 16V14H8V16H6Z" />
        </svg>
      </div>
    </div>
  )
}
