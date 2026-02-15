import { useState, useMemo, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/index.ts'
import type { Category } from '@/types/models.ts'

const GRID_COLS = 3

interface CategoryPickerProps {
  categories: Category[]
  onSelect: (categoryId: number) => void
}

export interface CategoryPickerHandle {
  focusSearch: () => void
}

export const CategoryPicker = forwardRef<CategoryPickerHandle, CategoryPickerProps>(
  function CategoryPicker({ categories, onSelect }, ref) {
    const [search, setSearch] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const searchRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => ({
      focusSearch() {
        searchRef.current?.focus()
      },
    }))

    // Count transactions per category for popularity sorting
    const categoryCounts = useLiveQuery(async () => {
      const counts = new Map<number, number>()
      await db.transactions.each((tx) => {
        if (tx.categoryId != null) {
          counts.set(tx.categoryId, (counts.get(tx.categoryId) ?? 0) + 1)
        }
      })
      return counts
    }, [])

    // Only show leaf categories (those with no children)
    const parentIds = new Set(categories.filter((c) => c.parentId !== null).map((c) => c.parentId))
    const leafCategories = useMemo(() => {
      const leaves = categories.filter((c) => !parentIds.has(c.id!))
      const counts = categoryCounts ?? new Map<number, number>()
      return leaves.sort((a, b) => {
        const countDiff = (counts.get(b.id!) ?? 0) - (counts.get(a.id!) ?? 0)
        if (countDiff !== 0) return countDiff
        return a.name.localeCompare(b.name)
      })
    }, [categories, parentIds, categoryCounts])

    const filtered = useMemo(() => {
      if (!search.trim()) return leafCategories
      const s = search.toLowerCase()
      return leafCategories.filter((c) => c.name.toLowerCase().includes(s))
    }, [leafCategories, search])

    // Reset selection when search changes
    useEffect(() => {
      setSelectedIndex(-1)
    }, [search])

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        const target = e.target as HTMLElement
        const isSearchInput = target === searchRef.current

        // Only handle arrow/enter keys when search is focused or no input is focused
        const isOtherInput =
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) &&
          !isSearchInput
        if (isOtherInput) return

        if (e.key === 'ArrowRight') {
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, -1))
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + GRID_COLS, filtered.length - 1))
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - GRID_COLS, -1))
        } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < filtered.length) {
          e.preventDefault()
          onSelect(filtered[selectedIndex].id!)
        } else {
          // Number keys 1-9 for quick category assignment
          const num = parseInt(e.key, 10)
          if (num >= 1 && num <= 9) {
            const cat = filtered[num - 1]
            if (cat) {
              e.preventDefault()
              onSelect(cat.id!)
            }
          }
        }
      },
      [filtered, selectedIndex, onSelect],
    )

    useEffect(() => {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    return (
      <div>
        <input
          ref={searchRef}
          type="text"
          className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
          tabIndex={1}
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && selectedIndex < 0 && filtered.length > 0) {
              e.preventDefault()
              onSelect(filtered[0].id!)
            }
          }}
          data-category-search
        />

        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">No categories match your search</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filtered.map((c, i) => {
              const num = i < 9 ? i + 1 : null
              const isSelected = i === selectedIndex
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelect(c.id!)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-400'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:bg-blue-900/30 dark:hover:text-blue-300'
                  }`}
                >
                  {c.color && (
                    <span
                      className="inline-block h-3 w-3 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                  )}
                  <span className="truncate">{c.name}</span>
                  {num && (
                    <kbd className="ml-auto flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                      {num}
                    </kbd>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  },
)
