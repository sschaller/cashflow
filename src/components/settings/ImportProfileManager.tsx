import { useState, useEffect } from 'react'
import { useRepositories } from '@/repositories/RepositoryContext.tsx'
import { Button } from '@/components/ui/Button.tsx'
import type { ImportProfile, Account } from '@/types/models.ts'
import toast from 'react-hot-toast'

export function ImportProfileManager() {
  const repos = useRepositories()
  const [profiles, setProfiles] = useState<ImportProfile[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  const load = async () => {
    const [p, a] = await Promise.all([repos.importProfiles.getAll(), repos.accounts.getAll()])
    setProfiles(p)
    setAccounts(a)
  }

  useEffect(() => { load() }, [repos])

  const getAccountName = (id: number) => accounts.find((a) => a.id === id)?.name ?? 'Unknown'

  const handleDelete = async (id: number) => {
    await repos.importProfiles.delete(id)
    toast.success('Profile deleted')
    load()
  }

  return (
    <div>
      <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">Import Profiles</h3>
      {profiles.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No saved profiles. Profiles are created when you import transactions.
        </p>
      ) : (
        <div className="space-y-2">
          {profiles.map((profile) => (
            <div key={profile.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{profile.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {profile.format.toUpperCase()} · {getAccountName(profile.accountId)} · Date format: {profile.dateFormat}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(profile.id!)}>
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
