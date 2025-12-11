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
