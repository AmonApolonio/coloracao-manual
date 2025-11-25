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

export interface SVGVector {
  svg_path: string; // SVG path string (e.g., "M10,10 L20,20 L30,30")
  stroke_width: number; // Line thickness in pixels
  hex_color: string; // Extracted color hex value (#RRGGBB)
}

export type SVGVectorData = Partial<Record<ColorField, SVGVector>>;

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
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithAnalysis extends User {
  analysis?: Analysis | null;
}
