import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Response('Supabase env vars not configured.', { status: 500 })
    }

    const request = getRequest()
    const authHeader = request?.headers?.get('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      throw new Response('Unauthorized', { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    })

    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      throw new Response('Unauthorized: invalid token', { status: 401 })
    }

    return next({ context: { supabase, userId: data.user.id, user: data.user } })
  },
)
