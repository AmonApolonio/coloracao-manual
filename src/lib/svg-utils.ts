/**
 * Convert an array of points to a smooth SVG path string
 * Uses Catmull-Rom spline for smooth curves
 * @param points Array of coordinates [x1, y1, x2, y2, ...]
 * @returns SVG path string (e.g., "M10,10 L20,20 L30,30")
 */
export function pointsToSVGPath(points: number[]): string {
  if (points.length < 2) return ''
  if (points.length === 2) return `M${points[0]},${points[1]}`

  // Start with first point
  let path = `M${Math.round(points[0])},${Math.round(points[1])}`

  // Add line segments to each subsequent point
  for (let i = 2; i < points.length; i += 2) {
    const x = Math.round(points[i])
    const y = Math.round(points[i + 1])
    path += ` L${x},${y}`
  }

  return path
}

/**
 * Apply Catmull-Rom spline smoothing to points
 * Creates smoother curves between points
 * @param points Array of coordinates [x1, y1, x2, y2, ...]
 * @param tension How tight the curve is (0-1, default 0.5)
 * @returns Smoothed points array
 */
export function smoothPoints(points: number[], tension: number = 0.5): number[] {
  if (points.length <= 4) return points

  const smoothed: number[] = []
  const pointCount = points.length / 2

  // Add first point
  smoothed.push(points[0], points[1])

  // For each segment, generate interpolated points
  for (let i = 0; i < pointCount - 1; i++) {
    const idx = i * 2
    const p0 = i > 0 ? [points[idx - 2], points[idx - 1]] : [points[idx], points[idx + 1]]
    const p1 = [points[idx], points[idx + 1]]
    const p2 = [points[idx + 2], points[idx + 3]]
    const p3 = i < pointCount - 2 ? [points[idx + 4], points[idx + 5]] : [points[idx + 2], points[idx + 3]]

    // Generate intermediate points using Catmull-Rom formula
    for (let t = 0; t < 1; t += 0.1) {
      const t2 = t * t
      const t3 = t2 * t

      const v0 = -tension * t3 + 2 * tension * t2 - tension * t
      const v1 = 1 + (tension - 3) * t3 + (3 - 2 * tension) * t2
      const v2 = tension * t3 + (3 - 2 * tension) * t2 + tension * t
      const v3 = -tension * t3 + tension * t2

      const x = v0 * p0[0] + v1 * p1[0] + v2 * p2[0] + v3 * p3[0]
      const y = v0 * p0[1] + v1 * p1[1] + v2 * p2[1] + v3 * p3[1]

      smoothed.push(x, y)
    }
  }

  // Add last point
  smoothed.push(points[points.length - 2], points[points.length - 1])

  return smoothed
}

/**
 * Render an SVG path to canvas and extract color from the stroked pixels
 * @param svgPath SVG path string
 * @param strokeWidth Width of the stroke in pixels
 * @param imageWidth Width of the image (for canvas sizing)
 * @param imageHeight Height of the image (for canvas sizing)
 * @returns Hex color extracted from the stroke area
 */
