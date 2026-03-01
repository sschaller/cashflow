import { db, setSyncApplying } from '@/db/index.ts'
import type { Transaction } from '@/types/models.ts'
import type { SyncSnapshot } from '@/types/sync.ts'
import type { EncryptedPayload } from '@/services/crypto.ts'
import { encrypt, decrypt, toBase64, fromBase64 } from '@/services/crypto.ts'
import type { GoogleDriveClient } from '@/services/googleDrive.ts'

// --- Snapshot creation ---

export async function createSnapshot(syncVersion: number): Promise<SyncSnapshot> {
  // Read directly from DB (not repos) so soft-deleted records are included as tombstones
  const [accounts, transactions, categories, rules, importProfiles] = await Promise.all([
    db.accounts.toArray(),
    db.transactions.toArray(),
    db.categories.toArray(),
    db.rules.toArray(),
    db.importProfiles.toArray(),
  ])

  return {
    version: 1,
    syncVersion,
    timestamp: new Date().toISOString(),
    idFormat: 'uuid',
    accounts,
    transactions,
    categories,
    rules,
    importProfiles,
  }
}

// --- Numeric-to-UUID remapping for cross-device migration ---

function remapNumericSnapshot(snapshot: SyncSnapshot): SyncSnapshot {
  if (snapshot.idFormat === 'uuid') return snapshot

  const idMaps = {
    accounts: new Map<number, string>(),
    categories: new Map<number, string>(),
    rules: new Map<number, string>(),
    importProfiles: new Map<number, string>(),
    transactions: new Map<number, string>(),
  }

  // Generate UUIDs for all numeric IDs
  for (const rec of snapshot.accounts) {
    if (typeof rec.id === 'number') idMaps.accounts.set(rec.id, crypto.randomUUID())
  }
  for (const rec of snapshot.categories) {
    if (typeof rec.id === 'number') idMaps.categories.set(rec.id as unknown as number, crypto.randomUUID())
  }
  for (const rec of snapshot.rules) {
    if (typeof rec.id === 'number') idMaps.rules.set(rec.id as unknown as number, crypto.randomUUID())
  }
  for (const rec of snapshot.importProfiles) {
    if (typeof rec.id === 'number') idMaps.importProfiles.set(rec.id as unknown as number, crypto.randomUUID())
  }
  for (const rec of snapshot.transactions) {
    if (typeof rec.id === 'number') idMaps.transactions.set(rec.id as unknown as number, crypto.randomUUID())
  }

  return {
    ...snapshot,
    idFormat: 'uuid',
    accounts: snapshot.accounts.map(rec => ({
      ...rec,
      id: (typeof rec.id === 'number' ? idMaps.accounts.get(rec.id) : rec.id) as string,
    })),
    categories: snapshot.categories.map(rec => ({
      ...rec,
      id: (typeof rec.id === 'number' ? idMaps.categories.get(rec.id as unknown as number) : rec.id) as string,
      parentId: rec.parentId != null && typeof rec.parentId === 'number'
        ? (idMaps.categories.get(rec.parentId as unknown as number) ?? null)
        : rec.parentId,
    })),
    rules: snapshot.rules.map(rec => ({
      ...rec,
      id: (typeof rec.id === 'number' ? idMaps.rules.get(rec.id as unknown as number) : rec.id) as string,
      categoryId: rec.categoryId != null && typeof rec.categoryId === 'number'
        ? idMaps.categories.get(rec.categoryId as unknown as number)
        : rec.categoryId,
    })),
    importProfiles: snapshot.importProfiles.map(rec => ({
      ...rec,
      id: (typeof rec.id === 'number' ? idMaps.importProfiles.get(rec.id as unknown as number) : rec.id) as string,
      accountId: typeof rec.accountId === 'number'
        ? (idMaps.accounts.get(rec.accountId as unknown as number) ?? rec.accountId)
        : rec.accountId,
    })),
    transactions: snapshot.transactions.map(rec => ({
      ...rec,
      id: (typeof rec.id === 'number' ? idMaps.transactions.get(rec.id as unknown as number) : rec.id) as string,
      accountId: typeof rec.accountId === 'number'
        ? (idMaps.accounts.get(rec.accountId as unknown as number) ?? rec.accountId)
        : rec.accountId,
      categoryId: rec.categoryId != null && typeof rec.categoryId === 'number'
        ? idMaps.categories.get(rec.categoryId as unknown as number)
        : rec.categoryId,
      importProfileId: rec.importProfileId != null && typeof rec.importProfileId === 'number'
        ? idMaps.importProfiles.get(rec.importProfileId as unknown as number)
        : rec.importProfileId,
    })),
  }
}

// --- Merge logic ---

interface Mergeable {
  id?: string
  updatedAt?: string
  _deleted?: boolean
}

function mergeTable<T extends Mergeable>(local: T[], remote: T[]): T[] {
  const merged = new Map<string, T>()

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

  return Array.from(merged.values())
}

function mergeTransactions(local: Transaction[], remote: Transaction[]): Transaction[] {
  const byId = new Map<string, Transaction>()
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

  return Array.from(byId.values())
}

