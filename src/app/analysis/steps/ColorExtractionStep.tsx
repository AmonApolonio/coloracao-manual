'use client'

import { useRef, useState } from 'react'
import { Card, Button, Space, Input, message, Spin } from 'antd'
import { UploadOutlined, CameraOutlined } from '@ant-design/icons'

interface ColorExtractionStepProps {
  userFacePhotoUrl: string | null
  onSave: (data: { foreheadColor: string; foreheadHex: string; foreheadNotes: string }) => Promise<void>
  initialData?: {
    foreheadColor?: string
    foreheadHex?: string
    foreheadNotes?: string
  }
}

export default function ColorExtractionStep({
  userFacePhotoUrl,
  onSave,
  initialData,
}: ColorExtractionStepProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedColor, setSelectedColor] = useState<string>(initialData?.foreheadColor || '')
  const [selectedHex, setSelectedHex] = useState<string>(initialData?.foreheadHex || '')
  const [notes, setNotes] = useState<string>(initialData?.foreheadNotes || '')
  const [loading, setLoading] = useState(false)
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null)

  const extractColorFromImage = () => {
    if (!userFacePhotoUrl || !canvasRef.current) {
      message.error('Foto não disponível')
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      // Get pixel data from forehead area (top-middle of the image)
      const x = Math.floor(canvas.width / 2)
      const y = Math.floor(canvas.height / 4) // Upper portion for forehead

      const imageData = ctx.getImageData(x, y, 50, 50) // 50x50 pixel area
      const data = imageData.data

      // Calculate average color from the region
      let r = 0, g = 0, b = 0
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
      }

      const pixelCount = data.length / 4
      r = Math.round(r / pixelCount)
      g = Math.round(g / pixelCount)
      b = Math.round(b / pixelCount)

      const hex = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0').toUpperCase()}`

      setSelectedColor('')
      setSelectedHex(hex)
      setPreviewPosition({ x, y })
      message.success('Cor extraída com sucesso!')
    }
    img.onerror = () => {
      message.error('Erro ao carregar a imagem')
    }

    img.src = userFacePhotoUrl
  }

  const handleSave = async () => {
    if (!selectedHex) {
      message.warning('Por favor, extraia uma cor primeiro')
      return
    }

    try {
      setLoading(true)
      await onSave({
        foreheadColor: selectedColor,
        foreheadHex: selectedHex,
        foreheadNotes: notes,
      })
      message.success('Dados salvos com sucesso!')
    } catch (error) {
      console.error('Error saving:', error)
      message.error('Erro ao salvar dados')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Extração de Cor - Testa" className="border-secondary border-2">
        <div className="space-y-4">
          {/* Image Display */}
          {userFacePhotoUrl && (
            <div className="relative bg-gray-100 rounded-lg overflow-hidden max-h-96 flex items-center justify-center">
              <img
                src={userFacePhotoUrl}
                alt="Foto do usuário"
                className="max-w-full max-h-96 object-contain"
              />
              {previewPosition && (
                <div
                  className="absolute border-2 border-primary"
                  style={{
                    left: `${previewPosition.x}px`,
                    top: `${previewPosition.y}px`,
                    width: '50px',
                    height: '50px',
                    transform: 'translate(-25px, -25px)',
                  }}
                />
              )}
            </div>
          )}

          {/* Extract Button */}
          <Button
            type="primary"
            size="large"
            icon={<UploadOutlined />}
            onClick={extractColorFromImage}
            block
          >
            Extrair Cor da Testa
          </Button>

          {/* Color Preview */}
          {selectedHex && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 rounded-lg border-2 border-gray-300 shadow-md"
                  style={{ backgroundColor: selectedHex }}
                />
                <div>
                  <div className="text-sm text-gray-600">Cor Extraída</div>
                  <div className="text-2xl font-semibold text-secondary">{selectedColor}</div>
                  <div className="text-xs text-gray-500 font-mono">{selectedHex}</div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <Button
            type="primary"
            size="large"
            loading={loading}
            onClick={handleSave}
            block
            className="mt-6"
          >
            Salvar e Continuar
          </Button>
        </div>
      </Card>

      {/* Hidden Canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
