import { useState } from 'react'
import { Button } from '@/components/ui/Button.tsx'
import { PassphraseModal } from '@/components/sync/PassphraseModal.tsx'
import { useSyncStore } from '@/stores/useSyncStore.ts'
import { GoogleDriveClient } from '@/services/googleDrive.ts'
import toast from 'react-hot-toast'

export function SyncSettings() {
  const isSyncEnabled = useSyncStore((s) => s.isSyncEnabled)
  const isAuthenticated = useSyncStore((s) => s.isAuthenticated)
  const cryptoKey = useSyncStore((s) => s.cryptoKey)
  const status = useSyncStore((s) => s.status)
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt)
  const lastError = useSyncStore((s) => s.lastError)
  const signIn = useSyncStore((s) => s.signIn)
  const signOut = useSyncStore((s) => s.signOut)
  const syncNow = useSyncStore((s) => s.syncNow)
  const enableSync = useSyncStore((s) => s.enableSync)
  const disableSync = useSyncStore((s) => s.disableSync)
  const accessToken = useSyncStore((s) => s.accessToken)

  const [showPassphrase, setShowPassphrase] = useState(false)
  const [passphraseMode, setPassphraseMode] = useState<'setup' | 'unlock'>('setup')
  const [loading, setLoading] = useState(false)

  const clientIdConfigured = !!import.meta.env.VITE_GOOGLE_CLIENT_ID

  const handleEnableSync = async () => {
    enableSync()
    setLoading(true)
    try {
      await signIn()
      // Check if remote file exists to determine passphrase mode
      const drive = new GoogleDriveClient(async () => useSyncStore.getState().accessToken!)
      const fileId = await drive.findSyncFile()
      setPassphraseMode(fileId ? 'unlock' : 'setup')
      setShowPassphrase(true)
    } catch {
      toast.error('Failed to sign in with Google')
      disableSync()
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async () => {
    setLoading(true)
    try {
      await signIn()
      const drive = new GoogleDriveClient(async () => useSyncStore.getState().accessToken!)
      const fileId = await drive.findSyncFile()
      setPassphraseMode(fileId ? 'unlock' : 'setup')
      setShowPassphrase(true)
    } catch {
      toast.error('Failed to sign in with Google')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    if (!confirm('Disconnect sync? Your local data will not be deleted.')) return
    signOut()
    disableSync()
    toast.success('Sync disconnected')
  }

  const handlePassphraseClose = () => {
    setShowPassphrase(false)
    // If user cancels without entering passphrase and nothing was set up, disable
    if (!cryptoKey && !isAuthenticated) {
      disableSync()
    }
  }

  const isFullyConfigured = isSyncEnabled && isAuthenticated && cryptoKey

  return (
    <div>
      <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">Cloud Sync</h3>

      {!clientIdConfigured ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Google Cloud sync requires a <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-700">VITE_GOOGLE_CLIENT_ID</code> environment variable.
          See <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-700">.env.example</code> for details.
        </p>
      ) : !isSyncEnabled ? (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Google Drive Sync</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Encrypt and sync your data across devices via Google Drive
            </p>
          </div>
          <Button size="sm" onClick={handleEnableSync} disabled={loading}>
            {loading ? 'Connecting...' : 'Enable'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Status */}
          <div className="rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {isFullyConfigured ? 'Sync Active' : 'Setup Incomplete'}
                </p>
                {lastSyncAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Last synced: {new Date(lastSyncAt).toLocaleString()}
                  </p>
                )}
                {status === 'syncing' && (
                  <p className="text-xs text-blue-500">Syncing...</p>
                )}
              </div>
              <div className="flex gap-2">
                {isFullyConfigured && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => syncNow()}
                    disabled={status === 'syncing'}
                  >
                    Sync Now
                  </Button>
                )}
                <Button variant="danger" size="sm" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            </div>
          </div>

          {/* Action needed states */}
          {isSyncEnabled && !isAuthenticated && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="mb-2 text-sm text-amber-800 dark:text-amber-200">
                Sign in with Google to resume syncing
              </p>
              <Button size="sm" onClick={handleSignIn} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in with Google'}
              </Button>
            </div>
          )}

          {isSyncEnabled && isAuthenticated && !cryptoKey && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="mb-2 text-sm text-amber-800 dark:text-amber-200">
                Enter your passphrase to decrypt synced data
              </p>
              <Button
                size="sm"
                onClick={async () => {
                  const drive = new GoogleDriveClient(async () => accessToken!)
                  const fileId = await drive.findSyncFile()
                  setPassphraseMode(fileId ? 'unlock' : 'setup')
                  setShowPassphrase(true)
                }}
              >
                Enter Passphrase
              </Button>
            </div>
          )}

          {/* Error display */}
          {lastError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-300">{lastError}</p>
            </div>
          )}
        </div>
      )}

      <PassphraseModal
        isOpen={showPassphrase}
        onClose={handlePassphraseClose}
        mode={passphraseMode}
      />
    </div>
  )
}
