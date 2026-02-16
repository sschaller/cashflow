import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useUIStore } from '@/stores/useUIStore.ts'

export function usePageHeader(title: string, extra?: ReactNode) {
  const setPageTitle = useUIStore((s) => s.setPageTitle)
  const setHeaderExtra = useUIStore((s) => s.setHeaderExtra)

  useEffect(() => {
    setPageTitle(title)
  }, [title, setPageTitle])

  useEffect(() => {
    setHeaderExtra(extra ?? null)
    return () => setHeaderExtra(null)
  }, [extra, setHeaderExtra])
}
