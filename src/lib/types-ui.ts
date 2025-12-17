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

export interface ProfundidadeDataUI {
  value: number | null;
  category: string;
}

export interface PigmentAnalysisDataUI {
  temperatura?: PigmentTemperatureDataUI;
  intensidade?: PigmentTemperatureDataUI;
  profundidade?: ProfundidadeDataUI;
  geral?: {
    temperatura: number | null;
    intensidade: number | null;
    profundidade: number | null;
  };
  geralAvg?: {
    temperatura: number | null;
    intensidade: number | null;
    profundidade: number | null;
  };
}
