'use client'

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva'
import { Button, Card, message, Segmented, Space } from 'antd'
import { DeleteOutlined, UndoOutlined, SaveOutlined } from '@ant-design/icons'
import Konva from 'konva'
import { ColorField, ColorExtractionData, PolygonShape } from '@/lib/types'
import { simplifyPolygon } from '@/lib/polygon-utils'

interface InteractiveColorExtractionStepProps {
  userFacePhotoUrl: string | null
  userEyePhotoUrl?: string | null
  onSave: (data: ColorExtractionData) => Promise<void>
  initialData?: ColorExtractionData
  initialHexColors?: Partial<Record<ColorField, string>>
}

export interface InteractiveColorExtractionStepHandle {
  getColorData: () => ColorExtractionData
  getHexColors: () => Partial<Record<ColorField, string>>
}

const COLOR_FIELDS: { value: ColorField; label: string }[] = [
  { value: 'iris', label: 'Iris' },
  { value: 'raiz_cabelo', label: 'Raiz Cabelo' },
  { value: 'sobrancelha', label: 'Sobrancelha' },
  { value: 'testa', label: 'Testa' },
  { value: 'bochecha', label: 'Bochecha' },
  { value: 'cavidade_ocular', label: 'Cavidade Ocular' },
  { value: 'queixo', label: 'Queixo' },
  { value: 'contorno_boca', label: 'Contorno Boca' },
  { value: 'boca', label: 'Boca' },
]

const InteractiveColorExtractionStepComponent = forwardRef<
  InteractiveColorExtractionStepHandle,
  InteractiveColorExtractionStepProps
