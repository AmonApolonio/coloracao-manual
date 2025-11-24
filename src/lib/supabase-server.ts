import { createClient } from '@supabase/supabase-js'
import { User, Analysis, UserWithAnalysis } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase server environment variables')
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey)

/**
 * Fetch all users that don't have any analysis yet
 */
export async function getUsersWithoutAnalysis(): Promise<User[]> {
  const { data, error } = await supabaseServer
    .from('users')
    .select(
      `
      id,
      name,
      face_photo_url,
      eye_photo_url,
      created_at,
      updated_at
    `
    )
    .eq('analyses.count', 0);

  if (error) {
    console.error('Error fetching users without analysis:', error)
    throw error
  }

  return data || []
}

/**
 * Fetch all users that have at least one analysis
 */
export async function getUsersWithAnalysis(): Promise<UserWithAnalysis[]> {
  const { data, error } = await supabaseServer
    .from('users')
    .select(
      `
      id,
      name,
      face_photo_url,
      eye_photo_url,
      created_at,
      updated_at,
      analyses (
        id,
        user_id,
        color_season,
        notes,
        analyzed_at,
        created_at,
        updated_at
      )
    `
    )
    .not('analyses', 'is', null)

  if (error) {
    console.error('Error fetching users with analysis:', error)
    throw error
  }

  return (data || []).map(user => ({
    ...user,
    analysis: user.analyses?.[0] || null
  }))
}

/**
 * Fetch all users (with or without analysis)
 */
export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabaseServer
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all users:', error)
    throw error
  }

  return data || []
}

/**
 * Create or update an analysis for a user
 */
export async function createOrUpdateAnalysis(
  userId: string,
  colorSeason: string,
  notes?: string
): Promise<Analysis> {
  const { data, error } = await supabaseServer
    .from('analyses')
    .upsert(
      {
        user_id: userId,
        color_season: colorSeason,
        notes: notes || null,
        analyzed_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error creating/updating analysis:', error)
    throw error
  }

  return data
}
