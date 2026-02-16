import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { RepositoryContextProvider } from '@/repositories/RepositoryContext.tsx'
import { AppShell } from '@/components/layout/AppShell.tsx'
import { useUIStore } from '@/stores/useUIStore.ts'
import { SyncProvider } from '@/components/sync/SyncProvider.tsx'
import DashboardPage from '@/pages/DashboardPage.tsx'
import TransactionsPage from '@/pages/TransactionsPage.tsx'
import ImportPage from '@/pages/ImportPage.tsx'
import CategorizePage from '@/pages/CategorizePage.tsx'
import CategoriesPage from '@/pages/CategoriesPage.tsx'
import ReportsPage from '@/pages/ReportsPage.tsx'
import SettingsPage from '@/pages/SettingsPage.tsx'

function DarkModeManager() {
  const darkMode = useUIStore((s) => s.darkMode)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return null
}

export default function App() {
  return (
    <RepositoryContextProvider>
      <SyncProvider>
      <DarkModeManager />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="categorize" element={<CategorizePage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
        <Toaster position="bottom-right" />
      </BrowserRouter>
      </SyncProvider>
    </RepositoryContextProvider>
  )
}
