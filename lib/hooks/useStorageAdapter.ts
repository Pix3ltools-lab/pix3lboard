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
    const effectiveMode = (mode === 'cloud' && !isAuthenticated) ? 'local' : mode

    return createStorageAdapter(effectiveMode)
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
