import { create } from 'zustand'
import type { TransactionFilters } from '@/repositories/interfaces.ts'

interface FilterState {
  filters: TransactionFilters
  setFilter: <K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) => void
  setFilters: (filters: Partial<TransactionFilters>) => void
  resetFilters: () => void
}

const defaultFilters: TransactionFilters = {}

export const useFilterStore = create<FilterState>((set) => ({
  filters: { ...defaultFilters },
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),
}))
