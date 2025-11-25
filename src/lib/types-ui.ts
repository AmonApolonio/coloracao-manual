/**
 * UI types for local component state and rendering
 * These types represent the full data structure with calculated properties
 * used only within React components, NOT persisted to database
 */

// ========== PIGMENT ANALYSIS UI TYPES ==========

export interface PigmentTemperatureDataUI {
  [colorField: string]: {
    hexColor: string;
    temperature: number | null;
    temperatureCategory: string;
  };
}

export interface ProfundidadeComparisonUI {
  field?: string; // ComparisonField identifier
  name: string;
  colors1: string[]; // Color fields for first group
  colors2: string[]; // Color fields for second group (skin tones)
  value: number | null;
  category: string;
}

export interface PigmentAnalysisDataUI {
  temperatura?: PigmentTemperatureDataUI;
  intensidade?: PigmentTemperatureDataUI;
  profundidade?: ProfundidadeComparisonUI[] | undefined;
  geral?: {
    temperatura: number | null;
    intensidade: number | null;
    profundidade: number | null;
  };
}
