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

export type AnalysisStatus = 'not_started' | 'in_process' | 'completed';

export type ColorField = 'iris' | 'raiz_cabelo' | 'sobrancelha' | 'testa' | 'bochecha' | 'cavidade_ocular' | 'queixo' | 'contorno_boca' | 'boca';

export interface PolygonShape {
  type: 'add' | 'subtract';
  points: number[];
  hex: string;
}

export interface ColorData {
  points: number[];
  shapes?: PolygonShape[];
}

export type ColorExtractionData = Partial<Record<ColorField, ColorData>>;

export type ColorHexData = Partial<Record<ColorField, string>>;

export type ShapesData = Partial<Record<ColorField, PolygonShape[]>>;

export type StepData = ColorExtractionData & {
  [key: string]: any;
};

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
  step_data: StepData;
  color_hex?: ColorHexData;
  shapes?: ShapesData;
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithAnalysis extends User {
  analysis?: Analysis | null;
}
