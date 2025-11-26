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
}

export function detectSeason(
  temperatura: 'fria' | 'quente' | null,
  intensidade: 'suave' | 'brilhante' | null,
  profundidade: 'escura' | 'clara' | null
): SeasonResult {
  // Check if all selections are made
  if (!temperatura || !intensidade || !profundidade) {
    return { valid: false }
  }

  // Valid combinations mapping (using the actual Portuguese forms from the UI)
  const validCombinations: Record<string, { season: Season; variant: SeasonVariant }> = {
    'quente-brilhante-clara': { season: 'Primavera', variant: 'Brilhante' },
    'quente-suave-escura': { season: 'Outono', variant: 'Quente' },
    'fria-suave-clara': { season: 'Verão', variant: 'Frio' },
    'fria-brilhante-escura': { season: 'Inverno', variant: 'Frio' },
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

function generateSuggestions(
  temperatura: string,
  intensidade: string,
  profundidade: string
): string[] {
  // Valid combinations and their requirements (using actual Portuguese forms: fria, not frio)
  const validCombinations = [
    { season: 'Primavera', temp: 'quente', tempLabel: 'Quente', intens: 'brilhante', intensLabel: 'Brilhante', prof: 'clara', profLabel: 'Clara' },
    { season: 'Outono', temp: 'quente', tempLabel: 'Quente', intens: 'suave', intensLabel: 'Suave', prof: 'escura', profLabel: 'Escura' },
    { season: 'Verão', temp: 'fria', tempLabel: 'Fria', intens: 'suave', intensLabel: 'Suave', prof: 'clara', profLabel: 'Clara' },
    { season: 'Inverno', temp: 'fria', tempLabel: 'Fria', intens: 'brilhante', intensLabel: 'Brilhante', prof: 'escura', profLabel: 'Escura' },
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
    PRIMAVERA_CLARA_COLORS,
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
  } = require('../constants/maskAnalysisColors')

  const colorMap: Record<ColorSeason, string[]> = {
    'Primavera Brilhante': PRIMAVERA_BRILHANTE_COLORS,
    'Primavera Clara': PRIMAVERA_CLARA_COLORS,
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
