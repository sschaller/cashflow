import { create } from 'zustand'

interface TransactionStoreState {
  selectedTransactionId: string | null
  setSelectedTransactionId: (id: string | null) => void
}

export const useTransactionStore = create<TransactionStoreState>((set) => ({
  selectedTransactionId: null,
  setSelectedTransactionId: (id) => set({ selectedTransactionId: id }),
}))
