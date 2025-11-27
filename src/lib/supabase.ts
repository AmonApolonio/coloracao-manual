import { createClient } from '@supabase/supabase-js'
import { User, Analysis, AnalysisStatus } from './types'
import { PigmentAnalysisDataDB, MaskAnalysisDataDB, ColorSeason } from './types-db'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ========== CLIENT-SIDE UTILITY FUNCTIONS ==========

/**
 * Fetch all users and analyses, organize by status
 */
export async function loadAllUsersAndAnalyses() {
  // Fetch all users
  const { data: allUsers, error: errorAll } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (errorAll) throw errorAll

  // Fetch all analyses
  const { data: analyses, error: errorAnalyses } = await supabase
    .from('analyses')
    .select('*')
    .order('created_at', { ascending: false })

  if (errorAnalyses) throw errorAnalyses

  return { allUsers, analyses }
}

/**
 * Get or create analysis for a user
 * Priority: existing in_process -> not_started -> create new
 */
export async function getOrCreateAnalysisForUser(userId: string): Promise<string> {
  // Check if user has any in-progress analysis
  const { data: existingAnalyses, error: checkError } = await supabase
    .from('analyses')
    .select('id, status')
    .eq('user_id', userId)
    .eq('status', 'in_process')
    .order('created_at', { ascending: false })
    .limit(1)

  if (checkError) throw checkError

  if (existingAnalyses && existingAnalyses.length > 0) {
    return existingAnalyses[0].id
  }

  // Check if there's a not_started analysis
  const { data: notStartedAnalyses, error: notStartedError } = await supabase
    .from('analyses')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'not_started')
    .order('created_at', { ascending: false })
    .limit(1)

  if (notStartedError) throw notStartedError

  if (notStartedAnalyses && notStartedAnalyses.length > 0) {
    return notStartedAnalyses[0].id
  }

  // Create new analysis
  const { data: newAnalysis, error: insertError } = await supabase
    .from('analyses')
    .insert({
      user_id: userId,
      status: 'not_started',
      current_step: 1,
      extracao: {},
    })
    .select('id')
    .single()

  if (insertError) throw insertError
  if (!newAnalysis) throw new Error('Failed to create analysis')

  return newAnalysis.id
}

/**
 * Create a new analysis for a user
 */
export async function createNewAnalysis(userId: string): Promise<Analysis> {
  const { data: newAnalysis, error: insertError } = await supabase
    .from('analyses')
    .insert({
      user_id: userId,
      status: 'not_started',
      current_step: 1,
      extracao: {},
    })
    .select('*')
    .single()

  if (insertError) throw insertError
  if (!newAnalysis) throw new Error('Failed to create analysis')

  return newAnalysis
}

// ========== ANALYSIS DATA FETCH FUNCTIONS ==========

/**
 * Fetch a single analysis by ID
 */
export async function fetchAnalysisById(analysisId: string): Promise<Analysis | null> {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Fetch a user by ID
 */
export async function fetchUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

// ========== ANALYSIS UPDATE FUNCTIONS ==========

/**
 * Update analysis with color extraction data
 */
export async function updateAnalysisColorExtraction(
  analysisId: string,
  svgVectorData: any,
  currentStep: number
): Promise<void> {
  const updatePayload: any = {
    current_step: currentStep + 1,
    status: 'in_process' as AnalysisStatus,
    updated_at: new Date().toISOString(),
    extracao: svgVectorData,
  }

  const { error } = await supabase
    .from('analyses')
    .update(updatePayload)
    .eq('id', analysisId)

  if (error) throw error
}

/**
 * Update analysis with mask analysis data
 */
export async function updateAnalysisMaskData(
  analysisId: string,
  maskAnalysisData: MaskAnalysisDataDB,
  currentStep: number
): Promise<void> {
  const updatePayload: any = {
    current_step: currentStep + 1,
    status: 'in_process' as AnalysisStatus,
    updated_at: new Date().toISOString(),
    analise_mascaras: maskAnalysisData,
  }

  const { error } = await supabase
    .from('analyses')
    .update(updatePayload)
    .eq('id', analysisId)

  if (error) throw error
}

/**
 * Update analysis with pigment analysis data
 */
export async function updateAnalysisPigmentData(
  analysisId: string,
  pigmentAnalysisData: PigmentAnalysisDataDB,
  currentStep: number
): Promise<void> {
  const updatePayload: any = {
    current_step: currentStep + 1,
    status: 'in_process' as AnalysisStatus,
    updated_at: new Date().toISOString(),
    analise_pigmentos: pigmentAnalysisData,
  }

  const { error } = await supabase
    .from('analyses')
    .update(updatePayload)
    .eq('id', analysisId)

  if (error) throw error
}

/**
 * Update analysis with final color season
 */
export async function updateAnalysisColorSeason(
  analysisId: string,
  colorSeason: ColorSeason
): Promise<void> {
  const updatePayload: any = {
    color_season: colorSeason,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('analyses')
    .update(updatePayload)
    .eq('id', analysisId)

  if (error) throw error
}

/**
 * Save and exit analysis - saves current step data without advancing
 */
export async function saveAnalysisProgress(
  analysisId: string,
  currentStep: number,
  updateData: any
): Promise<void> {
  const updatePayload: any = {
    current_step: currentStep + 1,
    status: 'in_process' as AnalysisStatus,
    updated_at: new Date().toISOString(),
    ...updateData,
  }

  const { error } = await supabase
    .from('analyses')
    .update(updatePayload)
    .eq('id', analysisId)

  if (error) throw error
}

/**
 * Complete analysis
 */
export async function completeAnalysis(
  analysisId: string,
  colorSeason?: ColorSeason | null
): Promise<void> {
  const updatePayload: any = {
    status: 'completed' as AnalysisStatus,
    current_step: 7,
    analyzed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (colorSeason) {
    updatePayload.color_season = colorSeason
  }

  const { error } = await supabase
    .from('analyses')
    .update(updatePayload)
    .eq('id', analysisId)

  if (error) throw error
}
