import { create } from 'zustand'
import type { SyncStatus } from '@/types/sync.ts'
import { generateSalt, deriveKey, decryptPayload, type EncryptedPayload } from '@/services/crypto.ts'
import { GoogleDriveClient, DriveApiError } from '@/services/googleDrive.ts'
import { performSync } from '@/services/syncEngine.ts'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata'
const GIS_URL = 'https://accounts.google.com/gsi/client'

let gisLoadPromise: Promise<void> | null = null

function loadGis(): Promise<void> {
  if (typeof google !== 'undefined' && google.accounts?.oauth2) return Promise.resolve()
  if (gisLoadPromise) return gisLoadPromise
  gisLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      gisLoadPromise = null
      reject(new Error('Failed to load Google Identity Services'))
    }
    document.head.appendChild(script)
  })
  return gisLoadPromise
}

interface SyncState {
  // Auth
  isAuthenticated: boolean
  accessToken: string | null
  tokenExpiresAt: number | null

  // Encryption
  cryptoKey: CryptoKey | null
  salt: Uint8Array | null

  // Sync status
  status: SyncStatus
  lastSyncAt: string | null
  lastError: string | null
  syncVersion: number

  // Settings
  isSyncEnabled: boolean
  autoSyncInterval: number

  // Actions
  signIn: () => Promise<void>
  signOut: () => void
  refreshToken: () => Promise<boolean>
  setPassphrase: (passphrase: string, existingSalt?: Uint8Array) => Promise<void>
  unlockWithPassphrase: (passphrase: string) => Promise<void>
  clearKey: () => void
  syncNow: () => Promise<void>
  enableSync: () => void
  disableSync: () => void
  deleteRemoteFile: () => Promise<void>
  setStatus: (status: SyncStatus) => void
  setError: (error: string) => void
  clearError: () => void
}

async function initTokenClient(callback: (response: google.accounts.oauth2.TokenResponse) => void, errorCallback?: (error: { type: string; message: string }) => void) {
  if (!GOOGLE_CLIENT_ID) return null
  await loadGis()
  return google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback,
    error_callback: errorCallback,
  })
}

function saveToken(token: string, expiresAt: number) {
  localStorage.setItem('sync:accessToken', token)
  localStorage.setItem('sync:tokenExpiresAt', String(expiresAt))
}

function clearToken() {
  localStorage.removeItem('sync:accessToken')
  localStorage.removeItem('sync:tokenExpiresAt')
}

function loadToken(): { accessToken: string; tokenExpiresAt: number } | null {
  const token = localStorage.getItem('sync:accessToken')
  const expiresAt = localStorage.getItem('sync:tokenExpiresAt')
  if (token && expiresAt) {
    const exp = parseInt(expiresAt, 10)
    if (Date.now() < exp) return { accessToken: token, tokenExpiresAt: exp }
  }
  clearToken()
  return null
}

// --- CryptoKey persistence via IndexedDB ---
const KEY_DB_NAME = 'sync-keystore'
const KEY_STORE_NAME = 'keys'

