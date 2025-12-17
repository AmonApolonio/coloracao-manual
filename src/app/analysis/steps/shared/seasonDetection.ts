/**
 * Season detection based on mask analysis selections
 * Determines which season applies to the selected combination
 * and provides suggestions for invalid combinations
 */

import { Season, SeasonVariant, ColorSeason, SEASON_VARIANTS, getColorSeason } from '@/lib/types'

export type SeasonResult = {
  valid: boolean
  season?: Season
  variant?: SeasonVariant
  suggestions?: string[]
  fullName?: ColorSeason
  hasneutroValue?: boolean
}

export function detectSeason(
  temperatura: 'frio' | 'quente' | 'neutro' | null,
  intensidade: 'suave' | 'brilhante' | 'neutro' | null,
  profundidade: 'escuro' | 'claro' | 'neutro' | null
): SeasonResult {
  // Check if all selections are made (allow neutro)
  if (!temperatura || !intensidade || !profundidade) {
    return { valid: false }
  }

  // Check if any value is 'neutro' - cannot form valid season
  if (temperatura === 'neutro' || intensidade === 'neutro' || profundidade === 'neutro') {
    const suggestions = generateSuggestionsWithneutro(temperatura, intensidade, profundidade)
    return {
      valid: false,
      suggestions,
      hasneutroValue: true,
    }
  }

  // Valid combinations mapping (using the actual Portuguese forms from the UI)
  const validCombinations: Record<string, { season: Season; variant: SeasonVariant }> = {
    'quente-brilhante-claro': { season: 'Primavera', variant: 'Brilhante' },
    'quente-suave-escuro': { season: 'Outono', variant: 'Quente' },
    'frio-suave-claro': { season: 'Verão', variant: 'Frio' },
    'frio-brilhante-escuro': { season: 'Inverno', variant: 'Frio' },
  }

  const key = `${temperatura}-${intensidade}-${profundidade}`
  const match = validCombinations[key]

  if (match) {
    const fullName = getColorSeason(match.season, match.variant)
    return {
      valid: true,
      season: match.season,
      variant: match.variant,
      fullName,
    }
  }

  // Invalid combination - generate suggestions
  const suggestions = generateSuggestions(temperatura, intensidade, profundidade)

  return {
    valid: false,
    suggestions,
  }
}

/**
 * Generate suggestions when one or more values are 'neutro'
 */
function generateSuggestionsWithneutro(
  temperatura: string,
  intensidade: string,
  profundidade: string
): string[] {
  const suggestions: string[] = []
  const neutroFields: string[] = []
  const nonneutroFields: { label: string; value: string; type: string }[] = []

  // Identify which fields are neutro
  if (temperatura === 'neutro') {
    neutroFields.push('Temperatura')
  } else {
    nonneutroFields.push({ label: temperatura, value: temperatura, type: 'Temperatura' })
  }

  if (intensidade === 'neutro') {
    neutroFields.push('Intensidade')
  } else {
    nonneutroFields.push({ label: intensidade, value: intensidade, type: 'Intensidade' })
  }

  if (profundidade === 'neutro') {
    neutroFields.push('Profundidade')
  } else {
    nonneutroFields.push({ label: profundidade, value: profundidade, type: 'Profundidade' })
  }

  // Explain the current state
  suggestions.push('**Parâmetros Atuais:**')
  suggestions.push(
    `Temperatura: **${temperatura === 'neutro' ? 'neutro (canceladas)' : temperatura}**`
  )
  suggestions.push(
    `Intensidade: **${intensidade === 'neutro' ? 'neutro (canceladas)' : intensidade}**`
  )
  suggestions.push(
    `Profundidade: **${profundidade === 'neutro' ? 'neutro (canceladas)' : profundidade}**`
  )
  suggestions.push('')

  // Generate suggestions
  if (neutroFields.length === 1) {
    const neutroField = neutroFields[0]
    suggestions.push(`❌ **${neutroField}** está neutra (suas seleções se cancelam)`)
    suggestions.push('')
    suggestions.push(
      `Para corrigir, você precisa mudar **${neutroField}** para um dos lados:`
    )

    if (neutroField === 'Temperatura') {
      suggestions.push('  • Selecione mais máscaras **Quentes** para obter Quente')
      suggestions.push('  • Ou selecione mais máscaras **Frios** para obter Frio')
    } else if (neutroField === 'Intensidade') {
      suggestions.push('  • Selecione mais máscaras **Brilhantes** para obter Brilhante')
      suggestions.push('  • Ou selecione mais máscaras **Suaves** para obter Suave')
    } else {
      suggestions.push('  • Selecione mais máscaras **Claras** para obter Claro')
      suggestions.push('  • Ou selecione mais máscaras **Escuras** para obter Escuro')
    }
  } else if (neutroFields.length > 1) {
    suggestions.push(
      `❌ Múltiplos parâmetros estão neutros: **${neutroFields.join(', ')}**`
    )
    suggestions.push('')
    suggestions.push(
      `Para corrigir, ajuste as seguintes categorias para um dos lados:`
    )

    if (neutroFields.includes('Temperatura')) {
      suggestions.push('  • **Temperatura**: selecione mais Quentes ou Frios')
    }
    if (neutroFields.includes('Intensidade')) {
      suggestions.push('  • **Intensidade**: selecione mais Brilhantes ou Suaves')
    }
    if (neutroFields.includes('Profundidade')) {
      suggestions.push('  • **Profundidade**: selecione mais Claras ou Escuras')
    }
  }

  return suggestions
}

