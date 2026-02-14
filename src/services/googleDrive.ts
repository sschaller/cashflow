const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3'
const SYNC_FILENAME = 'finance-sync.enc'
const APP_DATA_FOLDER = 'appDataFolder'

export class DriveApiError extends Error {
  status: number
  body: string

  constructor(status: number, body: string) {
    super(`Drive API error ${status}: ${body}`)
    this.name = 'DriveApiError'
    this.status = status
    this.body = body
  }
}

export class GoogleDriveClient {
  private getAccessToken: () => Promise<string>

  constructor(getAccessToken: () => Promise<string>) {
    this.getAccessToken = getAccessToken
  }

  private async headers(): Promise<HeadersInit> {
    const token = await this.getAccessToken()
    return { Authorization: `Bearer ${token}` }
  }

  async findSyncFile(): Promise<string | null> {
    const params = new URLSearchParams({
      spaces: APP_DATA_FOLDER,
      q: `name = '${SYNC_FILENAME}'`,
      fields: 'files(id, modifiedTime)',
    })

    const res = await fetch(`${DRIVE_API}/files?${params}`, {
      headers: await this.headers(),
    })

    if (!res.ok) throw new DriveApiError(res.status, await res.text())
    const data = await res.json()
    return data.files?.[0]?.id ?? null
  }

  async downloadSyncFile(fileId: string): Promise<string> {
    const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
      headers: await this.headers(),
    })

    if (!res.ok) throw new DriveApiError(res.status, await res.text())
    return res.text()
  }

  async uploadSyncFile(content: string, existingFileId?: string): Promise<string> {
    const metadata = existingFileId
      ? {}
      : { name: SYNC_FILENAME, parents: [APP_DATA_FOLDER] }

    const boundary = '---finance-sync-boundary'
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      'Content-Type: application/octet-stream',
      '',
      content,
      `--${boundary}--`,
    ].join('\r\n')

    const method = existingFileId ? 'PATCH' : 'POST'
    const url = existingFileId
      ? `${DRIVE_UPLOAD}/files/${existingFileId}?uploadType=multipart`
      : `${DRIVE_UPLOAD}/files?uploadType=multipart`

    const baseHeaders = await this.headers()
    const res = await fetch(url, {
      method,
      headers: {
        ...baseHeaders,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    })

    if (!res.ok) throw new DriveApiError(res.status, await res.text())
    const data = await res.json()
    return data.id
  }

  async deleteSyncFile(fileId: string): Promise<void> {
    const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
      method: 'DELETE',
      headers: await this.headers(),
    })

    if (!res.ok) throw new DriveApiError(res.status, await res.text())
  }
}
