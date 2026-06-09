import { useState, useEffect } from 'react'

export default function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine)
  const [showBackOnline, setShowBackOnline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      setShowBackOnline(true)
      setTimeout(() => setShowBackOnline(false), 3000)
    }
    const handleOffline = () => {
      setOnline(false)
      setShowBackOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (online && !showBackOnline) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      {!online ? (
        <div className="flex items-center gap-2 bg-yellow-400 text-yellow-900 text-sm font-medium px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-yellow-700 shrink-0" />
          Offline — changes will sync when reconnected
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-green-200 shrink-0" />
          Back online
        </div>
      )}
    </div>
  )
}
