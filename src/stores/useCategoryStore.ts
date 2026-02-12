import { create } from 'zustand'

interface CategoryStoreState {
  selectedCategoryId: number | null
  setSelectedCategoryId: (id: number | null) => void
}

export const useCategoryStore = create<CategoryStoreState>((set) => ({
  selectedCategoryId: null,
  setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),
}))
