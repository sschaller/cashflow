import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/index.ts'
import type { Category } from '@/types/models.ts'

export function useCategories(): Category[] {
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray())
  return categories ?? []
}

export function useCategoryMap(): Map<number, Category> {
  const categories = useCategories()
  const map = new Map<number, Category>()
  for (const c of categories) {
    map.set(c.id!, c)
  }
  return map
}
