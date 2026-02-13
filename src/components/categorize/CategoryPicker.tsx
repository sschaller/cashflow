import { useState, useMemo } from 'react'
import type { Category } from '@/types/models.ts'

interface CategoryPickerProps {
  categories: Category[]
  onSelect: (categoryId: number) => void
}

export function CategoryPicker({ categories, onSelect }: CategoryPickerProps) {
  const [search, setSearch] = useState('')

  // Only show leaf categories (those with no children)
  const parentIds = new Set(categories.filter((c) => c.parentId !== null).map((c) => c.parentId))
  const leafCategories = categories.filter((c) => !parentIds.has(c.id!))

  // Group by parent
  const parentMap = new Map<number | null, Category>()
  for (const c of categories) {
    if (c.id !== undefined) parentMap.set(c.id, c)
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return leafCategories
    const s = search.toLowerCase()
    return leafCategories.filter((c) => c.name.toLowerCase().includes(s))
  }, [leafCategories, search])

  // Group filtered categories by their parent
  const grouped = useMemo(() => {
    const groups = new Map<string, Category[]>()
    for (const c of filtered) {
      const parentName = c.parentId !== null ? (parentMap.get(c.parentId)?.name ?? 'Other') : 'Top Level'
      if (!groups.has(parentName)) groups.set(parentName, [])
      groups.get(parentName)!.push(c)
    }
    return groups
  }, [filtered, parentMap])

  // Flat list for keyboard shortcut numbering
  let shortcutIndex = 0

  return (
    <div>
      <input
        type="text"
        className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
        tabIndex={1}
        placeholder="Search categories..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && filtered.length > 0) {
            e.preventDefault()
            onSelect(filtered[0].id!)
          }
        }}
        data-category-search
      />

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">No categories match your search</p>
      ) : (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([groupName, cats]) => (
            <div key={groupName}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {groupName}
              </p>
              <div className="flex flex-wrap gap-2">
                {cats.map((c) => {
                  shortcutIndex++
                  const num = shortcutIndex <= 9 ? shortcutIndex : null
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelect(c.id!)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
                    >
                      {c.color && (
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                      )}
                      {c.name}
                      {num && (
                        <kbd className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                          {num}
                        </kbd>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
