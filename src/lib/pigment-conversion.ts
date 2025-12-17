import { PigmentAnalysisDataDB, ColorField } from './types-db'
import { PigmentAnalysisDataUI, PigmentTemperatureDataUI, ProfundidadeDataUI } from './types-ui'
import { getLabelCategory } from '../app/analysis/steps/shared/PigmentAnalysisUtils'

/**
 * Convert DB format (numeric only) to UI format (with calculated properties)
 */
export const convertDBToUI = (
  dbData: PigmentAnalysisDataDB,
  extractedColors: { [key: string]: string }
): PigmentAnalysisDataUI => {
  const uiData: PigmentAnalysisDataUI = {}

  // Convert temperatura - always include all extracted colors
  const temperaturaUI: PigmentTemperatureDataUI = {}
  Object.keys(extractedColors).forEach(field => {
    const value = dbData.temperatura?.[field as keyof typeof dbData.temperatura]
    temperaturaUI[field] = {
      hexColor: extractedColors[field] || '#000000',
      temperature: value ?? null,
      temperatureCategory: value != null ? getLabelCategory(value, 'temperatura') : '',
    }
  })
  uiData.temperatura = temperaturaUI

  // Convert intensidade - always include all extracted colors
  const intensidadeUI: PigmentTemperatureDataUI = {}
  Object.keys(extractedColors).forEach(field => {
    const value = dbData.intensidade?.[field as keyof typeof dbData.intensidade]
    intensidadeUI[field] = {
      hexColor: extractedColors[field] || '#000000',
      temperature: value ?? null,
      temperatureCategory: value != null ? getLabelCategory(value, 'intensidade') : '',
    }
  })
  uiData.intensidade = intensidadeUI

  // Convert profundidade
  const profundidadeValue = dbData.profundidade ?? null
  const profundidadeUI: ProfundidadeDataUI = {
    value: profundidadeValue,
    category: profundidadeValue != null ? getLabelCategory(profundidadeValue, 'profundidade') : '',
  }
  uiData.profundidade = profundidadeUI

  // Copy geral as-is (it's already just numbers), but always include it
  uiData.geral = {
    temperatura: dbData.geral?.temperatura ?? null,
    intensidade: dbData.geral?.intensidade ?? null,
    profundidade: dbData.geral?.profundidade ?? null,
  }

  // Copy geralAvg as-is
  uiData.geralAvg = {
    temperatura: dbData.geralAvg?.temperatura ?? null,
    intensidade: dbData.geralAvg?.intensidade ?? null,
    profundidade: dbData.geralAvg?.profundidade ?? null,
  }

  return uiData
}

/**
 * Convert UI format back to DB format (extract only numeric values)
 */
export const convertUIToDB = (uiData: PigmentAnalysisDataUI): PigmentAnalysisDataDB => {
  const dbData: PigmentAnalysisDataDB = {}

  // Convert temperatura - extract only values, filter out null
  if (uiData.temperatura) {
    const temperaturaDB: Partial<Record<ColorField, number>> = {}
    Object.entries(uiData.temperatura).forEach(([field, data]) => {
      if (data.temperature !== null) {
        temperaturaDB[field as ColorField] = data.temperature
      }
    })
    if (Object.keys(temperaturaDB).length > 0) {
      dbData.temperatura = temperaturaDB
    }
  }

  // Convert intensidade - extract only values, filter out null
  if (uiData.intensidade) {
    const intensidadeDB: Partial<Record<ColorField, number>> = {}
    Object.entries(uiData.intensidade).forEach(([field, data]) => {
      if (data.temperature !== null) {
        intensidadeDB[field as ColorField] = data.temperature
      }
    })
    if (Object.keys(intensidadeDB).length > 0) {
      dbData.intensidade = intensidadeDB
    }
  }

  // Convert profundidade
  if (uiData.profundidade && uiData.profundidade.value !== null) {
    dbData.profundidade = uiData.profundidade.value
  }

  // Copy geral, filtering out null values
  if (uiData.geral) {
    const geralDB: Partial<{ temperatura: number; intensidade: number; profundidade: number }> = {}
    if (uiData.geral.temperatura !== null) geralDB.temperatura = uiData.geral.temperatura
    if (uiData.geral.intensidade !== null) geralDB.intensidade = uiData.geral.intensidade
    if (uiData.geral.profundidade !== null) geralDB.profundidade = uiData.geral.profundidade
    if (Object.keys(geralDB).length > 0) {
      dbData.geral = geralDB as any
    }
  }

  // Copy geralAvg as-is
  if (uiData.geralAvg) {
    dbData.geralAvg = {
      temperatura: uiData.geralAvg.temperatura,
      intensidade: uiData.geralAvg.intensidade,
      profundidade: uiData.geralAvg.profundidade,
    }
  }

  return dbData
}
