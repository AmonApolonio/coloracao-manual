import { SVGVectorData } from '@/lib/types'
import { PigmentAnalysisDataDB, MaskAnalysisDataDB } from '@/lib/types-db'
import { COLOR_FIELDS, COLOR_FIELDS_MAP } from './constants'
import { StepMapping } from './types'

/**
 * Map global step index to main step and sub-step
 */
export const getStepMapping = (globalStep: number): StepMapping => {
  if (globalStep === 0) return { mainStep: 0, subStep: -1 }
  if (globalStep === 1) return { mainStep: 1, subStep: -1 }
  if (globalStep >= 2 && globalStep <= 5) return { mainStep: 2, subStep: globalStep - 2 }
  if (globalStep === 6) return { mainStep: 3, subStep: -1 }
  return { mainStep: 0, subStep: -1 }
}

/**
 * Check if all required colors have been extracted
 */
export const isAllColorsExtracted = (svgVectorData: SVGVectorData | undefined): boolean => {
  if (!svgVectorData) {
    console.warn('No SVG data')
    return false
  }
  const result = COLOR_FIELDS.every(field => {
    const hasField = field in svgVectorData
    return hasField
  })
  return result
}

/**
 * Extract colors from SVG vector data
 */
export const extractColorsFromData = (svgData: SVGVectorData): { [key: string]: string } => {
  const colors: { [key: string]: string } = {}
  Object.entries(svgData).forEach(([field, vectorData]) => {
    if (vectorData?.hex_color) {
      colors[field] = vectorData.hex_color
    }
  })
  return colors
}

/**
 * Get tooltip message explaining why a step is disabled
 */
export const getDisabledReasonTooltip = (
  stepIndex: number,
  pigmentData: PigmentAnalysisDataDB | null,
  extractedColorsCount: number = 0,
  extractedColors?: { [key: string]: string }
): string => {
  if (stepIndex === 0) {
    return 'Extraia todas as cores antes de prosseguir'
  }

  if (!pigmentData) {
    return 'Nenhum dado disponível'
  }

  if (stepIndex === 1) {
    // Temperatura step
    if (!pigmentData.temperatura) {
      return 'Nenhuma temperatura definida'
    }
    const filledCount = Object.keys(pigmentData.temperatura).length
    if (filledCount < extractedColorsCount) {
      const missingFields = extractedColors
        ? Object.keys(extractedColors)
          .filter(field => !pigmentData.temperatura || !(field in pigmentData.temperatura))
          .map(field => COLOR_FIELDS_MAP[field] || field)
        : []
      return `Cores faltando: ${missingFields.join(', ')}`
    }
  } else if (stepIndex === 2) {
    // Intensidade step
    if (!pigmentData.intensidade) {
      return 'Nenhuma intensidade definida'
    }
    const filledCount = Object.keys(pigmentData.intensidade).length
    if (filledCount < extractedColorsCount) {
      const missingFields = extractedColors
        ? Object.keys(extractedColors)
          .filter(field => !pigmentData.intensidade || !(field in pigmentData.intensidade))
          .map(field => COLOR_FIELDS_MAP[field] || field)
        : []
      return `Cores faltando: ${missingFields.join(', ')}`
    }
  } else if (stepIndex === 3) {
    // Profundidade step
    if (pigmentData.profundidade === null || pigmentData.profundidade === undefined) {
      return 'Nenhuma profundidade definida'
    }
  } else if (stepIndex === 4) {
    // Geral step
    if (!pigmentData.geral) {
      return 'Nenhum dado definido, mova os controles deslizantes'
    }
    const missing = []
    if (pigmentData.geral.temperatura === null || pigmentData.geral.temperatura === undefined) {
      missing.push('Temperatura')
    }
    if (pigmentData.geral.intensidade === null || pigmentData.geral.intensidade === undefined) {
      missing.push('Intensidade')
    }
    if (pigmentData.geral.profundidade === null || pigmentData.geral.profundidade === undefined) {
      missing.push('Profundidade')
    }
    if (missing.length > 0) {
      return `Campos faltando: ${missing.join(', ')}`
    }
  }

  return 'Preencha todos os campos para continuar'
}

/**
 * Check if a pigment analysis step is complete
 */