function generateSuggestions(
  temperatura: string,
  intensidade: string,
  profundidade: string
): string[] {
  // Valid combinations and their requirements (using actual Portuguese forms: frio, not frio)
  const validCombinations = [
    { season: 'Primavera', temp: 'quente', tempLabel: 'Quente', intens: 'brilhante', intensLabel: 'Brilhante', prof: 'claro', profLabel: 'Claro' },
    { season: 'Outono', temp: 'quente', tempLabel: 'Quente', intens: 'suave', intensLabel: 'Suave', prof: 'escuro', profLabel: 'Escuro' },
    { season: 'Verão', temp: 'frio', tempLabel: 'Frio', intens: 'suave', intensLabel: 'Suave', prof: 'claro', profLabel: 'Claro' },
    { season: 'Inverno', temp: 'frio', tempLabel: 'Frio', intens: 'brilhante', intensLabel: 'Brilhante', prof: 'escuro', profLabel: 'Escuro' },
  ]

  // Calculate how many changes needed for each season
  const seasonChanges = validCombinations.map((combo) => {
    const changes: { label: string; value: string }[] = []
    let changeCount = 0

    if (temperatura !== combo.temp) {
      changes.push({ label: 'Temperatura', value: combo.tempLabel })
      changeCount++
    }
    if (intensidade !== combo.intens) {
      changes.push({ label: 'Intensidade', value: combo.intensLabel })
      changeCount++
    }
    if (profundidade !== combo.prof) {
      changes.push({ label: 'Profundidade', value: combo.profLabel })
      changeCount++
    }

    return {
      season: combo.season,
      changeCount,
      changes,
    }
  })

  // Sort by fewest changes needed
  seasonChanges.sort((a, b) => a.changeCount - b.changeCount)

  // Generate suggestions for the easiest options
  const suggestions: string[] = []
  const minChanges = seasonChanges[0].changeCount

  // Show all seasons that require the same minimum number of changes
  seasonChanges
    .filter((s) => s.changeCount === minChanges)
    .forEach((option) => {
      if (option.changeCount === 0) {
        suggestions.push(`✓ **${option.season}** - Seleção válida!`)
      } else if (option.changeCount === 1) {
        const change = option.changes[0]
        suggestions.push(
          `**${option.season}**: mude **${change.label}** para **${change.value}**`
        )
      } else if (option.changeCount === 2) {
        const [change1, change2] = option.changes
        suggestions.push(
          `**${option.season}**: mude **${change1.label}** para **${change1.value}** e **${change2.label}** para **${change2.value}**`
        )
      } else {
        const changesList = option.changes.map((c) => `**${c.label}** para **${c.value}**`).join(', ')
        suggestions.push(
          `**${option.season}**: mude ${changesList}`
        )
      }
    })

  // If there are more seasons but with more changes, show them as alternatives
  if (seasonChanges.length > minChanges && seasonChanges[minChanges].changeCount > minChanges) {
    suggestions.push('')
    suggestions.push('**Outras opções:**')
    seasonChanges
      .slice(1)
      .filter((s) => s.changeCount > minChanges)
      .slice(0, 2) // Show only 2 alternatives
      .forEach((option) => {
        if (option.changeCount === 1) {
          const change = option.changes[0]
          suggestions.push(
            `**${option.season}**: mude **${change.label}** para **${change.value}**`
          )
        } else if (option.changeCount === 2) {
          const [change1, change2] = option.changes
          suggestions.push(
            `**${option.season}**: mude **${change1.label}** para **${change1.value}** e **${change2.label}** para **${change2.value}**`
          )
        } else {
          const changesList = option.changes.map((c) => `**${c.label}** para **${c.value}**`).join(', ')
          suggestions.push(
            `**${option.season}**: mude ${changesList}`
          )
        }
      })
  }

  return suggestions
}

