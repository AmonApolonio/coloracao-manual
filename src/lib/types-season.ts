/**
 * Season type definitions and utilities
 * Centralized types and helpers for color season analysis
 */

// ========== SEASON TYPES ==========

// Base season names
export type Season = 'Primavera' | 'Outono' | 'Verão' | 'Inverno';

// Season variants
export type SeasonVariant = 'Brilhante' | 'Clara' | 'Claro' | 'Quente' | 'Suave' | 'Escuro' | 'Frio';

// Complete season combinations (Season + Variant)
export type ColorSeason =
  | 'Verão Frio'
  | 'Verão Suave'
  | 'Verão Claro'
  | 'Inverno Frio'
  | 'Inverno Brilhante'
  | 'Inverno Escuro'
  | 'Outono Quente'
  | 'Outono Suave'
  | 'Outono Escuro'
  | 'Primavera Brilhante'
  | 'Primavera Clara'
  | 'Primavera Quente';

// ========== SEASON MAPPINGS ==========

/**
 * Maps each season to its valid variants
 */
export const SEASON_VARIANTS: Record<Season, SeasonVariant[]> = {
  Primavera: ['Brilhante', 'Clara', 'Quente'],
  Outono: ['Quente', 'Suave', 'Escuro'],
  Verão: ['Frio', 'Suave', 'Claro'],
  Inverno: ['Frio', 'Brilhante', 'Escuro'],
};

// ========== SEASON UTILITIES ==========

/**
 * Maps a season and variant to the complete ColorSeason string
 */
export function getColorSeason(season: Season, variant: SeasonVariant): ColorSeason {
  const fullName = `${season} ${variant}`;
  const validSeasons: ColorSeason[] = [
    'Primavera Brilhante', 'Primavera Clara', 'Primavera Quente',
    'Outono Quente', 'Outono Suave', 'Outono Escuro',
    'Verão Frio', 'Verão Suave', 'Verão Claro',
    'Inverno Frio', 'Inverno Brilhante', 'Inverno Escuro',
  ];
  
  if (validSeasons.includes(fullName as ColorSeason)) {
    return fullName as ColorSeason;
  }
  
  throw new Error(`Invalid season combination: ${season} ${variant}`);
}

/**
 * Extracts the season name from a complete ColorSeason
 */
export function getSeasonFromColorSeason(colorSeason: ColorSeason): Season {
  const parts = colorSeason.split(' ');
  return parts[0] as Season;
}

/**
 * Extracts the variant from a complete ColorSeason
 */
export function getVariantFromColorSeason(colorSeason: ColorSeason): SeasonVariant {
  const parts = colorSeason.split(' ');
  return parts.slice(1).join(' ') as SeasonVariant;
}