export const isPigmentStepComplete = (
  stepIndex: number,
  pigmentData: PigmentAnalysisDataDB | null,
  extractedColorsCount: number = 0
): boolean => {
  if (!pigmentData) return false

  if (stepIndex === 1) {
    // Temperatura step - check if all extracted colors have temperature values
    if (!pigmentData.temperatura) return false
    const tempCount = Object.keys(pigmentData.temperatura).length
    return tempCount > 0 && tempCount === extractedColorsCount
  } else if (stepIndex === 2) {
    // Intensidade step - check if all extracted colors have intensidade values
    if (!pigmentData.intensidade) return false
    const intCount = Object.keys(pigmentData.intensidade).length
    return intCount > 0 && intCount === extractedColorsCount
  } else if (stepIndex === 3) {
    // Profundidade step - check if single value is set
    return pigmentData.profundidade !== null && pigmentData.profundidade !== undefined
  } else if (stepIndex === 4) {
    // Geral step - check if all geral values are set
    if (!pigmentData.geral) return false
    return (
      pigmentData.geral.temperatura !== null &&
      pigmentData.geral.temperatura !== undefined &&
      pigmentData.geral.intensidade !== null &&
      pigmentData.geral.intensidade !== undefined &&
      pigmentData.geral.profundidade !== null &&
      pigmentData.geral.profundidade !== undefined
    )
  }

  return false
}

/**
 * Get list of missing mask analysis rows
 */
export const getMissingMaskRows = (maskData: MaskAnalysisDataDB | null): string[] => {
  if (!maskData || !maskData.selectedMasks || maskData.selectedMasks.length === 0) {
    return [
      'Temperatura',
      'Subtom',
      'Intensidade',
      'Profundidade',
      'Estação de Cores',
    ]
  }

  const missing: string[] = []

  if (!maskData.temperatura || maskData.temperatura === 'neutro') missing.push('Temperatura')
  if (!maskData.subtom) missing.push('Subtom')
  if (!maskData.intensidade || maskData.intensidade === 'neutro') missing.push('Intensidade')
  if (!maskData.profundidade || maskData.profundidade === 'neutro') missing.push('Profundidade')
  if (!maskData.colorSeason) missing.push('Estação de Cores')

  return missing
}

/**
 * Check if mask analysis step is complete
 */
export const isMaskStepComplete = (maskData: MaskAnalysisDataDB | null): boolean => {
  if (!maskData || !maskData.selectedMasks || maskData.selectedMasks.length === 0) return false
  return !!(
    maskData.temperatura &&
    maskData.temperatura !== 'neutro' &&
    maskData.intensidade &&
    maskData.intensidade !== 'neutro' &&
    maskData.profundidade &&
    maskData.profundidade !== 'neutro' &&
    maskData.subtom &&
    maskData.colorSeason
  )
}

/**
 * Check if the current step's "Next" button should be disabled
 */
export const isNextButtonDisabled = (
  currentStep: number,
  allColorsExtracted: boolean,
  maskAnalysisData: MaskAnalysisDataDB | null,
  pigmentAnalysisData: PigmentAnalysisDataDB | null,
  extractedColorsCount: number
): boolean => {
  if (currentStep === 0) {
    return !allColorsExtracted
  }
  if (currentStep === 1) {
    return !isMaskStepComplete(maskAnalysisData)
  }
  if (currentStep >= 2 && currentStep <= 5) {
    return !isPigmentStepComplete(currentStep - 1, pigmentAnalysisData, extractedColorsCount)
  }
  return false
}

/**
 * Get the tooltip for disabled next button
 */
export const getNextButtonTooltip = (
  currentStep: number,
  maskAnalysisData: MaskAnalysisDataDB | null,
  pigmentAnalysisData: PigmentAnalysisDataDB | null,
  extractedColorsCount: number,
  extractedColors: { [key: string]: string }
): string | null => {
  if (currentStep === 0) {
    return 'Extraia todas as cores antes de prosseguir'
  }
  if (currentStep === 1) {
    const missing = getMissingMaskRows(maskAnalysisData)
    return `Linhas faltando: ${missing.join(', ')}`
  }
  return getDisabledReasonTooltip(currentStep - 1, pigmentAnalysisData, extractedColorsCount, extractedColors)
}
