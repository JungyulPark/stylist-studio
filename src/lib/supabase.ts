import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Supabase publishable key (구 anon key)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not configured. Auth features will be disabled.')
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Type definitions for database tables
export interface Profile {
  id: string
  email: string
  display_name: string | null
  preferred_language: string
  height_cm: number | null
  weight_kg: number | null
  gender: string | null
  created_at: string
  updated_at: string
}

export interface AnalysisHistory {
  id: string
  user_id: string
  analysis_type: 'full' | 'hair'
  report_content: string | null
  style_images: string[] | null
  hair_images: string[] | null
  input_data: Record<string, unknown> | null
  created_at: string
}
