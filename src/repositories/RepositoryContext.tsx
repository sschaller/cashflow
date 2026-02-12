import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { RepositoryProvider } from './interfaces.ts'
import { getProvider } from './provider.ts'

const RepositoryContext = createContext<RepositoryProvider | null>(null)

export function RepositoryContextProvider({ children }: { children: ReactNode }) {
  const provider = getProvider()
  return (
    <RepositoryContext value={provider}>
      {children}
    </RepositoryContext>
  )
}

export function useRepositories(): RepositoryProvider {
  const ctx = useContext(RepositoryContext)
  if (!ctx) {
    throw new Error('useRepositories must be used within RepositoryContextProvider')
  }
  return ctx
}
