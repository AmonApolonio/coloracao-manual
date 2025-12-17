/**
 * Database types for data persistence
 * These types represent the minimal data structure saved to the database
 * containing only numeric values and no calculated properties
 */

import { ColorSeason, Season, SeasonVariant } from './types-season'

// ========== CORE TYPES ==========

// Re-export season types for backward compatibility
export type { Season, SeasonVariant, ColorSeason }

export type AnalysisStatus = 'not_started' | 'in_process' | 'completed';

export type ColorField = 'iris' | 'raiz_cabelo' | 'sobrancelha' | 'testa' | 'bochecha' | 'cavidade_ocular' | 'queixo' | 'contorno_boca' | 'boca';

export interface SVGVector {
  svg_path: string; // SVG path string (e.g., "M10,10 L20,20 L30,30")
  stroke_width: number; // Line thickness in pixels
  hex_color: string; // Extracted color hex value (#RRGGBB)
}

export type SVGVectorData = Partial<Record<ColorField, SVGVector>>;

// ========== PIGMENT ANALYSIS DATABASE TYPES ==========

export interface PigmentAnalysisDataDB {
  temperatura?: Partial<Record<ColorField, number>>;
  intensidade?: Partial<Record<ColorField, number>>;
  profundidade?: number;
  geral?: {
    temperatura: number;
    intensidade: number;
    profundidade: number;
  };
  geralAvg?: {
    temperatura: number | null;
    intensidade: number | null;
    profundidade: number | null;
  };
}

// ========== MASK ANALYSIS DATABASE TYPES ==========

/**
 * Individual mask selection
 * Each mask can be selected independently
 */
export interface MaskSelection {
  id: string; // e.g., "temperatura", "temperatura2", "intensidade", etc.
  value: 'frio' | 'quente' | 'suave' | 'brilhante' | 'escuro' | 'claro' | 'ouro' | 'prata';
}

/**
 * Calculated values from all selected masks
 * temperatura, intensidade, profundidade can be 'neutro' if selections cancel out
 */
export type CalculatedMaskValue = 'frio' | 'quente' | 'suave' | 'brilhante' | 'escuro' | 'claro' | 'neutro' | null;

export interface MaskAnalysisDataDB {
  // Individual mask selections - allows multiple selections per category
  selectedMasks: MaskSelection[];
  
  // Calculated values derived from selectedMasks
  // These are computed based on vote counting: which value has more selections
  temperatura: CalculatedMaskValue;
  intensidade: CalculatedMaskValue;
  profundidade: CalculatedMaskValue;
  subtom: 'ouro' | 'prata' | null;
  
  colorSeason?: ColorSeason | null;
  facePosition: {
    x: number;
    y: number;
    scale: number;
  };
}

// ========== CORE DATABASE MODELS ==========

export interface User {
  id: string;
  name: string;
  face_photo_url: string | null;
  eye_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Analysis {
  id: string;
  user_id: string;
  color_season: ColorSeason | null;
  status: AnalysisStatus;
  current_step: number;
  extracao?: SVGVectorData;
  analise_pigmentos?: PigmentAnalysisDataDB;
  analise_mascaras?: MaskAnalysisDataDB;
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithAnalysis extends User {
  analysis?: Analysis | null;
}
