import { create } from 'zustand'

interface CategoryStoreState {
  selectedCategoryId: string | null
  setSelectedCategoryId: (id: string | null) => void
}

export const useCategoryStore = create<CategoryStoreState>((set) => ({
  selectedCategoryId: null,
  setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),
}))
