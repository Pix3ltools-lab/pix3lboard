/**
 * useStorageAdapter Hook
 * Manages storage adapter instance based on current mode
 */

import { useState, useEffect, useMemo } from 'react'
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

  // Initialize mode from localStorage
  useEffect(() => {
    const currentMode = getStorageMode()
    setMode(currentMode)
    setIsReady(true)
  }, [])

  // Create adapter instance (memoized)
  const adapter = useMemo(() => {
    if (!isReady) return null
    return createStorageAdapter(mode)
  }, [mode, isReady])

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
