/**
 * Supabase Client Utilities
 *
 * Usage:
 * - Client Components: import { createClient } from '@/lib/supabase/client'
 * - Server Components: import { createClient } from '@/lib/supabase/server'
 * - Middleware: import { updateSession } from '@/lib/supabase/middleware'
 */

export { createClient as createBrowserClient, getSupabaseBrowserClient } from './client'
export { createClient as createServerClient } from './server'
export { updateSession } from './middleware'
