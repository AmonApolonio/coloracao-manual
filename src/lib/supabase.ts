import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { User, Analysis, AnalysisStatus } from './types'
import { PigmentAnalysisDataDB, MaskAnalysisDataDB, ColorSeason } from './types-db'

// Client-side Supabase configuration (fetched from API)
let supabase: SupabaseClient | null = null
let supabasePromise: Promise<SupabaseClient> | null = null

async function getSupabaseClient(): Promise<SupabaseClient> {
  // Return existing client if already created
  if (supabase) return supabase

  // If initialization is in progress, wait for it
  if (supabasePromise) return supabasePromise

  // Start initialization and store the promise to prevent race conditions
  supabasePromise = (async () => {
    try {
      const response = await fetch('/api/config/supabase')
      const config = await response.json()
      supabase = createClient(config.url, config.anonKey)
      return supabase
    } catch (error) {
      // Reset promise on error so it can be retried
      supabasePromise = null
      console.error('Failed to initialize Supabase client:', error)
      throw error
    }
  })()

  return supabasePromise
}

/**
 * Fetch all users and analyses, organize by status
 */
export async function loadAllUsersAndAnalyses(isAdmin: boolean = false) {
  const client = await getSupabaseClient()
  // Fetch all users
  const { data: allUsers, error: errorAll } = await client
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (errorAll) throw errorAll

  // Fetch all analyses from appropriate table
  const tableName = getAnalysisTable(isAdmin)
  const { data: analyses, error: errorAnalyses } = await client
    .from(tableName)
    .select('*')
    .order('created_at', { ascending: false })

  if (errorAnalyses) throw errorAnalyses

  return { allUsers, analyses }
}

/**
 * Get or create analysis for a user
 * Priority: existing in_process -> not_started -> create new
 */
export async function getOrCreateAnalysisForUser(userId: string, isAdmin: boolean = false): Promise<string> {
  const client = await getSupabaseClient()
  const tableName = getAnalysisTable(isAdmin)
  
  // Check if user has any in-progress analysis
  const { data: existingAnalyses, error: checkError } = await client
    .from(tableName)
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
  const { data: notStartedAnalyses, error: notStartedError } = await client
    .from(tableName)
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
  const { data: newAnalysis, error: insertError } = await client
    .from(tableName)
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
export async function createNewAnalysis(userId: string, isAdmin: boolean = false): Promise<Analysis> {
  const client = await getSupabaseClient()
  const tableName = getAnalysisTable(isAdmin)
  const { data: newAnalysis, error: insertError } = await client
    .from(tableName)
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
export async function fetchAnalysisById(analysisId: string, isAdmin: boolean = false): Promise<Analysis | null> {
  const client = await getSupabaseClient()
  const tableName = getAnalysisTable(isAdmin)
  const { data, error } = await client
    .from(tableName)
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
  const client = await getSupabaseClient()
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

// ========== ANALYSIS UPDATE FUNCTIONS ==========

/**
 * Helper function to get the appropriate table name based on admin status
 */
function getAnalysisTable(isAdmin: boolean): string {
  return isAdmin ? 'analyses_admin' : 'analyses'
}

/**
 * Update analysis with color extraction data
 */
export async function updateAnalysisColorExtraction(
  analysisId: string,
  svgVectorData: any,
  currentStep: number,
  isAdmin: boolean = false
): Promise<void> {
  const client = await getSupabaseClient()
  const updatePayload: any = {
    current_step: currentStep + 1,
    status: 'in_process' as AnalysisStatus,
    updated_at: new Date().toISOString(),
    extracao: svgVectorData,
  }

  const tableName = getAnalysisTable(isAdmin)
  const { error } = await client
    .from(tableName)
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
  currentStep: number,
  isAdmin: boolean = false
): Promise<void> {
  const client = await getSupabaseClient()
  const updatePayload: any = {
    current_step: currentStep + 1,
    status: 'in_process' as AnalysisStatus,
    updated_at: new Date().toISOString(),
    analise_mascaras: maskAnalysisData,
  }

  const tableName = getAnalysisTable(isAdmin)
  const { error } = await client
    .from(tableName)
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
  currentStep: number,
  isAdmin: boolean = false
): Promise<void> {
  const client = await getSupabaseClient()
  const updatePayload: any = {
    current_step: currentStep + 1,
    status: 'in_process' as AnalysisStatus,
    updated_at: new Date().toISOString(),
    analise_pigmentos: pigmentAnalysisData,
  }

  const tableName = getAnalysisTable(isAdmin)
  const { error } = await client
    .from(tableName)
    .update(updatePayload)
    .eq('id', analysisId)

  if (error) throw error
}

/**
 * Update analysis with final color season
 */
export async function updateAnalysisColorSeason(
  analysisId: string,
  colorSeason: ColorSeason,
  isAdmin: boolean = false
): Promise<void> {
  const client = await getSupabaseClient()
  const updatePayload: any = {
    color_season: colorSeason,
    updated_at: new Date().toISOString(),
  }

  const tableName = getAnalysisTable(isAdmin)
  const { error } = await client
    .from(tableName)
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
  updateData: any,
  isAdmin: boolean = false
): Promise<void> {
  const client = await getSupabaseClient()
  const updatePayload: any = {
    current_step: currentStep + 1,
    status: 'in_process' as AnalysisStatus,
    updated_at: new Date().toISOString(),
    ...updateData,
  }

  const tableName = getAnalysisTable(isAdmin)
  const { error } = await client
    .from(tableName)
    .update(updatePayload)
    .eq('id', analysisId)

  if (error) throw error
}

/**
 * Complete analysis
 */
export async function completeAnalysis(
  analysisId: string,
  colorSeason?: ColorSeason | null,
  isAdmin: boolean = false
): Promise<void> {
  const client = await getSupabaseClient()
  const updatePayload: any = {
    status: 'completed' as AnalysisStatus,
    current_step: 7,
    analyzed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (colorSeason) {
    updatePayload.color_season = colorSeason
  }

  const tableName = getAnalysisTable(isAdmin)
  const { error } = await client
    .from(tableName)
    .update(updatePayload)
    .eq('id', analysisId)

  if (error) throw error
}
