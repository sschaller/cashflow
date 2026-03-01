import { create } from 'zustand'

interface AccountStoreState {
  selectedAccountId: string | null
  setSelectedAccountId: (id: string | null) => void
}

export const useAccountStore = create<AccountStoreState>((set) => ({
  selectedAccountId: null,
  setSelectedAccountId: (id) => set({ selectedAccountId: id }),
}))
