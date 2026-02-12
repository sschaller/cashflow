import { useState, useEffect } from 'react'
import { useRepositories } from '@/repositories/RepositoryContext.tsx'
import { Button } from '@/components/ui/Button.tsx'
import type { Account } from '@/types/models.ts'
import type { AccountType } from '@/types/enums.ts'
import toast from 'react-hot-toast'

const accountTypes: { value: AccountType; label: string }[] = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'investment', label: 'Investment' },
  { value: 'cash', label: 'Cash' },
]

export function AccountManager() {
  const repos = useRepositories()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [editing, setEditing] = useState<Account | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('checking')
  const [institution, setInstitution] = useState('')
  const [currency, setCurrency] = useState('USD')

  const load = () => repos.accounts.getAll().then(setAccounts)
  useEffect(() => { load() }, [repos])

  const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'

  const resetForm = () => {
    setEditing(null)
    setName('')
    setType('checking')
    setInstitution('')
    setCurrency('USD')
  }

  const handleSave = async () => {
    if (!name.trim()) return
    const now = new Date().toISOString()
    if (editing?.id) {
      await repos.accounts.update(editing.id, { name: name.trim(), type, institution, currency, updatedAt: now })
      toast.success('Account updated')
    } else {
      await repos.accounts.add({ name: name.trim(), type, institution, currency, isActive: true, createdAt: now, updatedAt: now })
      toast.success('Account added')
    }
    resetForm()
    load()
  }

  const handleEdit = (account: Account) => {
    setEditing(account)
    setName(account.name)
    setType(account.type)
    setInstitution(account.institution)
    setCurrency(account.currency)
  }

  const handleDelete = async (id: number) => {
    const txCount = (await repos.transactions.getByAccountId(id)).length
    if (txCount > 0) {
      toast.error(`Cannot delete: ${txCount} transactions linked to this account`)
      return
    }
    await repos.accounts.delete(id)
    toast.success('Account deleted')
    load()
  }

  return (
    <div>
      <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">Accounts</h3>

      {accounts.length > 0 && (
        <div className="mb-4 space-y-2">
          {accounts.map((acct) => (
            <div key={acct.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{acct.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {accountTypes.find((t) => t.value === acct.type)?.label} {acct.institution ? `· ${acct.institution}` : ''} · {acct.currency}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(acct)} className="rounded p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button onClick={() => handleDelete(acct.id!)} className="rounded p-1.5 text-gray-400 hover:text-red-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{editing ? 'Edit Account' : 'Add Account'}</h4>
        <div className="grid grid-cols-2 gap-3">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name" />
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            {accountTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input className={inputClass} value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Institution (optional)" />
          <input className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="Currency (e.g. USD)" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={!name.trim()}>{editing ? 'Update' : 'Add'}</Button>
          {editing && <Button size="sm" variant="ghost" onClick={resetForm}>Cancel</Button>}
        </div>
      </div>
    </div>
  )
}
