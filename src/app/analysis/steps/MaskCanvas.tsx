'use client'

import React, { useState, useEffect, useRef, forwardRef } from 'react'
import FacePositionerCanvas, { type FacePositionerCanvasHandle } from './FacePositionerCanvas'
import { type GradientConfig } from './constants/maskAnalysisColors'

interface FacePositionData {
  x: number
  y: number
  scale: number
}

interface MaskCanvasProps {
  userFacePhotoUrl: string | null | undefined
  onDataChange?: (data: FacePositionData) => void
  initialData?: FacePositionData
  rayColors?: string[]
  gradient?: GradientConfig
  backgroundType?: 'rays' | 'gradient'
  faceData?: FacePositionData
  desaturate?: boolean
}

export interface MaskCanvasHandle {
  getFacePositionData: () => FacePositionData
  resetPosition: () => void
}

const MaskCanvas = forwardRef<MaskCanvasHandle, MaskCanvasProps>(
  ({ userFacePhotoUrl, onDataChange, initialData, rayColors, gradient, backgroundType, faceData: externalFaceData, desaturate }, ref) => {
    const [internalFaceData, setInternalFaceData] = useState<FacePositionData>(
      initialData || { x: 160, y: 240, scale: 1 }
    )
    
    // Use external face data if provided, otherwise use internal state
    const faceData = externalFaceData || internalFaceData
    const updateFaceData = externalFaceData ? onDataChange : setInternalFaceData
    
    const canvasRef = useRef<FacePositionerCanvasHandle>(null)

    // Notify parent when data changes
    useEffect(() => {
      onDataChange?.(faceData)
    }, [faceData, onDataChange])

    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
      getFacePositionData: () => faceData,
      resetPosition: () => {
        updateFaceData?.({ x: 160, y: 240, scale: 1 })
      },
    }))

    return (
      <div>
        <div className="flex justify-center mb-4">
          <FacePositionerCanvas
            ref={canvasRef}
            userFacePhotoUrl={userFacePhotoUrl}
            faceData={faceData}
            onDataChange={updateFaceData}
            rayColors={rayColors}
            gradient={gradient}
            backgroundType={backgroundType}
            desaturate={desaturate}
          />
        </div>
      </div>
    )
  }
)

MaskCanvas.displayName = 'MaskCanvas'

export default MaskCanvas