/**
 * Get season variants for a given season
 */
export function getSeasonVariants(season: Season): SeasonVariant[] {
  return SEASON_VARIANTS[season] || []
}

/**
 * Get colors for a season variant
 */
export function getSeasonColors(season: Season, variant: SeasonVariant): string[] {
  // Import all season colors
  const {
    PRIMAVERA_BRILHANTE_COLORS,
    PRIMAVERA_CLARO_COLORS,
    PRIMAVERA_QUENTE_COLORS,
    OUTONO_QUENTE_COLORS,
    OUTONO_SUAVE_COLORS,
    OUTONO_ESCURO_COLORS,
    VERAO_FRIO_COLORS,
    VERAO_SUAVE_COLORS,
    VERAO_CLARO_COLORS,
    INVERNO_FRIO_COLORS,
    INVERNO_BRILHANTE_COLORS,
    INVERNO_ESCURO_COLORS,
  } = require('../mask-analysis/constants/maskAnalysisColors')

  const colorMap: Record<ColorSeason, string[]> = {
    'Primavera Brilhante': PRIMAVERA_BRILHANTE_COLORS,
    'Primavera Claro': PRIMAVERA_CLARO_COLORS,
    'Primavera Quente': PRIMAVERA_QUENTE_COLORS,
    'Outono Quente': OUTONO_QUENTE_COLORS,
    'Outono Suave': OUTONO_SUAVE_COLORS,
    'Outono Escuro': OUTONO_ESCURO_COLORS,
    'Verão Frio': VERAO_FRIO_COLORS,
    'Verão Suave': VERAO_SUAVE_COLORS,
    'Verão Claro': VERAO_CLARO_COLORS,
    'Inverno Frio': INVERNO_FRIO_COLORS,
    'Inverno Brilhante': INVERNO_BRILHANTE_COLORS,
    'Inverno Escuro': INVERNO_ESCURO_COLORS,
  }

  const fullName = getColorSeason(season, variant)
  return colorMap[fullName] || []
}

/**
 * Get the distance of a value from the center (50)
 * Returns a value between 0-50
 */
function getDistance(value: number | null): number {
  if (value === null) return 0
  return Math.abs(value - 50)
}

/**
 * Detect expected season from slider values (0-100 range)
 * Uses the 2 most extreme characteristics to find a valid season
 * Always returns a valid season when 2 or more characteristics are provided
 */
