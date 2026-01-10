/**
 * Storage Adapter Factory
 * Creates the appropriate storage adapter based on mode
 */

import type { StorageAdapter, StorageMode } from './storage-adapter'
import { LocalStorageAdapter } from './local-storage-adapter'
import { SupabaseAdapter } from './supabase-adapter'

export * from './storage-adapter'
export { LocalStorageAdapter } from './local-storage-adapter'
export { SupabaseAdapter } from './supabase-adapter'

/**
 * Create a storage adapter based on mode
 */
export function createStorageAdapter(mode: StorageMode): StorageAdapter {
  switch (mode) {
    case 'local':
      return new LocalStorageAdapter()
    case 'cloud':
      return new SupabaseAdapter()
    default:
      throw new Error(`Unknown storage mode: ${mode}`)
  }
}

/**
 * Get the current storage mode from localStorage
 * Defaults to 'local' for privacy-first approach
 */
export function getStorageMode(): StorageMode {
  if (typeof window === 'undefined') return 'local'

  try {
    const mode = localStorage.getItem('pix3lboard-storage-mode')
    return (mode === 'cloud' ? 'cloud' : 'local') as StorageMode
  } catch {
    return 'local'
  }
}

/**
 * Set the storage mode in localStorage
 */
export function setStorageMode(mode: StorageMode): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem('pix3lboard-storage-mode', mode)
  } catch (error) {
    console.error('Failed to set storage mode:', error)
  }
}