function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(KEY_DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(KEY_STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveCryptoKey(key: CryptoKey, salt: Uint8Array): Promise<void> {
  const db = await openKeyDB()
  const tx = db.transaction(KEY_STORE_NAME, 'readwrite')
  const store = tx.objectStore(KEY_STORE_NAME)
  store.put(key, 'cryptoKey')
  store.put(Array.from(salt), 'salt')
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function loadCryptoKey(): Promise<{ cryptoKey: CryptoKey; salt: Uint8Array } | null> {
  try {
    const db = await openKeyDB()
    const tx = db.transaction(KEY_STORE_NAME, 'readonly')
    const store = tx.objectStore(KEY_STORE_NAME)
    const keyReq = store.get('cryptoKey')
    const saltReq = store.get('salt')
    return new Promise((resolve) => {
      tx.oncomplete = () => {
        db.close()
        if (keyReq.result && saltReq.result) {
          resolve({ cryptoKey: keyReq.result, salt: new Uint8Array(saltReq.result) })
        } else {
          resolve(null)
        }
      }
      tx.onerror = () => { db.close(); resolve(null) }
    })
  } catch {
    return null
  }
}

async function clearCryptoKey(): Promise<void> {
  try {
    const db = await openKeyDB()
    const tx = db.transaction(KEY_STORE_NAME, 'readwrite')
    const store = tx.objectStore(KEY_STORE_NAME)
    store.delete('cryptoKey')
    store.delete('salt')
    return new Promise((resolve) => {
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); resolve() }
    })
  } catch { /* ignore */ }
}

const restored = loadToken()

export const useSyncStore = create<SyncState>((set, get) => ({
  isAuthenticated: restored !== null,
  accessToken: restored?.accessToken ?? null,
  tokenExpiresAt: restored?.tokenExpiresAt ?? null,

  cryptoKey: null,
  salt: null,

  status: 'idle',
  lastSyncAt: localStorage.getItem('sync:lastSyncAt'),
  lastError: null,
  syncVersion: parseInt(localStorage.getItem('sync:syncVersion') ?? '0', 10),

  isSyncEnabled: localStorage.getItem('sync:enabled') === 'true',
  autoSyncInterval: 5 * 60 * 1000,

  signIn: () => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const client = await initTokenClient(
          (response) => {
            if (response.error) {
              set({ isAuthenticated: false, lastError: response.error_description ?? response.error })
              reject(new Error(response.error))
              return
            }
            const expiresAt = Date.now() + response.expires_in * 1000
            saveToken(response.access_token, expiresAt)
            set({
              isAuthenticated: true,
              accessToken: response.access_token,
              tokenExpiresAt: expiresAt,
              lastError: null,
            })
            resolve()
          },
          (error) => {
            set({ lastError: error.message })
            reject(new Error(error.message))
          },
        )
        if (!client) {
          reject(new Error('Google Identity Services not available'))
          return
        }
        client.requestAccessToken()
      } catch (err) {
        reject(err)
      }
    })
  },

  signOut: () => {
    const { accessToken } = get()
    if (accessToken && typeof google !== 'undefined') {
      google.accounts.oauth2.revoke(accessToken)
    }
    clearToken()
    clearCryptoKey()
    set({
      isAuthenticated: false,
      accessToken: null,
      tokenExpiresAt: null,
      cryptoKey: null,
      salt: null,
      status: 'idle',
    })
  },

  refreshToken: () => {
    return new Promise<boolean>(async (resolve) => {
      try {
        const client = await initTokenClient(
          (response) => {
            if (response.error) {
              set({ isAuthenticated: false, status: 'needs-auth' })
              resolve(false)
              return
            }
            const expiresAt = Date.now() + response.expires_in * 1000
            saveToken(response.access_token, expiresAt)
            set({
              isAuthenticated: true,
              accessToken: response.access_token,
              tokenExpiresAt: expiresAt,
            })
            resolve(true)
          },
          () => resolve(false),
        )
        if (!client) {
          resolve(false)
          return
        }
        client.requestAccessToken({ prompt: 'none' })
      } catch {
        resolve(false)
      }
    })
  },

  setPassphrase: async (passphrase: string, existingSalt?: Uint8Array) => {
    const salt = existingSalt ?? generateSalt()
    const cryptoKey = await deriveKey(passphrase, salt)
    await saveCryptoKey(cryptoKey, salt)
    set({ cryptoKey, salt })
  },

  unlockWithPassphrase: async (passphrase: string) => {
    const state = get()
    if (!state.accessToken) throw new Error('Not authenticated')

    const drive = new GoogleDriveClient(async () => get().accessToken!)
    const fileId = await drive.findSyncFile()

    if (!fileId) {
      // No remote file — treat as new setup
      const salt = generateSalt()
      const cryptoKey = await deriveKey(passphrase, salt)
      set({ cryptoKey, salt })
      return
    }

    // Download and try to decrypt with provided passphrase
    const encryptedText = await drive.downloadSyncFile(fileId)
    const payload: EncryptedPayload = JSON.parse(encryptedText)

    const { fromBase64 } = await import('@/services/crypto.ts')
    const salt = fromBase64(payload.salt)
    const cryptoKey = await deriveKey(passphrase, salt)

    // This will throw OperationError if passphrase is wrong
    await decryptPayload(payload, cryptoKey)

    await saveCryptoKey(cryptoKey, salt)
    set({ cryptoKey, salt })
  },

  clearKey: () => {
    clearCryptoKey()
    set({ cryptoKey: null, salt: null })
  },

  syncNow: async () => {
    const state = get()
    if (state.status === 'syncing') return
    if (!state.cryptoKey || !state.salt) {
      set({ status: 'needs-passphrase' })
      return
    }
    if (!state.isAuthenticated || !state.accessToken) {
      set({ status: 'needs-auth' })
      return
    }

    // Refresh token if near expiry
    if (state.tokenExpiresAt && Date.now() > state.tokenExpiresAt - 60_000) {
      const refreshed = await state.refreshToken()
      if (!refreshed) {
        set({ status: 'needs-auth' })
        return
      }
    }

    set({ status: 'syncing', lastError: null })

    try {
      const drive = new GoogleDriveClient(async () => get().accessToken!)

      const { newSyncVersion } = await performSync(
        drive,
        state.cryptoKey,
        state.salt,
        state.syncVersion,
      )

      const now = new Date().toISOString()
      localStorage.setItem('sync:lastSyncAt', now)
      localStorage.setItem('sync:syncVersion', String(newSyncVersion))

      set({
        status: 'success',
        lastSyncAt: now,
        syncVersion: newSyncVersion,
        lastError: null,
      })

      setTimeout(() => {
        if (get().status === 'success') set({ status: 'idle' })
      }, 3000)
    } catch (err) {
      // Wrong passphrase (AES-GCM auth tag failure)
      if (err instanceof DOMException && err.name === 'OperationError') {
        set({
          status: 'error',
          lastError: 'Wrong passphrase. The encryption key does not match the remote data.',
        })
        return
      }

      // Token expired
      if (err instanceof DriveApiError && err.status === 401) {
        clearToken()
        set({ isAuthenticated: false, accessToken: null, tokenExpiresAt: null, status: 'needs-auth', lastError: 'Session expired. Please sign in again.' })
        return
      }

      const message = err instanceof Error ? err.message : 'Sync failed'
      set({ status: 'error', lastError: message })
    }
  },

  enableSync: () => {
    localStorage.setItem('sync:enabled', 'true')
    set({ isSyncEnabled: true })
  },

  disableSync: () => {
    localStorage.setItem('sync:enabled', 'false')
    set({ isSyncEnabled: false, status: 'idle' })
  },

  deleteRemoteFile: async () => {
    const state = get()
    if (!state.accessToken) throw new Error('Not authenticated')

    const drive = new GoogleDriveClient(async () => get().accessToken!)
    const fileId = await drive.findSyncFile()
    if (fileId) {
      await drive.deleteSyncFile(fileId)
    }

    localStorage.removeItem('sync:lastSyncAt')
    localStorage.removeItem('sync:syncVersion')
    await clearCryptoKey()
    set({ lastSyncAt: null, syncVersion: 0, cryptoKey: null, salt: null })
  },

  setStatus: (status) => set({ status }),
  setError: (error) => set({ lastError: error, status: 'error' }),
  clearError: () => set({ lastError: null }),
}))

// Restore CryptoKey from IndexedDB on startup
loadCryptoKey().then((stored) => {
  if (stored) {
    useSyncStore.setState({ cryptoKey: stored.cryptoKey, salt: stored.salt })
  }
})
