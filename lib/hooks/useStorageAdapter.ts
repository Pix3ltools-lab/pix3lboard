/**
 * useStorageAdapter Hook
 * Manages storage adapter instance based on current mode
 */

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import {
  createStorageAdapter,
  getStorageMode,
  setStorageMode,
  type StorageAdapter,
  type StorageMode
} from '@/lib/storage/adapters'

export function useStorageAdapter() {
  const [mode, setMode] = useState<StorageMode>('local')
  const [isReady, setIsReady] = useState(false)
  const { isAuthenticated, isLoading } = useAuth()

  // Initialize mode from localStorage
  useEffect(() => {
    const currentMode = getStorageMode()
    setMode(currentMode)
    setIsReady(true)
  }, [])

  // Create adapter instance (memoized)
  // If mode is 'cloud' but user is not authenticated, fallback to 'local'
  const adapter = useMemo(() => {
    if (!isReady || isLoading) return null

    // Force local mode if cloud mode is selected but user is not authenticated
    if (mode === 'cloud' && !isAuthenticated) {
      // Clear localStorage to prevent showing cloud data when not authenticated
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pix3lboard-data')
        // Also reset mode to local
        localStorage.setItem('pix3lboard-storage-mode', 'local')
      }
      return createStorageAdapter('local')
    }

    return createStorageAdapter(mode)
  }, [mode, isReady, isAuthenticated, isLoading])

  // Function to switch storage mode
  const switchMode = async (newMode: StorageMode) => {
    setStorageMode(newMode)
    setMode(newMode)
    // Trigger reload or migration
    window.location.reload()
  }

  return {
    adapter,
    mode,
    switchMode,
    isReady,
  }
}
