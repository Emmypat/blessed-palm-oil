import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { salesApi } from '../services/api'
import { getPendingSales, removePendingSale, markSaleFailed } from '../utils/offlineQueue'

const SyncContext = createContext(null)

export function SyncProvider({ children }) {
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedCount, setLastSyncedCount] = useState(0)
  const syncingRef = useRef(false)

  const refreshCount = useCallback(async () => {
    const sales = await getPendingSales()
    setPendingCount(sales.filter(s => s.status !== 'failed').length)
  }, [])

  const syncAll = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return
    const pending = await getPendingSales()
    const toSync = pending.filter(s => s.status !== 'failed')
    if (toSync.length === 0) return

    syncingRef.current = true
    setIsSyncing(true)
    let synced = 0

    for (const entry of toSync) {
      try {
        await salesApi.create(entry.data)
        await removePendingSale(entry.id)
        synced++
      } catch (err) {
        const msg = err.message || 'Sync failed'
        // Don't mark as permanently failed for network errors — retry next time
        if (!msg.toLowerCase().includes('network') && !msg.toLowerCase().includes('fetch')) {
          await markSaleFailed(entry.id, msg)
        }
      }
    }

    syncingRef.current = false
    setIsSyncing(false)
    if (synced > 0) setLastSyncedCount(synced)
    await refreshCount()
  }, [refreshCount])

  // Refresh count on mount and sync when coming online
  useEffect(() => {
    refreshCount()
    const handleOnline = () => syncAll()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [refreshCount, syncAll])

  // Auto-sync if already online on mount
  useEffect(() => {
    if (navigator.onLine) syncAll()
  }, [syncAll])

  return (
    <SyncContext.Provider value={{ pendingCount, isSyncing, lastSyncedCount, syncAll, refreshCount }}>
      {children}
    </SyncContext.Provider>
  )
}

export function useSync() {
  return useContext(SyncContext)
}
