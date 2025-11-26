import { PigmentAnalysisDataDB, ColorField, ComparisonField, COMPARISON_FIELD_NAMES } from './types-db'
import { PigmentAnalysisDataUI, PigmentTemperatureDataUI, ProfundidadeComparisonUI } from './types-ui'
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

  // Convert profundidade - always create the full array structure
  const profundidadeUI: ProfundidadeComparisonUI[] = [
    {
      field: 'iris_vs_pele',
      name: COMPARISON_FIELD_NAMES['iris_vs_pele'],
      colors1: ['iris'],
      colors2: ['testa', 'bochecha', 'queixo'],
      value: dbData.profundidade?.['iris_vs_pele'] ?? null,
      category: dbData.profundidade?.['iris_vs_pele'] != null 
        ? getLabelCategory(dbData.profundidade['iris_vs_pele'], 'profundidade')
        : '',
    },
    {
      field: 'cavidade_ocular_vs_pele',
      name: COMPARISON_FIELD_NAMES['cavidade_ocular_vs_pele'],
      colors1: ['cavidade_ocular'],
      colors2: ['testa', 'bochecha', 'queixo'],
      value: dbData.profundidade?.['cavidade_ocular_vs_pele'] ?? null,
      category: dbData.profundidade?.['cavidade_ocular_vs_pele'] != null
        ? getLabelCategory(dbData.profundidade['cavidade_ocular_vs_pele'], 'profundidade')
        : '',
    },
    {
      field: 'cabelo_vs_pele',
      name: COMPARISON_FIELD_NAMES['cabelo_vs_pele'],
      colors1: ['raiz_cabelo', 'sobrancelha'],
      colors2: ['testa', 'bochecha', 'queixo'],
      value: dbData.profundidade?.['cabelo_vs_pele'] ?? null,
      category: dbData.profundidade?.['cabelo_vs_pele'] != null
        ? getLabelCategory(dbData.profundidade['cabelo_vs_pele'], 'profundidade')
        : '',
    },
    {
      field: 'contorno_boca_vs_boca',
      name: COMPARISON_FIELD_NAMES['contorno_boca_vs_boca'],
      colors1: ['contorno_boca'],
      colors2: ['boca'],
      value: dbData.profundidade?.['contorno_boca_vs_boca'] ?? null,
      category: dbData.profundidade?.['contorno_boca_vs_boca'] != null
        ? getLabelCategory(dbData.profundidade['contorno_boca_vs_boca'], 'profundidade')
        : '',
    },
  ]
  uiData.profundidade = profundidadeUI

  // Copy geral as-is (it's already just numbers), but always include it
  uiData.geral = {
    temperatura: dbData.geral?.temperatura ?? null,
    intensidade: dbData.geral?.intensidade ?? null,
    profundidade: dbData.geral?.profundidade ?? null,
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

  // Convert profundidade - extract only values with standardized keys, filter out null
  if (uiData.profundidade) {
    const profundidadeDB: Partial<Record<ComparisonField, number>> = {}
    uiData.profundidade.forEach((comparison) => {
      if (comparison.value !== null && comparison.field) {
        profundidadeDB[comparison.field as ComparisonField] = comparison.value
      }
    })
    if (Object.keys(profundidadeDB).length > 0) {
      dbData.profundidade = profundidadeDB
    }
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

  return dbData
}
