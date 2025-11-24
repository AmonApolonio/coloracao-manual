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
  color_season: ColorSeason;
  notes: string | null;
  analyzed_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserWithAnalysis extends User {
  analysis?: Analysis | null;
}
