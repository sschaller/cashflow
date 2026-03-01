import { useEffect, useRef, type ReactNode } from 'react'
import { useSyncStore } from '@/stores/useSyncStore.ts'
import { onDatabaseChange } from '@/db/index.ts'

interface SyncProviderProps {
  children: ReactNode
}

export function SyncProvider({ children }: SyncProviderProps) {
  const isSyncEnabled = useSyncStore((s) => s.isSyncEnabled)
  const isAuthenticated = useSyncStore((s) => s.isAuthenticated)
  const cryptoKey = useSyncStore((s) => s.cryptoKey)
  const autoSyncInterval = useSyncStore((s) => s.autoSyncInterval)
  const syncNow = useSyncStore((s) => s.syncNow)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Periodic sync (fallback for remote-only changes)
  useEffect(() => {
    if (isSyncEnabled && isAuthenticated && cryptoKey) {
      // Sync immediately when ready
      syncNow()

      // Periodic sync as fallback
      intervalRef.current = setInterval(syncNow, autoSyncInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isSyncEnabled, isAuthenticated, cryptoKey, autoSyncInterval, syncNow])

  // Change-triggered sync (debounced)
  useEffect(() => {
    if (!isSyncEnabled || !isAuthenticated || !cryptoKey) return

    const unsubscribe = onDatabaseChange(() => {
      // Clear any pending debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      // Debounce: sync 3 seconds after last local mutation
      debounceRef.current = setTimeout(() => {
        syncNow()
      }, 3000)
    })

    return () => {
      unsubscribe()
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [isSyncEnabled, isAuthenticated, cryptoKey, syncNow])

  return <>{children}</>
}