>(
  (
    {
      userFacePhotoUrl,
      userEyePhotoUrl,
      onSave,
      initialData,
      initialHexColors,
    }: InteractiveColorExtractionStepProps,
    ref
  ) => {
    const STAGE_SIZE = 750
    const stageRef = useRef<Konva.Stage>(null)
    const layerRef = useRef<Konva.Layer>(null)
    const [image, setImage] = useState<HTMLImageElement | null>(null)
    const [lines, setLines] = useState<Array<{ points: number[] }>>([])
    const [isDrawing, setIsDrawing] = useState(false)
    const [selectedField, setSelectedField] = useState<ColorField>('iris')
    const [colorData, setColorData] = useState<ColorExtractionData>(initialData || {})
    const [hexColors, setHexColors] = useState<Partial<Record<ColorField, string>>>(initialHexColors || {})
    const [loading, setLoading] = useState(false)
    const [brushSize, setBrushSize] = useState(20)
    const [scale, setScale] = useState(1)
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
    const [isShiftPressed, setIsShiftPressed] = useState(false)
    const [isPanning, setIsPanning] = useState(false)
    const [panStart, setPanStart] = useState({ x: 0, y: 0 })
    const [shapeMode, setShapeMode] = useState<'add' | 'subtract'>('add')
    const [shapes, setShapes] = useState<Partial<Record<ColorField, PolygonShape[]>>>(() => {
      const initialShapes: Partial<Record<ColorField, PolygonShape[]>> = {}
      // Load shapes from initialData if available
      if (initialData) {
        Object.entries(initialData).forEach(([field, data]) => {
          if (data?.shapes) {
            initialShapes[field as ColorField] = data.shapes
          }
        })
      }
      return initialShapes
    })

    // Expose the color data through a ref
    useImperativeHandle(ref, () => ({
      getColorData: () => colorData,
      getHexColors: () => hexColors,
    }))

    // Determine which photo URL to use based on selected field
    const getPhotoUrlForField = () => {
    if (selectedField === 'iris' && userEyePhotoUrl) {
      return userEyePhotoUrl
    }
    return userFacePhotoUrl
  }

  // Load image
  useEffect(() => {
    const photoUrl = getPhotoUrlForField()
    if (!photoUrl) return

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setImage(img)
    img.onerror = () => message.error('Erro ao carregar a imagem')
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(photoUrl)}`
    img.src = proxyUrl
  }, [userFacePhotoUrl, userEyePhotoUrl, selectedField])

  // Load existing painted lines when switching fields and auto-center/zoom
  useEffect(() => {
    if (colorData[selectedField]) {
      setLines([{ points: colorData[selectedField]!.points }])
      // Focus on painted area
      focusOnPaintedArea(colorData[selectedField]!.points)
    } else {
      setLines([])
      // Center and maximize zoom for fresh field
      centerAndZoomImage()
    }
  }, [selectedField, image])

  const centerAndZoomImage = () => {
    if (!image) return

    const imageAspect = image.width / image.height
    const stageAspect = STAGE_SIZE / STAGE_SIZE

    let newScale: number
    let newX: number
    let newY: number

    if (imageAspect > stageAspect) {
      // Image is wider - fit width
      newScale = STAGE_SIZE / image.width
    } else {
      // Image is taller - fit height
      newScale = STAGE_SIZE / image.height
    }

    // Center the image
    newX = (STAGE_SIZE - image.width * newScale) / 2
    newY = (STAGE_SIZE - image.height * newScale) / 2

    setScale(newScale)
    setStagePos({ x: newX, y: newY })
  }

  const focusOnPaintedArea = (points: number[]) => {
    if (!image || points.length < 2) {
      centerAndZoomImage()
      return
    }

    // Find bounding box of painted area
    let minX = image.width,
      minY = image.height,
      maxX = 0,
      maxY = 0

    for (let i = 0; i < points.length; i += 2) {
      minX = Math.min(minX, points[i])
      minY = Math.min(minY, points[i + 1])
      maxX = Math.max(maxX, points[i])
      maxY = Math.max(maxY, points[i + 1])
    }

    const PADDING = 50 // pixels of padding around painted area

    const paintedWidth = maxX - minX
    const paintedHeight = maxY - minY

    // Calculate zoom to fit painted area with padding
    const scaleX = (STAGE_SIZE - PADDING * 2) / paintedWidth
    const scaleY = (STAGE_SIZE - PADDING * 2) / paintedHeight
    const newScale = Math.min(scaleX, scaleY, 10) // Cap at 10x zoom

    // Center painted area in viewport
    const paintedCenterX = (minX + maxX) / 2
    const paintedCenterY = (minY + maxY) / 2

    const newX = STAGE_SIZE / 2 - paintedCenterX * newScale
    const newY = STAGE_SIZE / 2 - paintedCenterY * newScale

    setScale(newScale)
    setStagePos({ x: newX, y: newY })
  }

  // Keyboard listeners for Shift key and Ctrl+Z undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true)
      }
      // Handle Ctrl+Z (or Cmd+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        handleUndo()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false)
        setIsPanning(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [lines, stagePos, scale])

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isShiftPressed) {
      const pos = e.target.getStage()?.getPointerPosition()
      if (pos) {
        setIsPanning(true)
        setPanStart({ x: pos.x - stagePos.x, y: pos.y - stagePos.y })
      }
    } else {
      const stage = e.target.getStage()
      const pos = stage?.getPointerPosition()
      if (pos && stage && image) {
        // Convert screen coordinates to absolute image coordinates
        // Formula: imageCoord = (screenCoord - stagePos) / scale
        const imageX = (pos.x - stagePos.x) / scale
        const imageY = (pos.y - stagePos.y) / scale
        setIsDrawing(true)
        setLines([...lines, { points: [imageX, imageY] }])
      }
    }
  }

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isShiftPressed && isPanning) {
      const pos = e.target.getStage()?.getPointerPosition()
      if (pos) {
        setStagePos({
          x: pos.x - panStart.x,
          y: pos.y - panStart.y,
        })
      }
    } else if (!isShiftPressed && isDrawing && lines.length > 0) {
      const stage = e.target.getStage()
      const pos = stage?.getPointerPosition()
      if (!pos || !stage || !image) return

      // Convert screen coordinates to absolute image coordinates
      const imageX = (pos.x - stagePos.x) / scale
      const imageY = (pos.y - stagePos.y) / scale

      const lastLine = lines[lines.length - 1]
      const newPoints = [...lastLine.points, imageX, imageY]
      const newLines = [...lines]
      newLines[newLines.length - 1] = { points: newPoints }
      setLines(newLines)
    }
  }

  const handleMouseUp = async () => {
    if (isPanning) {
      setIsPanning(false)
    } else {
      setIsDrawing(false)

      if (lines.length > 0 && stageRef.current) {
        // First calculate the average color
        await calculateAverageColor()
        
        // Then create polygon from strokes if color was extracted
        if (hexColors[selectedField]) {
          const allPoints = lines.flatMap(line => line.points)
          const simplifiedPoints = simplifyPolygon(allPoints, 2)
          
          // Add or update polygon shape
          const newShape: PolygonShape = {
            type: shapeMode,
            points: simplifiedPoints,
            hex: hexColors[selectedField]!,
          }

          setShapes(prev => ({
            ...prev,
            [selectedField]: [...(prev[selectedField] || []), newShape],
          }))

          // Update color data with shapes
          setColorData(prev => ({
            ...prev,
            [selectedField]: {
              ...prev[selectedField]!,
              shapes: [...(prev[selectedField]?.shapes || []), newShape],
            },
          }))

          message.success(`Forma ${shapeMode === 'add' ? 'adicionada' : 'subtraída'}!`)
        }

        // Clear lines for next stroke
        setLines([])
      }
    }
  }

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()

    if (!stageRef.current) return

    const stage = stageRef.current
    const oldScale = scale
    const pointer = stage.getPointerPosition()

    if (!pointer) return

    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = Math.max(0.5, Math.min(oldScale + direction * 0.1, 10))

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    }

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    }

    setScale(newScale)
    setStagePos(newPos)
  }

  const calculateAverageColor = async () => {
    try {
      if (!image || !lines || lines.length === 0) return

      // Create a temporary canvas with the original image
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = image.width
      tempCanvas.height = image.height
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) return

      // Draw the original image at full resolution
      tempCtx.drawImage(image, 0, 0, image.width, image.height)

      // Create a mask canvas to mark painted pixels
      const maskCanvas = document.createElement('canvas')
      maskCanvas.width = image.width
      maskCanvas.height = image.height
      const maskCtx = maskCanvas.getContext('2d')
      if (!maskCtx) return

      // Draw the brush strokes on mask canvas with current brush size
      maskCtx.fillStyle = 'white'
      lines.forEach(line => {
        for (let i = 0; i < line.points.length; i += 2) {
          const x = line.points[i]
          const y = line.points[i + 1]
          // Draw circle at each point with brush radius
          maskCtx.beginPath()
          maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
          maskCtx.fill()
        }
      })

      const maskData = maskCtx.getImageData(0, 0, image.width, image.height)
      const maskPixels = maskData.data
      const imageData = tempCtx.getImageData(0, 0, image.width, image.height)
      const imgPixels = imageData.data

      // Sample and average pixels that are within the painted area
      let r = 0,
        g = 0,
        b = 0,
        count = 0

      for (let i = 0; i < maskPixels.length; i += 4) {
        // Check if this pixel is painted (mask is white)
        if (maskPixels[i] > 128) {
          // Only sample image pixels that are sufficiently opaque
          const alpha = imgPixels[i + 3]
          if (alpha > 128) {
            r += imgPixels[i]
            g += imgPixels[i + 1]
            b += imgPixels[i + 2]
            count++
          }
        }
      }

      if (count === 0) {
        message.warning('Pinte uma área maior para extrair a cor')
        return
      }

      // Calculate averages
      r = Math.round(r / count)
      g = Math.round(g / count)
      b = Math.round(b / count)

      const hex = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0').toUpperCase()}`

      // Save hex color separately
      setHexColors(prev => ({
        ...prev,
        [selectedField]: hex,
      }))

      // Save only points in color data
      const allPoints = lines.flatMap(line => line.points)
      setColorData(prev => ({
        ...prev,
        [selectedField]: {
          points: allPoints,
        },
      }))

      message.success(`Cor extraída para ${COLOR_FIELDS.find(f => f.value === selectedField)?.label}!`)
    } catch (error) {
      console.error('Error calculating color:', error)
      message.error('Erro ao calcular cor')
    }
  }

  const handleUndo = () => {
    if (lines.length > 0) {
      setLines(lines.slice(0, -1))
    }
  }

  const handleClear = () => {
    setLines([])
    // Clear current field data
    const newData = { ...colorData }
    delete newData[selectedField]
    setColorData(newData)
  }

  const handleSave = async () => {
    const filledFields = Object.keys(colorData).length

    if (filledFields === 0) {
      message.warning('Por favor, pinte e extraia pelo menos uma cor')
      return
    }

    try {
      setLoading(true)
      await onSave(colorData)
      message.success('Todos os dados salvos com sucesso!')
    } catch (error) {
      console.error('Error saving:', error)
      message.error('Erro ao salvar dados')
    } finally {
      setLoading(false)
    }
  }

  const currentFieldData = colorData[selectedField]

  return (
    <div className="space-y-4">
      <Card className="border-secondary border-2">
        <div className="flex gap-8">
          {/* Left side - Canvas */}
          <div className="w-[750px]">
            {/* Canvas */}
            <div className="bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200" style={{ cursor: isShiftPressed ? 'grab' : 'crosshair', width: `${STAGE_SIZE}px`, height: `${STAGE_SIZE}px` }}>
              {image && (
                <Stage
                  ref={stageRef}
                  width={STAGE_SIZE}
                  height={STAGE_SIZE}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                  x={stagePos.x}
                  y={stagePos.y}
                  scaleX={scale}
                  scaleY={scale}
                >
                  <Layer ref={layerRef}>
                    <KonvaImage image={image} />
                    {/* Show polygon shapes for current field */}
                    {shapes[selectedField]?.map((shape, idx) => (
                      <Line
                        key={`shape-${idx}`}
                        points={shape.points}
                        stroke={shape.hex}
                        strokeWidth={2 / scale}
                        fill={shape.hex}
                        opacity={shape.type === 'add' ? 0.6 : 0.3}
                        closed
                      />
                    ))}
                    {/* Show painted strokes only for the current field */}
                    {colorData[selectedField] && hexColors[selectedField] && (
                      <Line
                        key={`saved-${selectedField}`}
                        points={colorData[selectedField]!.points}
                        stroke={hexColors[selectedField]!}
                        strokeWidth={brushSize / scale}
                        lineCap="round"
                        lineJoin="round"
                        opacity={0.8}
                      />
                    )}
                    {/* Show current drawing strokes */}
                    {lines.map((line, i) => (
                      <Line
                        key={i}
                        points={line.points}
                        stroke={shapeMode === 'add' ? '#FF6B6B' : '#FF0000'}
                        strokeWidth={brushSize / scale}
                        lineCap="round"
                        lineJoin="round"
                        opacity={0.6}
                      />
                    ))}
                  </Layer>
                </Stage>
              )}
            </div>

            {/* Shape mode toggle + brush controls */}
            <div className="mt-4 flex items-center gap-4">
              <div className="flex-1 flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Modo:</label>
                <Segmented
                  value={shapeMode}
                  onChange={value => setShapeMode(value as 'add' | 'subtract')}
                  options={[
                    { label: '➕ Adicionar', value: 'add' },
                    { label: '➖ Subtrair', value: 'subtract' },
                  ]}
                  size="small"
                />
              </div>

              <div className="flex-1 flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Pincel:</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={brushSize}
                  onChange={e => setBrushSize(parseInt(e.target.value))}
                  className="flex-1 h-1.5"
                />
                <span className="text-xs text-gray-500 w-6">{brushSize}px</span>
              </div>

              <div className="flex-1 flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Zoom:</label>
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.1"
                  value={scale}
                  onChange={e => setScale(parseFloat(e.target.value))}
                  className="flex-1 h-1.5"
                />
                <span className="text-xs text-gray-500 w-8">{(scale * 100).toFixed(0)}%</span>
              </div>

              <div className="flex gap-1">
                <Button
                  size="small"
                  onClick={handleUndo}
                  disabled={lines.length === 0}
                  title="Desfazer linha"
                >
                  ↶
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setShapes(prev => ({
                      ...prev,
                      [selectedField]: (prev[selectedField] || []).slice(0, -1),
                    }))
                    setColorData(prev => ({
                      ...prev,
                      [selectedField]: {
                        ...prev[selectedField]!,
                        shapes: (prev[selectedField]?.shapes || []).slice(0, -1),
                      },
                    }))
                  }}
                  disabled={!shapes[selectedField] || shapes[selectedField]!.length === 0}
                  title="Desfazer forma"
                >
                  ↷
                </Button>
                <Button
                  size="small"
                  danger
                  onClick={handleClear}
                  disabled={lines.length === 0 && !currentFieldData}
                  title="Limpar tudo"
                >
                  ✕
                </Button>
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-2">
              💡 Segure <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">Shift</kbd> + arraste para mover
            </div>
          </div>

          {/* Right side - Color swatches */}
          <div className="flex-1 space-y-2">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4">
              Cores
            </div>
            <div className="space-y-2 overflow-y-auto">
              {COLOR_FIELDS.map(field => {
                const data = colorData[field.value]
                const hex = hexColors[field.value]
                return (
                  <div
                    key={field.value}
                    onClick={() => setSelectedField(field.value)}
                    className={`cursor-pointer rounded-lg overflow-hidden transition-all border-2 ${
                      selectedField === field.value
                        ? 'border-secondary shadow-lg'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    {hex ? (
                      <div
                        className="w-full h-16 flex items-end p-2 text-white text-xs font-semibold"
                        style={{
                          backgroundColor: hex,
                          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                        }}
                      >
                        <div>
                          <div>{field.label}</div>
                          <div className="text-xs opacity-90">{hex}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-16 bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
                        {field.label}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
  }
)

InteractiveColorExtractionStepComponent.displayName = 'InteractiveColorExtractionStep'

export default InteractiveColorExtractionStepComponent
