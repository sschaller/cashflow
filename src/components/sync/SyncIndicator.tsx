import { useSyncStore } from '@/stores/useSyncStore.ts'

export function SyncIndicator() {
  const status = useSyncStore((s) => s.status)
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt)
  const lastError = useSyncStore((s) => s.lastError)
  const isSyncEnabled = useSyncStore((s) => s.isSyncEnabled)
  const syncNow = useSyncStore((s) => s.syncNow)

  if (!isSyncEnabled) return null

  let title = 'Sync'
  let iconPath: string
  let iconClass = 'h-5 w-5'
  let buttonClass = 'rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'

  switch (status) {
    case 'syncing':
      title = 'Syncing...'
      iconPath = 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
      iconClass += ' animate-spin'
      break
    case 'success':
      title = `Synced${lastSyncAt ? ` at ${new Date(lastSyncAt).toLocaleTimeString()}` : ''}`
      iconPath = 'M5 13l4 4L19 7'
      buttonClass = 'rounded-lg p-2 text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700'
      break
    case 'error':
      title = lastError ?? 'Sync error'
      iconPath = 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
      buttonClass = 'rounded-lg p-2 text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700'
      break
    case 'needs-passphrase':
      title = 'Enter passphrase to sync'
      iconPath = 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
      buttonClass = 'rounded-lg p-2 text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-700'
      break
    case 'needs-auth':
      title = 'Sign in to sync'
      iconPath = 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
      buttonClass = 'rounded-lg p-2 text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-700'
      break
    default: // idle
      title = lastSyncAt ? `Last synced ${new Date(lastSyncAt).toLocaleTimeString()}` : 'Sync'
      iconPath = 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z'
      break
  }

  return (
    <button
      onClick={() => syncNow()}
      title={title}
      className={buttonClass}
    >
      <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
      </svg>
    </button>
  )
}
