import { create } from 'zustand'

interface AccountStoreState {
  selectedAccountId: number | null
  setSelectedAccountId: (id: number | null) => void
}

export const useAccountStore = create<AccountStoreState>((set) => ({
  selectedAccountId: null,
  setSelectedAccountId: (id) => set({ selectedAccountId: id }),
}))
