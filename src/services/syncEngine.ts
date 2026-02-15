import { db } from '@/db/index.ts'
import type { RepositoryProvider } from '@/repositories/interfaces.ts'
import type { Transaction } from '@/types/models.ts'
import type { SyncSnapshot } from '@/types/sync.ts'
import type { EncryptedPayload } from '@/services/crypto.ts'
import { encrypt, decrypt, toBase64, fromBase64 } from '@/services/crypto.ts'
import type { GoogleDriveClient } from '@/services/googleDrive.ts'

// --- Snapshot creation ---

export async function createSnapshot(repos: RepositoryProvider, syncVersion: number): Promise<SyncSnapshot> {
  const [accounts, transactions, categories, rules, importProfiles] = await Promise.all([
    repos.accounts.getAll(),
    repos.transactions.getAll(),
    repos.categories.getAll(),
    repos.rules.getAll(),
    repos.importProfiles.getAll(),
  ])

  return {
    version: 1,
    syncVersion,
    timestamp: new Date().toISOString(),
    accounts,
    transactions,
    categories,
    rules,
    importProfiles,
  }
}

// --- Merge logic ---

interface Mergeable {
  id?: number
  updatedAt?: string
  _deleted?: boolean
}

function mergeTable<T extends Mergeable>(local: T[], remote: T[]): T[] {
  const merged = new Map<number, T>()

  for (const rec of local) {
    if (rec.id != null) merged.set(rec.id, rec)
  }

  for (const rec of remote) {
    if (rec.id == null) continue
    const existing = merged.get(rec.id)

    if (!existing) {
      merged.set(rec.id, rec)
    } else if ((rec.updatedAt ?? '') > (existing.updatedAt ?? '')) {
      merged.set(rec.id, rec)
    }
  }

  return Array.from(merged.values()).filter(r => !r._deleted)
}

function mergeTransactions(local: Transaction[], remote: Transaction[]): Transaction[] {
  const byId = new Map<number, Transaction>()
  const seenHashes = new Set<string>()

  for (const t of local) {
    if (t.id != null) byId.set(t.id, t)
    if (t.hash) seenHashes.add(t.hash)
  }

  for (const t of remote) {
    if (t.id == null) continue

    // Deduplicate by hash (same transaction imported on different devices)
    if (t.hash && seenHashes.has(t.hash)) {
      const localVersion = [...byId.values()].find(l => l.hash === t.hash)
      if (localVersion && (t.updatedAt ?? '') > (localVersion.updatedAt ?? '')) {
        byId.set(localVersion.id!, { ...t, id: localVersion.id })
      }
      continue
    }

    const existing = byId.get(t.id)
    if (!existing) {
      byId.set(t.id, t)
      if (t.hash) seenHashes.add(t.hash)
    } else if ((t.updatedAt ?? '') > (existing.updatedAt ?? '')) {
      byId.set(t.id, t)
    }
  }

  return Array.from(byId.values()).filter(r => !r._deleted)
}

export function mergeSnapshots(local: SyncSnapshot, remote: SyncSnapshot): SyncSnapshot {
  return {
    version: 1,
    syncVersion: Math.max(local.syncVersion, remote.syncVersion) + 1,
    timestamp: new Date().toISOString(),
    accounts: mergeTable(local.accounts, remote.accounts),
    transactions: mergeTransactions(local.transactions, remote.transactions),
    categories: mergeTable(local.categories, remote.categories),
    rules: mergeTable(local.rules, remote.rules),
    importProfiles: mergeTable(local.importProfiles, remote.importProfiles),
  }
}

// --- Apply snapshot to local DB ---

export async function applySnapshot(snapshot: SyncSnapshot): Promise<void> {
  await db.transaction(
    'rw',
    [db.accounts, db.transactions, db.categories, db.rules, db.importProfiles],
    async () => {
      await db.accounts.clear()
      await db.transactions.clear()
      await db.categories.clear()
      await db.rules.clear()
      await db.importProfiles.clear()

      if (snapshot.accounts.length) await db.accounts.bulkPut(snapshot.accounts)
      if (snapshot.transactions.length) await db.transactions.bulkPut(snapshot.transactions)
      if (snapshot.categories.length) await db.categories.bulkPut(snapshot.categories)
      if (snapshot.rules.length) await db.rules.bulkPut(snapshot.rules)
      if (snapshot.importProfiles.length) await db.importProfiles.bulkPut(snapshot.importProfiles)
    },
  )
}

// --- Orchestrated sync ---

export async function performSync(
  repos: RepositoryProvider,
  drive: GoogleDriveClient,
  cryptoKey: CryptoKey,
  salt: Uint8Array,
  currentSyncVersion: number,
): Promise<{ newSyncVersion: number }> {
  // 1. Create local snapshot
  const localSnapshot = await createSnapshot(repos, currentSyncVersion)

  // 2. Try to download remote snapshot
  const fileId = await drive.findSyncFile()
  let merged: SyncSnapshot

  if (fileId) {
    const encryptedText = await drive.downloadSyncFile(fileId)
    const encryptedPayload: EncryptedPayload = JSON.parse(encryptedText)
    const remoteJson = await decrypt(
      fromBase64(encryptedPayload.data).buffer as ArrayBuffer,
      cryptoKey,
      fromBase64(encryptedPayload.iv),
    )
    const remoteSnapshot: SyncSnapshot = JSON.parse(remoteJson)
    merged = mergeSnapshots(localSnapshot, remoteSnapshot)
  } else {
    merged = { ...localSnapshot, syncVersion: 1 }
  }

  // 3. Apply merged snapshot locally
  await applySnapshot(merged)

  // 4. Encrypt and upload merged snapshot
  const { iv, ciphertext } = await encrypt(JSON.stringify(merged), cryptoKey)
  const payload: EncryptedPayload = {
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(ciphertext)),
  }
  await drive.uploadSyncFile(JSON.stringify(payload), fileId ?? undefined)

  return { newSyncVersion: merged.syncVersion }
}
