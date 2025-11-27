'use client'

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva'
import { Button, Card, App as AntdApp } from 'antd'
import { DeleteOutlined, UndoOutlined, SaveOutlined } from '@ant-design/icons'
import Konva from 'konva'
import { ColorField, SVGVectorData, SVGVector } from '@/lib/types'
import { pointsToSVGPath } from '@/lib/svg-utils'

interface InteractiveColorExtractionStepProps {
  userFacePhotoUrl: string | null
  userEyePhotoUrl?: string | null
  onSave: (data: SVGVectorData) => Promise<void>
  initialData?: SVGVectorData
  onDataChange?: (data: SVGVectorData) => void
  isReadOnly?: boolean
}

export interface InteractiveColorExtractionStepHandle {
  getSVGVectorData: () => SVGVectorData
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
      onDataChange,
      isReadOnly,
    }: InteractiveColorExtractionStepProps,
    ref
  ) => {
    const { message } = AntdApp.useApp()
    const STAGE_SIZE = 750
    const stageRef = useRef<Konva.Stage>(null)
    const layerRef = useRef<Konva.Layer>(null)
    const imageRef = useRef<HTMLImageElement | null>(null)
    
    const [image, setImage] = useState<HTMLImageElement | null>(null)
    const [currentStroke, setCurrentStroke] = useState<number[]>([])
    const [isDrawing, setIsDrawing] = useState(false)
    const [selectedField, setSelectedField] = useState<ColorField>('iris')
    const [svgVectors, setSVGVectors] = useState<SVGVectorData>(initialData || {})
    const [loading, setLoading] = useState(false)
    const [brushSize, setBrushSize] = useState(10)
    const [scale, setScale] = useState(1)
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
    const [isShiftPressed, setIsShiftPressed] = useState(false)
    const [isPanning, setIsPanning] = useState(false)
    const [panStart, setPanStart] = useState({ x: 0, y: 0 })

    // Expose the SVG vector data through a ref
    useImperativeHandle(ref, () => ({
      getSVGVectorData: () => svgVectors,
    }))

    // Notify parent when SVG data changes
    useEffect(() => {
      onDataChange?.(svgVectors)
    }, [svgVectors, onDataChange])

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
      img.onload = () => {
        setImage(img)
        imageRef.current = img
        // Reset view when image loads
        centerAndZoomImage()
      }
      img.onerror = () => message.error('Erro ao carregar a imagem')
      
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(photoUrl)}`
      img.src = proxyUrl
    }, [userFacePhotoUrl, userEyePhotoUrl, selectedField])

    // Load existing vectors when switching fields and auto-center/zoom
    useEffect(() => {
      if (image && svgVectors[selectedField]) {
        // If there's a vector, focus on it
        focusOnPaintedArea(svgVectors[selectedField]!)
      } else if (image) {
        // Otherwise center and maximize zoom for fresh field
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

    const focusOnPaintedArea = (vector: SVGVector) => {
      if (!image) {
        centerAndZoomImage()
        return
      }

      // Parse SVG path to find bounding box
      const bbox = getSVGPathBoundingBox(vector.svg_path)
      if (!bbox) {
        centerAndZoomImage()
        return
      }

      const PADDING = 150

      const paintedWidth = bbox.maxX - bbox.minX
      const paintedHeight = bbox.maxY - bbox.minY

      // Calculate zoom to fit painted area with padding
      const scaleX = (STAGE_SIZE - PADDING * 2) / paintedWidth
      const scaleY = (STAGE_SIZE - PADDING * 2) / paintedHeight
      const newScale = Math.min(scaleX, scaleY, 3)

      // Center painted area in viewport
      const paintedCenterX = (bbox.minX + bbox.maxX) / 2
      const paintedCenterY = (bbox.minY + bbox.maxY) / 2

      const newX = STAGE_SIZE / 2 - paintedCenterX * newScale
      const newY = STAGE_SIZE / 2 - paintedCenterY * newScale

      setScale(newScale)
      setStagePos({ x: newX, y: newY })
    }

    // Get bounding box of SVG path
    const getSVGPathBoundingBox = (
      svgPath: string
    ): { minX: number; minY: number; maxX: number; maxY: number } | null => {
      const coords = svgPath.match(/[\d.-]+/g)?.map(Number) || []
      if (coords.length < 2) return null

      let minX = coords[0],
        minY = coords[1],
        maxX = coords[0],
        maxY = coords[1]

      for (let i = 0; i < coords.length; i += 2) {
        minX = Math.min(minX, coords[i])
        minY = Math.min(minY, coords[i + 1])
        maxX = Math.max(maxX, coords[i])
        maxY = Math.max(maxY, coords[i + 1])
      }

      return { minX, minY, maxX, maxY }
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
    }, [svgVectors])

    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isShiftPressed) {
        const pos = e.target.getStage()?.getPointerPosition()
        if (pos) {
          setIsPanning(true)
          setPanStart({ x: pos.x - stagePos.x, y: pos.y - stagePos.y })
        }
      } else if (!isReadOnly) {
        const stage = e.target.getStage()
        const pos = stage?.getPointerPosition()
        if (pos && stage && image) {
          // Convert screen coordinates to absolute image coordinates
          const imageX = (pos.x - stagePos.x) / scale
          const imageY = (pos.y - stagePos.y) / scale
          setIsDrawing(true)
          setCurrentStroke([imageX, imageY])
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
      } else if (!isShiftPressed && isDrawing && currentStroke.length > 0) {
        const stage = e.target.getStage()
        const pos = stage?.getPointerPosition()
        if (!pos || !stage || !image) return

        // Convert screen coordinates to absolute image coordinates
        const imageX = (pos.x - stagePos.x) / scale
        const imageY = (pos.y - stagePos.y) / scale

        setCurrentStroke(prev => [...prev, imageX, imageY])
      }
    }

    const handleMouseUp = async () => {
      if (isPanning) {
        setIsPanning(false)
      } else if (isDrawing && currentStroke.length > 2) {
        setIsDrawing(false)

        try {
          // Convert stroke points to SVG path
          const svgPath = pointsToSVGPath(currentStroke)

          // Extract color from the drawn area
          const hexColor = await extractColorFromStroke()

          // Create SVG vector
          const vector: SVGVector = {
            svg_path: svgPath,
            stroke_width: brushSize,
            hex_color: hexColor,
          }

          // Save vector for current field
          setSVGVectors(prev => ({
            ...prev,
            [selectedField]: vector,
          }))

          message.success('Forma adicionada!')
        } catch (error) {
          console.error('Error processing stroke:', error)
          message.error('Erro ao processar traço')
        }

        // Clear current stroke
        setCurrentStroke([])
      } else {
        setIsDrawing(false)
        setCurrentStroke([])
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

    const extractColorFromStroke = async (): Promise<string> => {
      if (!image) return '#000000'

      try {
        // Create a source canvas with the image
        const sourceCanvas = document.createElement('canvas')
        sourceCanvas.width = image.width
        sourceCanvas.height = image.height
        const sourceCtx = sourceCanvas.getContext('2d')
        if (!sourceCtx) return '#000000'

        sourceCtx.drawImage(image, 0, 0)

        // Create a canvas to render the stroke
        const strokeCanvas = document.createElement('canvas')
        strokeCanvas.width = image.width
        strokeCanvas.height = image.height
        const strokeCtx = strokeCanvas.getContext('2d')
        if (!strokeCtx) return '#000000'

        // Draw the stroke on the canvas
        strokeCtx.strokeStyle = 'rgba(255, 0, 0, 1)'
        strokeCtx.lineWidth = brushSize
        strokeCtx.lineCap = 'round'
        strokeCtx.lineJoin = 'round'

        // Draw the current stroke
        if (currentStroke.length > 0) {
          strokeCtx.beginPath()
          strokeCtx.moveTo(currentStroke[0], currentStroke[1])
          for (let i = 2; i < currentStroke.length; i += 2) {
            strokeCtx.lineTo(currentStroke[i], currentStroke[i + 1])
          }
          strokeCtx.stroke()
        }

        // Get stroke pixels
        const strokeImageData = strokeCtx.getImageData(0, 0, image.width, image.height)
        const strokePixels = strokeImageData.data

        // Get source pixels
        const sourceImageData = sourceCtx.getImageData(0, 0, image.width, image.height)
        const sourcePixels = sourceImageData.data

        // Sample colors from source image where stroke is drawn
        let r = 0,
          g = 0,
          b = 0,
          count = 0

        for (let i = 0; i < strokePixels.length; i += 4) {
          // Check if this pixel is part of the stroke (red channel > 128)
          if (strokePixels[i] > 128) {
            const alpha = sourcePixels[i + 3]
            // Only sample source pixels that are sufficiently opaque
            if (alpha > 128) {
              r += sourcePixels[i]
              g += sourcePixels[i + 1]
              b += sourcePixels[i + 2]
              count++
            }
          }
        }

        if (count === 0) {
          message.warning('Pinte uma área maior para extrair a cor')
          return '#000000'
        }

        // Calculate averages
        r = Math.round(r / count)
        g = Math.round(g / count)
        b = Math.round(b / count)

        const hex = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0').toUpperCase()}`
        return hex
      } catch (error) {
        console.error('Error extracting color:', error)
        message.error('Erro ao calcular cor')
        return '#000000'
      }
    }

    const handleUndo = () => {
      // Clear the vector for the current field
      const newVectors = { ...svgVectors }
      delete newVectors[selectedField]
      setSVGVectors(newVectors)
      message.info('Traço removido')
    }

    const handleClear = () => {
      setCurrentStroke([])
      message.info('Traço atual cancelado')
    }

    const handleSave = async () => {
      const filledFields = Object.keys(svgVectors).length

      if (filledFields === 0) {
        message.warning('Por favor, pinte e extraia pelo menos uma cor')
        return
      }

      try {
        setLoading(true)
        await onSave(svgVectors)
        message.success('Todos os dados salvos com sucesso!')
      } catch (error) {
        console.error('Error saving:', error)
        message.error('Erro ao salvar dados')
      } finally {
        setLoading(false)
      }
    }

    const currentVector = svgVectors[selectedField]

    return (
      <div className="space-y-4">
        <Card className="border-secondary border-2">
          <div className="flex gap-8">
            {/* Left side - Canvas */}
            <div className="w-[750px]">
              {/* Canvas */}
              <div
                className="bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200"
                style={{
                  cursor: isShiftPressed ? 'grab' : 'crosshair',
                  width: `${STAGE_SIZE}px`,
                  height: `${STAGE_SIZE}px`,
                }}
              >
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
                      
                      {/* Show saved vectors for current field */}
                      {currentVector && (
                        <Line
                          points={currentVector.svg_path
                            .replace(/[MLZ]/g, '')
                            .split(' ')
                            .filter(p => p)
                            .flatMap(p => p.split(',').map(Number))}
                          stroke="#FF0000"
                          strokeWidth={currentVector.stroke_width}
                          lineCap="round"
                          lineJoin="round"
                          opacity={0.8}
                        />
                      )}

                      {/* Show current drawing stroke being created */}
                      {currentStroke.length > 0 && (
                        <Line
                          points={currentStroke}
                          stroke="#FF0000"
                          strokeWidth={brushSize}
                          lineCap="round"
                          lineJoin="round"
                          opacity={1}
                        />
                      )}
                    </Layer>
                  </Stage>
                )}
              </div>

              {/* Brush controls */}
              <div className="mt-4 flex items-center gap-4">
                <div className="flex-1 flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                    Pincel:
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={brushSize}
                    onChange={e => setBrushSize(parseInt(e.target.value))}
                    className="flex-1 h-1.5"
                    disabled={isReadOnly}
                  />
                  <span className="text-xs text-gray-500 w-6">{brushSize}px</span>
                </div>

                <div className="flex-1 flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">
                    Zoom:
                  </label>
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
                    disabled={!currentVector || isReadOnly}
                    title="Desfazer traço"
                    icon={<UndoOutlined />}
                  />
                  <Button
                    size="small"
                    danger
                    onClick={handleClear}
                    disabled={currentStroke.length === 0 || isReadOnly}
                    title="Limpar traço atual"
                    icon={<DeleteOutlined />}
                  />
                </div>
              </div>

              {!isReadOnly && (
                <div className="text-xs text-gray-500 mt-2">
                  💡 Segure <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">
                    Shift
                  </kbd>{' '}
                  + arraste para mover
                </div>
              )}
              {isReadOnly && (
                <div className="text-xs text-amber-600 mt-2 bg-amber-50 px-3 py-2 rounded">
                  🔒 Modo visualização - Esta análise já foi concluída
                </div>
              )}
            </div>

            {/* Right side - Color swatches */}
            <div className="flex-1 space-y-2">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4">
                Cores
              </div>
              <div className="space-y-2 overflow-y-auto">
                {COLOR_FIELDS.map(field => {
                  const vector = svgVectors[field.value]
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
                      {vector ? (
                        <div
                          className="w-full h-16 flex items-end p-2 text-white text-xs font-semibold"
                          style={{
                            backgroundColor: vector.hex_color,
                            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                          }}
                        >
                          <div>
                            <div>{field.label}</div>
                            <div className="text-xs opacity-90">{vector.hex_color}</div>
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
