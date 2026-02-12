import { create } from 'zustand'

interface TransactionStoreState {
  selectedTransactionId: number | null
  setSelectedTransactionId: (id: number | null) => void
}

export const useTransactionStore = create<TransactionStoreState>((set) => ({
  selectedTransactionId: null,
  setSelectedTransactionId: (id) => set({ selectedTransactionId: id }),
}))
