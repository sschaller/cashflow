import { Card } from '@/components/ui/Card.tsx'
import { AccountManager } from '@/components/settings/AccountManager.tsx'
import { DataManagement } from '@/components/settings/DataManagement.tsx'
import { ImportProfileManager } from '@/components/settings/ImportProfileManager.tsx'
import { useUIStore } from '@/stores/useUIStore.ts'

export default function SettingsPage() {
  const darkMode = useUIStore((s) => s.darkMode)
  const toggleDarkMode = useUIStore((s) => s.toggleDarkMode)

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      <p className="mb-8 text-gray-600 dark:text-gray-400">Manage accounts, data, and preferences</p>

      <div className="space-y-6">
        <Card>
          <AccountManager />
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">Appearance</h3>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Toggle dark theme</p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative h-6 w-11 rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-5' : ''}`}
              />
            </button>
          </div>
        </Card>

        <Card>
          <ImportProfileManager />
        </Card>

        <Card>
          <DataManagement />
        </Card>
      </div>
    </div>
  )
}