export function mergeSnapshots(local: SyncSnapshot, remote: SyncSnapshot): SyncSnapshot {
  return {
    version: 1,
    syncVersion: Math.max(local.syncVersion, remote.syncVersion) + 1,
    timestamp: new Date().toISOString(),
    idFormat: 'uuid',
    accounts: mergeTable(local.accounts, remote.accounts),
    transactions: mergeTransactions(local.transactions, remote.transactions),
    categories: mergeTable(local.categories, remote.categories),
    rules: mergeTable(local.rules, remote.rules),
    importProfiles: mergeTable(local.importProfiles, remote.importProfiles),
  }
}

// --- Phase 2: Race-safe apply ---

interface HasUpdatedAt {
  id?: string
  updatedAt?: string
}

async function applyTableSafe<T extends HasUpdatedAt>(
  table: { toArray(): Promise<T[]>; bulkPut(items: T[]): Promise<unknown>; bulkDelete(keys: string[]): Promise<void> },
  mergedRecords: T[],
  snapshotTimestamp: string,
): Promise<void> {
  const currentRecords = await table.toArray()
  const currentById = new Map<string, T>()
  for (const rec of currentRecords) {
    if (rec.id != null) currentById.set(rec.id, rec)
  }

  const mergedById = new Map<string, T>()
  for (const rec of mergedRecords) {
    if (rec.id != null) mergedById.set(rec.id, rec)
  }

  const toPut: T[] = []
  const toDelete: string[] = []

  // Process merged records: put unless current record was modified during sync
  for (const [id, mergedRec] of mergedById) {
    const current = currentById.get(id)
    if (current && (current.updatedAt ?? '') > snapshotTimestamp) {
      // Modified during sync window — keep the local version
      continue
    }
    toPut.push(mergedRec)
  }

  // Process current records not in merged set
  for (const [id, current] of currentById) {
    if (!mergedById.has(id)) {
      if ((current.updatedAt ?? '') > snapshotTimestamp) {
        // Created during sync window — keep it
        continue
      }
      // Remote deletion or not in merged set
      toDelete.push(id)
    }
  }

  if (toPut.length) await table.bulkPut(toPut)
  if (toDelete.length) await table.bulkDelete(toDelete)
}

export async function applySnapshot(snapshot: SyncSnapshot, snapshotTimestamp: string): Promise<void> {
  setSyncApplying(true)
  try {
    await db.transaction(
      'rw',
      [db.accounts, db.transactions, db.categories, db.rules, db.importProfiles],
      async () => {
        await applyTableSafe(db.accounts, snapshot.accounts, snapshotTimestamp)
        await applyTableSafe(db.transactions, snapshot.transactions, snapshotTimestamp)
        await applyTableSafe(db.categories, snapshot.categories, snapshotTimestamp)
        await applyTableSafe(db.rules, snapshot.rules, snapshotTimestamp)
        await applyTableSafe(db.importProfiles, snapshot.importProfiles, snapshotTimestamp)
      },
    )
  } finally {
    setSyncApplying(false)
  }
}

// --- Orchestrated sync with ETag retry (Phase 3) ---

const MAX_SYNC_RETRIES = 3

export async function performSync(
  drive: GoogleDriveClient,
  cryptoKey: CryptoKey,
  salt: Uint8Array,
  currentSyncVersion: number,
): Promise<{ newSyncVersion: number }> {
  for (let attempt = 0; attempt < MAX_SYNC_RETRIES; attempt++) {
    // 1. Capture timestamp before reading local state
    const snapshotTimestamp = new Date().toISOString()

    // 2. Create local snapshot
    const localSnapshot = await createSnapshot(currentSyncVersion)

    // 3. Try to download remote snapshot
    const remoteFile = await drive.findSyncFile()
    let merged: SyncSnapshot
    let downloadedVersion: string | null = null

    if (remoteFile) {
      downloadedVersion = remoteFile.version
      const { content } = await drive.downloadSyncFile(remoteFile.fileId)
      const encryptedPayload: EncryptedPayload = JSON.parse(content)
      const remoteJson = await decrypt(
        fromBase64(encryptedPayload.data).buffer as ArrayBuffer,
        cryptoKey,
        fromBase64(encryptedPayload.iv),
      )
      let remoteSnapshot: SyncSnapshot = JSON.parse(remoteJson)

      // Cross-device migration: remap numeric IDs to UUIDs if needed
      remoteSnapshot = remapNumericSnapshot(remoteSnapshot)

      merged = mergeSnapshots(localSnapshot, remoteSnapshot)
    } else {
      merged = { ...localSnapshot, syncVersion: 1, idFormat: 'uuid' }
    }

    // 4. Apply merged snapshot locally (race-safe)
    await applySnapshot(merged, snapshotTimestamp)

    // 5. ETag check: verify remote hasn't changed since download
    if (remoteFile && downloadedVersion) {
      const currentRemote = await drive.findSyncFile()
      if (currentRemote && currentRemote.version !== downloadedVersion) {
        // Remote changed during our sync — retry from scratch
        continue
      }
    }

    // 6. Encrypt and upload merged snapshot
    const { iv, ciphertext } = await encrypt(JSON.stringify(merged), cryptoKey)
    const payload: EncryptedPayload = {
      salt: toBase64(salt),
      iv: toBase64(iv),
      data: toBase64(new Uint8Array(ciphertext)),
    }
    await drive.uploadSyncFile(JSON.stringify(payload), remoteFile?.fileId ?? undefined)

    return { newSyncVersion: merged.syncVersion }
  }

  throw new Error('Sync failed after maximum retries due to concurrent modifications')
}