export function detectSeasonFromSliders(
  temperatura: number | null,
  intensidade: number | null,
  profundidade: number | null
): { season: Season; variant: SeasonVariant; colorSeason: ColorSeason } | null {
  if (temperatura === null || intensidade === null || profundidade === null) {
    return null
  }

  // Valid season combinations
  const SEASON_COMBINATIONS = [
    { season: 'Primavera', temp: 'quente', intens: 'brilhante', prof: 'claro' },
    { season: 'Outono', temp: 'quente', intens: 'suave', prof: 'escuro' },
    { season: 'Verão', temp: 'frio', intens: 'suave', prof: 'claro' },
    { season: 'Inverno', temp: 'frio', intens: 'brilhante', prof: 'escuro' },
  ]

  // Calculate distances from center (50) for each attribute
  const distances = [
    { attr: 'temperatura', value: temperatura, distance: getDistance(temperatura) },
    { attr: 'intensidade', value: intensidade, distance: getDistance(intensidade) },
    { attr: 'profundidade', value: profundidade, distance: getDistance(profundidade) },
  ]

  // Sort by distance descending to find the 2 most extreme
  const sorted = [...distances].sort((a, b) => b.distance - a.distance)
  const [mostExtreme, secondMostExtreme] = sorted

  // Build a map to find matching season combinations
  const attributeMap: { [key: string]: { left: string; right: string } } = {
    temperatura: { left: 'frio', right: 'quente' },
    intensidade: { left: 'suave', right: 'brilhante' },
    profundidade: { left: 'escuro', right: 'claro' },
  }

  // Get the values for the 2 most extreme attributes
  const mostExtremeAttr = mostExtreme.attr
  const secondMostExtremeAttr = secondMostExtreme.attr
  const thirdAttr = distances.find(d => d.attr !== mostExtremeAttr && d.attr !== secondMostExtremeAttr)?.attr

  const mostExtremeValue = mostExtreme.value > 50
  const secondMostExtremeValue = secondMostExtreme.value > 50

  const mostExtremeVal = mostExtremeValue ? attributeMap[mostExtremeAttr].right : attributeMap[mostExtremeAttr].left
  const secondMostExtremeVal = secondMostExtremeValue ? attributeMap[secondMostExtremeAttr].right : attributeMap[secondMostExtremeAttr].left
  const thirdVal = thirdAttr ? (distances.find(d => d.attr === thirdAttr)!.value > 50 ? attributeMap[thirdAttr].right : attributeMap[thirdAttr].left) : null

  // Build combinations to search for
  const searchCombinations = [
    // First try: use the 2 most extreme + the calculated third
    {
      [mostExtremeAttr]: mostExtremeVal,
      [secondMostExtremeAttr]: secondMostExtremeVal,
      [thirdAttr!]: thirdVal,
    },
  ]

  // If first doesn't match, try other combinations of the third attribute
  if (thirdAttr) {
    const otherThirdVal = attributeMap[thirdAttr][thirdVal === attributeMap[thirdAttr].left ? 'right' : 'left']
    searchCombinations.push({
      [mostExtremeAttr]: mostExtremeVal,
      [secondMostExtremeAttr]: secondMostExtremeVal,
      [thirdAttr]: otherThirdVal,
    })
  }

  // Search for a matching season
  for (const searchCombo of searchCombinations) {
    const match = SEASON_COMBINATIONS.find(season => {
      let matches = true
      for (const [key, val] of Object.entries(searchCombo)) {
        if (key === 'temperatura' && season.temp !== val) matches = false
        if (key === 'intensidade' && season.intens !== val) matches = false
        if (key === 'profundidade' && season.prof !== val) matches = false
      }
      return matches
    })

    if (match) {
      // Use the most extreme attribute as the variant
      let variant: SeasonVariant
      if (mostExtremeAttr === 'temperatura') {
        variant = temperatura > 50 ? 'Quente' : 'Frio'
      } else if (mostExtremeAttr === 'intensidade') {
        variant = intensidade > 50 ? 'Brilhante' : 'Suave'
      } else {
        variant = profundidade > 50 ? 'Claro' : 'Escuro'
      }

      try {
        const season = match.season as Season
        const colorSeason = getColorSeason(season, variant)
        return {
          season,
          variant,
          colorSeason,
        }
      } catch {
        continue
      }
    }
  }

  return null
}

/**
 * Check if a range is considered "extreme"
 * Extreme ranges: 0-12.5 and 87.5-100
 */
function isExtremeRange(range: string): boolean {
  return range === '0-12.5' || range === '87.5-100'
}

/**
 * Normalize values when both are in extreme ranges
 * Only one parameter can be extreme at a time in valid combinations
 * If both are extreme, adjust the less extreme one to a non-extreme range
 */
