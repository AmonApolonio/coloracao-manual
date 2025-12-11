/**
 * Utilities for mask selection aggregation
 * Handles vote counting and final value calculation from multiple mask selections
 */

import { MaskSelection, CalculatedMaskValue } from '@/lib/types-db'

/**
 * Categories and their possible values
 */
export const MASK_CATEGORIES = {
  temperatura: {
    ids: ['temperatura', 'temperatura2'],
    values: ['frio', 'quente'] as const,
  },
  intensidade: {
    ids: ['intensidade', 'intensidade2', 'intensidade3'],
    values: ['suave', 'brilhante'] as const,
  },
  profundidade: {
    ids: ['profundidade', 'profundidade2', 'profundidade3', 'profundidade4'],
    values: ['escuro', 'claro'] as const,
  },
  subtom: {
    ids: ['subtom'],
    values: ['ouro', 'prata'] as const,
  },
}

export type MaskCategory = keyof typeof MASK_CATEGORIES

/**
 * Vote count for a specific value
 */
interface VoteCount {
  value: string
  count: number
}

/**
 * Count votes for a specific category
 * Returns vote counts for each possible value in that category
 */
export function countVotesForCategory(
  selectedMasks: MaskSelection[],
  category: MaskCategory
): VoteCount[] {
  const categoryConfig = MASK_CATEGORIES[category]
  const votes: Record<string, number> = {}

  // Initialize vote counts
  categoryConfig.values.forEach((value) => {
    votes[value] = 0
  })

  // Count votes from selected masks
  selectedMasks.forEach((mask) => {
    if (categoryConfig.ids.includes(mask.id)) {
      if (mask.value in votes) {
        votes[mask.value]++
      }
    }
  })

  return Object.entries(votes).map(([value, count]) => ({ value, count }))
}

/**
 * Calculate final value for a category
 * Returns the value with most votes, or 'neutro' if votes are tied
 * Returns null if no votes for this category
 */
export function calculateCategoryValue(
  selectedMasks: MaskSelection[],
  category: MaskCategory
): CalculatedMaskValue {
  const votes = countVotesForCategory(selectedMasks, category)
  const nonZeroVotes = votes.filter((v) => v.count > 0)

  // No selections for this category
  if (nonZeroVotes.length === 0) {
    return null
  }

  // Only one value type selected
  if (nonZeroVotes.length === 1) {
    return nonZeroVotes[0].value as CalculatedMaskValue
  }

  // Multiple value types selected - check if tied (neutro)
  const maxVotes = Math.max(...nonZeroVotes.map((v) => v.count))
  const tiedValues = nonZeroVotes.filter((v) => v.count === maxVotes)

  if (tiedValues.length > 1) {
    // Votes are tied (e.g., 2 quente + 2 frio = neutro)
    return 'neutro'
  }

  // One value has more votes
  return tiedValues[0].value as CalculatedMaskValue
}

/**
 * Get detailed explanation of current mask selections
 * Used for displaying to user why a value is 'neutro' or what's the calculation
 */
export function getMaskSelectionExplanation(
  selectedMasks: MaskSelection[],
  category: MaskCategory
): {
  value: CalculatedMaskValue
  votes: { [key: string]: number }
  isneutro: boolean
  explanation: string
} {
  const votes = countVotesForCategory(selectedMasks, category)
  const votesMap: { [key: string]: number } = {}

  votes.forEach((v) => {
    votesMap[v.value] = v.count
  })

  const finalValue = calculateCategoryValue(selectedMasks, category)
  const isneutro = finalValue === 'neutro'

  let explanation = ''
  if (isneutro) {
    const votesList = votes.filter((v) => v.count > 0)
    const voteStrings = votesList.map((v) => `${v.count} ${v.value}`)
    explanation = `As seleções se cancelam: ${voteStrings.join(' + ')} = neutro`
  } else if (finalValue === null) {
    explanation = 'Nenhuma seleção foi feita para esta categoria'
  } else {
    const votesList = votes.filter((v) => v.count > 0)
    if (votesList.length > 1) {
      const voteStrings = votesList.map((v) => `${v.count} ${v.value}`)
      explanation = `${finalValue} vence com: ${voteStrings.join(' + ')}`
    } else {
      const voteCount = votes.find((v) => v.value === finalValue)?.count || 0
      explanation = `${voteCount}x ${finalValue}`
    }
  }

  return {
    value: finalValue,
    votes: votesMap,
    isneutro,
    explanation,
  }
}

/**
 * Toggle a mask selection
 * If exact selection (same id AND value) already exists, removes it
 * Otherwise adds the selection (allows both sides of same row)
 */
export function toggleMaskSelection(
  selectedMasks: MaskSelection[],
  maskId: string,
  maskValue: string
): MaskSelection[] {
  const existingIndex = selectedMasks.findIndex((m) => m.id === maskId && m.value === maskValue)

  if (existingIndex >= 0) {
    // Remove if exact selection already exists
    return selectedMasks.filter((_, idx) => idx !== existingIndex)
  } else {
    // Add new selection (allows both left and right from same row)
    return [...selectedMasks, { id: maskId, value: maskValue as any }]
  }
}

/**
 * Check if a mask is currently selected
 */
export function isMaskSelected(
  selectedMasks: MaskSelection[],
  maskId: string,
  maskValue?: string
): boolean {
  if (maskValue === undefined) {
    // Check if any mask with this ID is selected
    return selectedMasks.some((m) => m.id === maskId)
  }
  // Check if specific id + value combination is selected
  return selectedMasks.some((m) => m.id === maskId && m.value === maskValue)
}
