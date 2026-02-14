import { useState } from 'react'
import { Modal } from '@/components/ui/Modal.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { useSyncStore } from '@/stores/useSyncStore.ts'

interface PassphraseModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'setup' | 'unlock'
}

export function PassphraseModal({ isOpen, onClose, mode }: PassphraseModalProps) {
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setPassphraseAction = useSyncStore((s) => s.setPassphrase)
  const unlockWithPassphrase = useSyncStore((s) => s.unlockWithPassphrase)

  const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters')
      return
    }

    if (mode === 'setup' && passphrase !== confirm) {
      setError('Passphrases do not match')
      return
    }

    setLoading(true)
    try {
      if (mode === 'unlock') {
        await unlockWithPassphrase(passphrase)
      } else {
        await setPassphraseAction(passphrase)
      }
      setPassphrase('')
      setConfirm('')
      onClose()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'OperationError') {
        setError('Wrong passphrase')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to set passphrase')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'setup' ? 'Set Encryption Passphrase' : 'Enter Passphrase'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {mode === 'setup'
            ? 'Choose a passphrase to encrypt your data. You will need this same passphrase on every device.'
            : 'Enter your passphrase to decrypt synced data.'}
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Passphrase
          </label>
          <input
            type="password"
            className={inputClass}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Enter passphrase..."
            autoFocus
          />
        </div>

        {mode === 'setup' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Confirm Passphrase
            </label>
            <input
              type="password"
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm passphrase..."
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {mode === 'setup' && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            There is no way to recover a forgotten passphrase. Your local data will remain accessible, but remote data cannot be decrypted without it.
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Deriving key...' : mode === 'setup' ? 'Set Passphrase' : 'Unlock'}
        </Button>
      </form>
    </Modal>
  )
}
