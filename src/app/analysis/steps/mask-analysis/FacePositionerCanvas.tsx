'use client'

import React, { useState, useEffect, useRef, forwardRef } from 'react'
import { Stage, Layer, Ellipse, Image as KonvaImage, Group, Wedge, Rect } from 'react-konva'
import Konva from 'konva'
import { DEFAULT_RAY_COLORS, type GradientConfig } from './constants/maskAnalysisColors'

interface FacePositionData {
  x: number
  y: number
  scale: number
}

interface FacePositionerCanvasProps {
  userFacePhotoUrl: string | null | undefined
  onDataChange?: (data: FacePositionData) => void
  faceData: FacePositionData
  rayColors?: string[]
  gradient?: GradientConfig
  backgroundType?: 'rays' | 'gradient'
  canvasWidth?: number
  canvasHeight?: number
  desaturate?: boolean
}

export interface FacePositionerCanvasHandle {
  getFacePositionData: () => FacePositionData
}

const FacePositionerCanvas = forwardRef<FacePositionerCanvasHandle, FacePositionerCanvasProps>(
  (
    {
      userFacePhotoUrl,
      onDataChange,
      faceData,
      rayColors,
      gradient,
      backgroundType = 'rays',
      canvasWidth = 320,
      canvasHeight = 480,
      desaturate = false,
    },
    ref
  ) => {
    // Oval dimensions (centered on canvas) - portrait face oval
    const OVAL_WIDTH = 240
    const OVAL_HEIGHT = 340
    const OVAL_X = canvasWidth / 2
    const OVAL_Y = canvasHeight / 2

    const colors = rayColors || DEFAULT_RAY_COLORS

    const [faceImage, setFaceImage] = useState<HTMLImageElement | null>(null)
    const stageRef = useRef<Konva.Stage>(null)
    const imageRef = useRef<Konva.Image>(null)
    const [isDragging, setIsDragging] = useState(false)

    // Load the face image
    useEffect(() => {
      if (!userFacePhotoUrl) return

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => setFaceImage(img)
      img.onerror = () => {
        console.error('Failed to load face image from:', userFacePhotoUrl)
      }
      
      const isExternalUrl = userFacePhotoUrl.startsWith('http://') || userFacePhotoUrl.startsWith('https://')
      const imageSource = isExternalUrl 
        ? `/api/proxy-image?url=${encodeURIComponent(userFacePhotoUrl)}`
        : userFacePhotoUrl
      
      img.src = imageSource
    }, [userFacePhotoUrl])

    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
      getFacePositionData: () => faceData,
    }))

    const handleImageDragStart = () => {
      setIsDragging(true)
    }

    const handleImageDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
      const newPosition = {
        ...faceData,
        x: e.target.x(),
        y: e.target.y(),
      }
      onDataChange?.(newPosition)
    }

    const handleImageDragEnd = () => {
      setIsDragging(false)
    }

    // Handle mouse wheel zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const scaleAmount = 0.1
      const direction = e.deltaY > 0 ? -1 : 1
      const newScale = faceData.scale + direction * scaleAmount
      // Clamp scale between 0.2 and 3
      const clampedScale = Math.max(0.2, Math.min(3, newScale))
      onDataChange?.({
        ...faceData,
        scale: clampedScale,
      })
    }

    // Add wheel event listener to stage
    useEffect(() => {
      const stage = stageRef.current
      if (stage) {
        const container = stage.container()
        container.addEventListener('wheel', handleWheel, { passive: false })
        return () => {
          container.removeEventListener('wheel', handleWheel)
        }
      }
    }, [faceData, onDataChange])

    return (
      <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200" style={{ filter: desaturate ? 'grayscale(100%)' : 'none' }}>
        {userFacePhotoUrl && faceImage ? (
          <Stage width={canvasWidth} height={canvasHeight} ref={stageRef}>
            <Layer>
              {/* Background - either rays or gradient */}
              {backgroundType === 'gradient' && gradient ? (
                <Rect
                  x={0}
                  y={0}
                  width={canvasWidth}
                  height={canvasHeight}
                  fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                  fillLinearGradientEndPoint={{ x: canvasWidth, y: canvasHeight }}
                  fillLinearGradientColorStops={gradient.colorStops.flatMap(stop => [stop.offset, stop.color])}
                />
              ) : (
                /* Colored rays background */
                colors.map((color, index) => (
                  <Wedge
                    key={`ray-${index}`}
                    x={OVAL_X}
                    y={OVAL_Y}
                    radius={Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight)}
                    angle={360 / colors.length}
                    rotation={(360 / colors.length) * index + 180}
                    fill={color}
                    pointerEvents="none"
                  />
                ))
              )}

              {/* Background Oval */}
              <Ellipse
                x={OVAL_X}
                y={OVAL_Y}
                radiusX={OVAL_WIDTH / 2}
                radiusY={OVAL_HEIGHT / 2}
                fill="rgba(230, 230, 230, 0.3)"
                stroke="#ffffffff"
                strokeWidth={3}
                pointerEvents="none"
              />

              {/* Clipped Image Group */}
              <Group
                clipFunc={(ctx) => {
                  ctx.beginPath()
                  ctx.ellipse(OVAL_X, OVAL_Y, OVAL_WIDTH / 2, OVAL_HEIGHT / 2, 0, 0, Math.PI * 2)
                  ctx.clip()
                }}
              >
                {/* Face Image */}
                {faceImage && (
                  <KonvaImage
                    ref={imageRef}
                    image={faceImage}
                    x={faceData.x}
                    y={faceData.y}
                    scaleX={faceData.scale}
                    scaleY={faceData.scale}
                    offsetX={faceImage.width / 2}
                    offsetY={faceImage.height / 2}
                    draggable
                    onDragStart={handleImageDragStart}
                    onDragMove={handleImageDrag}
                    onDragEnd={handleImageDragEnd}
                    cursor={isDragging ? 'grabbing' : 'grab'}
                  />
                )}
              </Group>
            </Layer>
          </Stage>
        ) : (
          <div style={{ width: canvasWidth, height: canvasHeight }}>
            <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">
              <p className="text-sm">Carregando imagem...</p>
            </div>
          </div>
        )}
      </div>
    )
  }
)

FacePositionerCanvas.displayName = 'FacePositionerCanvas'

export default FacePositionerCanvas