export function extractColorFromSVGPath(
  svgPath: string,
  strokeWidth: number,
  sourceCanvas: HTMLCanvasElement
): string {
  if (!sourceCanvas) return '#000000'

  try {
    // Create a temporary canvas for rendering
    const canvas = document.createElement('canvas')
    canvas.width = sourceCanvas.width
    canvas.height = sourceCanvas.height

    const ctx = canvas.getContext('2d')
    if (!ctx) return '#000000'

    // Draw the source image
    ctx.drawImage(sourceCanvas, 0, 0)

    // Create SVG element to get the path element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', String(canvas.width))
    svg.setAttribute('height', String(canvas.height))
    svg.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`)

    const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    pathElement.setAttribute('d', svgPath)
    pathElement.setAttribute('stroke', 'white')
    pathElement.setAttribute('stroke-width', String(strokeWidth))
    pathElement.setAttribute('fill', 'none')
    pathElement.setAttribute('stroke-linecap', 'round')
    pathElement.setAttribute('stroke-linejoin', 'round')

    svg.appendChild(pathElement)

    // Render SVG to canvas
    const svgString = new XMLSerializer().serializeToString(svg)
    const img = new Image()

    return new Promise<string>(resolve => {
      img.onload = () => {
        // Draw the SVG on top of the source image
        const finalCanvas = document.createElement('canvas')
        finalCanvas.width = canvas.width
        finalCanvas.height = canvas.height
        const finalCtx = finalCanvas.getContext('2d')
        if (!finalCtx) {
          resolve('#000000')
          return
        }

        // Draw source image
        finalCtx.drawImage(canvas, 0, 0)

        // Draw SVG stroke and sample colors
        finalCtx.drawImage(img, 0, 0)

        // Extract color from stroke pixels
        const imageData = finalCtx.getImageData(0, 0, canvas.width, canvas.height)
        const hex = calculateAverageColor(imageData.data, strokeWidth)
        resolve(hex)
      }

      img.onerror = () => resolve('#000000')

      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      img.src = url
    }) as any
  } catch (error) {
    console.error('Error extracting color from SVG path:', error)
    return '#000000'
  }
}

/**
 * Calculate average color from image data
 * Samples pixels and calculates their average RGB value
 * @param pixels ImageData.data array
 * @param strokeWidth Used to determine sampling density
 * @returns Hex color string
 */
export function calculateAverageColor(pixels: Uint8ClampedArray, strokeWidth: number = 20): string {
  let r = 0,
    g = 0,
    b = 0,
    count = 0

  // Sample every Nth pixel to improve performance for large areas
  const sampleRate = Math.max(1, Math.floor(strokeWidth / 10))

  for (let i = 0; i < pixels.length; i += 4 * sampleRate) {
    const alpha = pixels[i + 3]

    // Only sample sufficiently opaque pixels
    if (alpha > 128) {
      r += pixels[i]
      g += pixels[i + 1]
      b += pixels[i + 2]
      count++
    }
  }

  if (count === 0) {
    // If no pixels found, return black
    return '#000000'
  }

  // Calculate averages
  r = Math.round(r / count)
  g = Math.round(g / count)
  b = Math.round(b / count)

  // Convert to hex
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0').toUpperCase()}`
}

/**
 * Render SVG paths to canvas for display/preview
 * @param svgPaths Array of { path: string, strokeWidth: number, color?: string }
 * @param canvas Target canvas
 */
export function renderSVGPathsToCanvas(
  svgPaths: Array<{ path: string; strokeWidth: number; color?: string }>,
  canvas: HTMLCanvasElement
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  svgPaths.forEach(({ path, strokeWidth, color = '#FF0000' }) => {
    ctx.strokeStyle = color
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Parse SVG path and draw on canvas
    drawSVGPathOnCanvas(ctx, path)
  })
}

/**
 * Parse and draw an SVG path on canvas context
 * @param ctx Canvas 2D context
 * @param pathData SVG path data string
 */
function drawSVGPathOnCanvas(ctx: CanvasRenderingContext2D, pathData: string): void {
  const commands = parseSVGPath(pathData)

  let currentX = 0
  let currentY = 0

  commands.forEach(cmd => {
    switch (cmd.type) {
      case 'M': // Move to
        if (cmd.x !== undefined && cmd.y !== undefined) {
          currentX = cmd.x
          currentY = cmd.y
          ctx.beginPath()
          ctx.moveTo(currentX, currentY)
        }
        break

      case 'L': // Line to
        if (cmd.x !== undefined && cmd.y !== undefined) {
          ctx.lineTo(cmd.x, cmd.y)
          currentX = cmd.x
          currentY = cmd.y
        }
        break

      case 'H': // Horizontal line to
        if (cmd.x !== undefined) {
          ctx.lineTo(cmd.x, currentY)
          currentX = cmd.x
        }
        break

      case 'V': // Vertical line to
        if (cmd.y !== undefined) {
          ctx.lineTo(currentX, cmd.y)
          currentY = cmd.y
        }
        break

      case 'Z': // Close path
        ctx.closePath()
        break
    }
  })

  ctx.stroke()
}

/**
 * Parse SVG path data string into commands
 * Supports M, L, H, V, Z commands
 */
function parseSVGPath(pathData: string): Array<{ type: string; x?: number; y?: number }> {
  const commands: Array<{ type: string; x?: number; y?: number }> = []
  const commandRegex = /([MmLlHhVvZz])([^MmLlHhVvZz]*)/g
  let match

  while ((match = commandRegex.exec(pathData)) !== null) {
    const command = match[1]
    const args = match[2].trim().split(/[\s,]+/).filter(s => s)

    if (command === 'M' || command === 'm') {
      for (let i = 0; i < args.length; i += 2) {
        commands.push({
          type: i === 0 ? 'M' : 'L',
          x: parseFloat(args[i]),
          y: parseFloat(args[i + 1]),
        })
      }
    } else if (command === 'L' || command === 'l') {
      for (let i = 0; i < args.length; i += 2) {
        commands.push({
          type: 'L',
          x: parseFloat(args[i]),
          y: parseFloat(args[i + 1]),
        })
      }
    } else if (command === 'H' || command === 'h') {
      args.forEach(arg => {
        commands.push({
          type: 'H',
          x: parseFloat(arg),
        })
      })
    } else if (command === 'V' || command === 'v') {
      args.forEach(arg => {
        commands.push({
          type: 'V',
          y: parseFloat(arg),
        })
      })
    } else if (command === 'Z' || command === 'z') {
      commands.push({ type: 'Z' })
    }
  }

  return commands
}
