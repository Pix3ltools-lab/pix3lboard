/**
 * Supabase Client for Client Components
 * Use this in React Client Components (with 'use client')
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

// Get env vars with fallback for runtime
const getEnvVar = (key: string): string => {
  // Try process.env first (build-time)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }

  // Fallback: hardcoded for client-side (from .env.local)
  if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
    return 'https://shwpovekjadkrpclknxw.supabase.co';
  }
  if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNod3BvdmVramFka3JwY2xrbnh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzcxMDMsImV4cCI6MjA4MzU1MzEwM30.OJcQ0Wr09yz1OfULYubxWB8VLm3JF54BuvwM0hsVUUw';
  }

  throw new Error(`Environment variable ${key} is not defined`);
};

export function createClient() {
  return createBrowserClient<Database>(
    getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  )
}

// Singleton instance for client-side
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    throw new Error('This function should only be called on the client side')
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
      getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    )
  }

  return browserClient
}
