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
export type ComparisonField = 'iris_vs_pele' | 'cavidade_ocular_vs_pele' | 'cabelo_vs_pele' | 'contorno_boca_vs_boca';

export const COMPARISON_FIELD_NAMES: Record<ComparisonField, string> = {
  'iris_vs_pele': 'Íris vs Tons de Pele',
  'cavidade_ocular_vs_pele': 'Cavidade Ocular vs Tons de Pele',
  'cabelo_vs_pele': 'Tons de Cabelo vs Tons de Pele',
  'contorno_boca_vs_boca': 'Contorno Boca vs Boca',
};

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
  profundidade?: Partial<Record<ComparisonField, number>>;
  geral?: {
    temperatura: number;
    intensidade: number;
    profundidade: number;
  };
}

// ========== MASK ANALYSIS DATABASE TYPES ==========

export interface MaskAnalysisDataDB {
  temperatura: 'fria' | 'quente' | null;
  intensidade: 'suave' | 'brilhante' | null;
  profundidade: 'escuro' | 'claro' | null;
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
