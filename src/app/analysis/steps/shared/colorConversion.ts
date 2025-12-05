/**
 * Color conversion utilities
 * Converts between different color spaces: RGB, HSL, HSV, Lab, HCL
 */

// Convert hex to RGB
export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 }
}

// Convert RGB to HSL
export const rgbToHsl = (r: number, g: number, b: number) => {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  let h = 0,
    s = 0

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

// Convert RGB to HSV
export const rgbToHsv = (r: number, g: number, b: number) => {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  const v = max
  const s = max === 0 ? 0 : delta / max

  let h = 0
  if (delta !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / delta + 2) / 6
        break
      case b:
        h = ((r - g) / delta + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  }
}

// Get HSV values from hex (precise, not rounded)
export const getHsvFromHex = (hex: string): { h: number; s: number; v: number } => {
  const rgb = hexToRgb(hex)
  const max = Math.max(rgb.r, rgb.g, rgb.b)
  const min = Math.min(rgb.r, rgb.g, rgb.b)
  const delta = max - min

  const v = max
  const s = max === 0 ? 0 : delta / max

  let h = 0
  if (delta !== 0) {
    switch (max) {
      case rgb.r:
        h = ((rgb.g - rgb.b) / delta + (rgb.g < rgb.b ? 6 : 0)) / 6
        break
      case rgb.g:
        h = ((rgb.b - rgb.r) / delta + 2) / 6
        break
      case rgb.b:
        h = ((rgb.r - rgb.g) / delta + 4) / 6
        break
    }
  }

  return {
    h: h * 360,
    s: s * 100,
    v: v * 100,
  }
}

// Convert HSV to RGB
export const hsvToRgb = (h: number, s: number, v: number): { r: number; g: number; b: number } => {
  // h is 0-360, s and v are 0-100
  const sNorm = s / 100
  const vNorm = v / 100
  const hNorm = h / 360

  const i = Math.floor(hNorm * 6)
  const f = hNorm * 6 - i
  const p = vNorm * (1 - sNorm)
  const q = vNorm * (1 - f * sNorm)
  const t = vNorm * (1 - (1 - f) * sNorm)

  let r: number, g: number, b: number
  switch (i % 6) {
    case 0: r = vNorm; g = t; b = p; break
    case 1: r = q; g = vNorm; b = p; break
    case 2: r = p; g = vNorm; b = t; break
    case 3: r = p; g = q; b = vNorm; break
    case 4: r = t; g = p; b = vNorm; break
    case 5: r = vNorm; g = p; b = q; break
    default: r = 0; g = 0; b = 0
  }

  return { r, g, b }
}

// Convert HSV to Hex
export const hsvToHex = (h: number, s: number, v: number): string => {
  const rgb = hsvToRgb(h, s, v)
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

// Convert RGB to XYZ
export const rgbToXyz = (r: number, g: number, b: number) => {
  // Apply gamma correction (sRGB to linear)
  const linearR = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92
  const linearG = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92
  const linearB = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92

  // Convert to XYZ using sRGB matrix (D65 illuminant)
  const x = linearR * 0.4124564 + linearG * 0.3575761 + linearB * 0.1804375
  const y = linearR * 0.2126729 + linearG * 0.7151522 + linearB * 0.0721750
  const z = linearR * 0.0193339 + linearG * 0.1191920 + linearB * 0.9503041

  return { x, y, z }
}

// Convert XYZ to Lab
export const xyzToLab = (x: number, y: number, z: number) => {
  // D65 reference white
  const refX = 0.95047
  const refY = 1.0
  const refZ = 1.08883

  let xr = x / refX
  let yr = y / refY
  let zr = z / refZ

  const epsilon = 0.008856
  const kappa = 903.3

  const fx = xr > epsilon ? Math.pow(xr, 1/3) : (kappa * xr + 16) / 116
  const fy = yr > epsilon ? Math.pow(yr, 1/3) : (kappa * yr + 16) / 116
  const fz = zr > epsilon ? Math.pow(zr, 1/3) : (kappa * zr + 16) / 116

  const l = 116 * fy - 16
  const a = 500 * (fx - fy)
  const b_val = 200 * (fy - fz)

  return { l, a, b: b_val }
}

// Convert RGB to Lab (intermediate step for HCL)
export const rgbToLab = (r: number, g: number, b: number) => {
  const xyz = rgbToXyz(r, g, b)
  return xyzToLab(xyz.x, xyz.y, xyz.z)
}

// Convert Lab to HCL
export const labToHcl = (l: number, a: number, b: number) => {
  const c = Math.sqrt(a * a + b * b)
  let h = Math.atan2(b, a) * (180 / Math.PI)
  if (h < 0) h += 360

  return {
    h: Math.round(h),
    c: Math.round(c),
    l: Math.round(l),
  }
}

// Convert HCL to Lab
export const hclToLab = (h: number, c: number, l: number) => {
  const hRad = (h * Math.PI) / 180
  const a = c * Math.cos(hRad)
  const b = c * Math.sin(hRad)
  return { l, a, b }
}

// Convert Lab to XYZ
export const labToXyz = (l: number, a: number, b: number) => {
  // D65 reference white
  const refX = 0.95047
  const refY = 1.0
  const refZ = 1.08883

  const epsilon = 0.008856
  const kappa = 903.3

  const fy = (l + 16) / 116
  const fx = a / 500 + fy
  const fz = fy - b / 200

  const xr = Math.pow(fx, 3) > epsilon ? Math.pow(fx, 3) : (116 * fx - 16) / kappa
  const yr = l > kappa * epsilon ? Math.pow((l + 16) / 116, 3) : l / kappa
  const zr = Math.pow(fz, 3) > epsilon ? Math.pow(fz, 3) : (116 * fz - 16) / kappa

  return {
    x: xr * refX,
    y: yr * refY,
    z: zr * refZ
  }
}

// Convert XYZ to RGB
export const xyzToRgb = (x: number, y: number, z: number) => {
  // XYZ to linear RGB (D65, sRGB)
  let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314
  let g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560
  let bVal = x * 0.0556434 + y * -0.2040259 + z * 1.0572252

  // Apply gamma correction (linear to sRGB)
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g
  bVal = bVal > 0.0031308 ? 1.055 * Math.pow(bVal, 1 / 2.4) - 0.055 : 12.92 * bVal

  return {
    r: Math.max(0, Math.min(1, r)),
    g: Math.max(0, Math.min(1, g)),
    b: Math.max(0, Math.min(1, bVal)),
  }
}

// Convert Lab to RGB
export const labToRgb = (l: number, a: number, b: number) => {
  const xyz = labToXyz(l, a, b)
  return xyzToRgb(xyz.x, xyz.y, xyz.z)
}

// Convert RGB to Hex
export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (val: number) => {
    const hex = Math.round(val * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Convert HCL to Hex
export const hclToHex = (h: number, c: number, l: number): string => {
  const lab = hclToLab(h, c, l)
  const rgb = labToRgb(lab.l, lab.a, lab.b)
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

// Generate hue variations (keeping chroma and lightness constant)
export const generateHueScale = (chroma: number, lightness: number, steps: number = 12): string[] => {
  const colors: string[] = []
  for (let i = 0; i < steps; i++) {
    const hue = (i / steps) * 360
    colors.push(hclToHex(hue, chroma, lightness))
  }
  return colors
}

// Generate chroma variations (keeping hue and lightness constant)
export const generateChromaScale = (hue: number, lightness: number, maxChroma: number = 100, steps: number = 10): string[] => {
  const colors: string[] = []
  for (let i = 0; i <= steps; i++) {
    const chroma = (i / steps) * maxChroma
    colors.push(hclToHex(hue, chroma, lightness))
  }
  return colors
}

// Get HCL values from hex (precise, not rounded)
export const getHclFromHex = (hex: string): { h: number; c: number; l: number } => {
  const rgb = hexToRgb(hex)
  const lab = rgbToLab(rgb.r, rgb.g, rgb.b)
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b)
  let h = Math.atan2(lab.b, lab.a) * (180 / Math.PI)
  if (h < 0) h += 360
  return { h, c, l: lab.l }
}

// Get color properties from hex
export const getColorProperties = (hex: string) => {
  const rgb = hexToRgb(hex)
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
  const lab = rgbToLab(rgb.r, rgb.g, rgb.b)
  const hcl = labToHcl(lab.l, lab.a, lab.b)

  return {
    hue: hcl.h,
    saturation: hsv.s,
    value: hsv.v,
    chroma: hcl.c,
    lightness: hcl.l,
  }
}
