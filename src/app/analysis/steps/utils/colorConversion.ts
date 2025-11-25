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

  return {
    h: 0,
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  }
}

// Convert RGB to Lab (intermediate step for HCL)
export const rgbToLab = (r: number, g: number, b: number) => {
  let [x, y, z] = [r, g, b].map((val) => {
    val = val > 0.04045 ? Math.pow((val + 0.055) / 1.055, 2.4) : val / 12.92
    return val * 100
  })

  x = x / 95.047
  y = y / 100
  z = z / 108.883

  const [xn, yn, zn] = [x, y, z].map((val) => {
    return val > 0.008856 ? Math.pow(val, 1 / 3) : 7.787 * val + 16 / 116
  })

  const l = 116 * yn - 16
  const a = 500 * (xn - yn)
  const b_val = 200 * (yn - zn)

  return { l, a, b: b_val }
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
