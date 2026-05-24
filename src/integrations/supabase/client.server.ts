import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

function createSupabaseAdminClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Missing server env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.',
    )
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined

// Server-only admin client — bypasses RLS.
// Import as: import { supabaseAdmin } from "@/integrations/supabase/client.server"
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient()
    return Reflect.get(_supabaseAdmin, prop, receiver)
  },
})
