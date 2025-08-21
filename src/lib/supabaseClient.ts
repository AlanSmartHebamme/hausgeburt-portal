// lib/supabaseClient.ts  (Client)
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[supabaseClient] Missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY')
}

// Singleton im Browser
let _client: SupabaseClient | null = null

export const supabase: SupabaseClient =
  _client ??
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: { 'x-client-info': 'hebammen-portal-web' },
    },
  })
