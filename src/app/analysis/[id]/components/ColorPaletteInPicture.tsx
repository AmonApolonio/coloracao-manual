'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { CloseOutlined, ExpandOutlined, CompressOutlined } from '@ant-design/icons'
import { App as AntdApp } from 'antd'
import { SVGVectorData } from '@/lib/types-db'

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
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

const getDesaturatedColor = (hex: string): string => {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  return `hsl(${hsl.h}, 0%, ${hsl.l}%)`
}

export function ColorPaletteInPicture({ extractedColors, onClose }: ColorPaletteInPictureProps) {
  const { message } = AntdApp.useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<Position>({ x: 20, y: 100 })
  const [size, setSize] = useState<Size>({ width: 280, height: 320 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeDirection, setResizeDirection] = useState<string>('')
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  const [isExpanded, setIsExpanded] = useState(false)
  const [preExpandState, setPreExpandState] = useState<{ position: Position; size: Size } | null>(null)
  const [isGrayscale, setIsGrayscale] = useState(false)

  const MIN_WIDTH = 180
  const MIN_HEIGHT = 200
  const MAX_WIDTH = 600
  const MAX_HEIGHT = 700

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.pip-resize')) {
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
      setSize({ width: 500, height: 580 })
      setPosition({ x: window.innerWidth / 2 - 250, y: window.innerHeight / 2 - 290 })
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

  return (
    <div
      ref={containerRef}
      className={`
        fixed z-[9999] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl
        border border-gray-200/50 overflow-hidden
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
      {/* Header bar */}
      <div className="pip-controls absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/5 to-transparent flex items-center justify-between px-3 z-20">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-300" />
          <div className="w-2 h-2 rounded-full bg-gray-300" />
          <div className="w-2 h-2 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsGrayscale(!isGrayscale)}
            className={`px-2 py-1 text-xs rounded-full font-medium transition-all duration-150 ${
              isGrayscale
                ? 'bg-gray-700 text-white hover:bg-gray-800'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title="Ativar/desativar escala de cinza"
          >
            {isGrayscale ? 'Escala Colorida' : 'Escala de Cinza'}
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

      {/* Palette Container */}
      <div className="w-full h-full p-4 pt-12 overflow-y-auto">
        {colorEntries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Nenhuma cor extraída ainda
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
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
                  className="w-full aspect-square rounded-lg shadow-md border border-gray-200/50 transition-all duration-200 group-hover:shadow-lg group-hover:scale-105 flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: isGrayscale ? getDesaturatedColor(hexColor) : hexColor }}
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