function normalizeExtremeValues(
  temperatura: number,
  profundidade: number
): { temperatura: number; profundidade: number } {
  // Helper function to determine range category
  const getRange = (value: number): string => {
    if (value < 12.5) return '0-12.5'
    if (value < 50) return '12.5-50'
    if (value < 87.5) return '50-87.5'
    return '87.5-100'
  }

  const tempRange = getRange(temperatura)
  const profRange = getRange(profundidade)

  // Check if both are extreme
  if (!isExtremeRange(tempRange) || !isExtremeRange(profRange)) {
    // At least one is not extreme, no normalization needed
    return { temperatura, profundidade }
  }

  // Both are extreme, find which is MORE extreme (farther from 50)
  const tempDistance = Math.abs(temperatura - 50)
  const profDistance = Math.abs(profundidade - 50)

  // Normalize the less extreme one to a non-extreme range
  if (tempDistance <= profDistance) {
    // Temperatura is less extreme (or equally extreme), normalize it
    if (temperatura > 50) {
      // In 87.5-100 range, move to 50-87.5 range (pick 75 - middle of non-extreme range)
      return { temperatura: 75, profundidade }
    } else {
      // In 0-12.5 range, move to 12.5-50 range (pick 25 - middle of non-extreme range)
      return { temperatura: 25, profundidade }
    }
  } else {
    // Profundidade is less extreme, normalize it
    if (profundidade > 50) {
      // In 87.5-100 range, move to 50-87.5 range (pick 75)
      return { temperatura, profundidade: 75 }
    } else {
      // In 0-12.5 range, move to 12.5-50 range (pick 25)
      return { temperatura, profundidade: 25 }
    }
  }
}

/**
 * Detect season from only temperatura and profundidade (2-rule/Regra dos 2)
 * Uses a mapping table based on the ranges of these two attributes
 */
export function detectSeasonFromSlidersTwoRule(
  temperatura: number | null,
  profundidade: number | null
): { season: Season; variant: SeasonVariant; colorSeason: ColorSeason } | null {
  if (temperatura === null || profundidade === null) {
    return null
  }

  // Normalize if both values are in extreme ranges
  const normalized = normalizeExtremeValues(temperatura, profundidade)
  const normalizedTemp = normalized.temperatura
  const normalizedProf = normalized.profundidade

  // Helper function to determine range category
  const getRange = (value: number): string => {
    if (value < 12.5) return '0-12.5'
    if (value < 50) return '12.5-50'
    if (value < 87.5) return '50-87.5'
    return '87.5-100'
  }

  const tempRange = getRange(normalizedTemp)
  const profRange = getRange(normalizedProf)

  // Mapping table from temperatura and profundidade ranges to seasons
  const rangeMap: Record<string, { season: Season; variant: SeasonVariant }> = {
    // Temperatura 50–87.5
    '50-87.5|50-87.5': { season: 'Primavera', variant: 'Brilhante' },
    '50-87.5|0-12.5': { season: 'Outono', variant: 'Escuro' },
    '50-87.5|12.5-50': { season: 'Outono', variant: 'Suave' },
    '50-87.5|87.5-100': { season: 'Primavera', variant: 'Claro' },

    // Temperatura 12.5–50
    '12.5-50|12.5-50': { season: 'Inverno', variant: 'Brilhante' },
    '12.5-50|87.5-100': { season: 'Verão', variant: 'Claro' },
    '12.5-50|50-87.5': { season: 'Verão', variant: 'Suave' },
    '12.5-50|0-12.5': { season: 'Inverno', variant: 'Escuro' },

    // Temperatura 87.5–100
    '87.5-100|50-87.5': { season: 'Primavera', variant: 'Quente' },
    '87.5-100|12.5-50': { season: 'Outono', variant: 'Quente' },

    // Temperatura 0–12.5
    '0-12.5|50-87.5': { season: 'Verão', variant: 'Frio' },
    '0-12.5|12.5-50': { season: 'Inverno', variant: 'Frio' },
  }

  const key = `${tempRange}|${profRange}`
  const match = rangeMap[key]

  if (match) {
    try {
      const season = match.season as Season
      const colorSeason = getColorSeason(season, match.variant)
      return {
        season,
        variant: match.variant,
        colorSeason,
      }
    } catch {
      return null
    }
  }

  return null
}
