import { useState, useEffect } from 'react'
import { useRepositories } from '@/repositories/RepositoryContext.tsx'
import { Button } from '@/components/ui/Button.tsx'
import type { Category } from '@/types/models.ts'
import toast from 'react-hot-toast'

interface CategoryTreeProps {
  onSelect?: (category: Category) => void
  selectedId?: number
}

export function CategoryTree({ onSelect, selectedId }: CategoryTreeProps) {
  const repos = useRepositories()
  const [categories, setCategories] = useState<Category[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#4CAF50')
  const [addingParentId, setAddingParentId] = useState<number | null | 'top'>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#4CAF50')

  const loadCategories = () => {
    repos.categories.getAllWithHierarchy().then(setCategories)
  }

  useEffect(() => { loadCategories() }, [repos])

  const topLevel = categories.filter((c) => c.parentId === null)
  const getChildren = (parentId: number) => categories.filter((c) => c.parentId === parentId)

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return
    await repos.categories.update(editingId, { name: editName.trim(), color: editColor })
    setEditingId(null)
    loadCategories()
  }

  const handleAddCategory = async (parentId: number | null) => {
    if (!newName.trim()) return
    const maxSort = categories
      .filter((c) => c.parentId === parentId)
      .reduce((max, c) => Math.max(max, c.sortOrder), -1)

    await repos.categories.add({
      name: newName.trim(),
      parentId,
      color: newColor,
      icon: 'tag',
      isSystem: false,
      sortOrder: maxSort + 1,
    })
    setAddingParentId(null)
    setNewName('')
    setNewColor('#4CAF50')
    loadCategories()
    toast.success('Category added')
  }

  const handleDelete = async (cat: Category) => {
    const children = getChildren(cat.id!)
    if (children.length > 0) {
      toast.error('Cannot delete category with subcategories')
      return
    }
    await repos.categories.delete(cat.id!)
    loadCategories()
    toast.success('Category deleted')
  }

  const renderCategory = (cat: Category, depth: number = 0) => {
    const children = getChildren(cat.id!)
    const isEditing = editingId === cat.id

    return (
      <div key={cat.id}>
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
            selectedId === cat.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: cat.color }}
          />

          {isEditing ? (
            <div className="flex flex-1 items-center gap-2">
              <input
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                autoFocus
              />
              <input
                type="color"
                className="h-6 w-6 cursor-pointer"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
              />
              <Button size="sm" onClick={handleSaveEdit}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
            </div>
          ) : (
            <>
              <span
                className="flex-1 cursor-pointer text-gray-800 dark:text-gray-200"
                onClick={() => onSelect?.(cat)}
              >
                {cat.name}
              </span>
              <button
                className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:text-gray-600 group-hover:opacity-100 dark:hover:text-gray-300 [div:hover>&]:opacity-100"
                onClick={() => {
                  setEditingId(cat.id!)
                  setEditName(cat.name)
                  setEditColor(cat.color)
                }}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              {depth === 0 && (
                <button
                  className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:text-gray-600 dark:hover:text-gray-300 [div:hover>&]:opacity-100"
                  onClick={() => {
                    setAddingParentId(cat.id!)
                    setNewName('')
                  }}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
              <button
                className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:text-red-500 [div:hover>&]:opacity-100"
                onClick={() => handleDelete(cat)}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>

        {addingParentId === cat.id && (
          <div className="flex items-center gap-2 px-3 py-2" style={{ paddingLeft: `${(depth + 1) * 24 + 12}px` }}>
            <input
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Subcategory name..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory(cat.id!)}
              autoFocus
            />
            <input type="color" className="h-6 w-6 cursor-pointer" value={newColor} onChange={(e) => setNewColor(e.target.value)} />
            <Button size="sm" onClick={() => handleAddCategory(cat.id!)}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setAddingParentId(null)}>Cancel</Button>
          </div>
        )}

        {children.map((child) => renderCategory(child, depth + 1))}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Categories</h3>
        <Button size="sm" variant="secondary" onClick={() => {
          setAddingParentId('top')
          setNewName('')
        }}>
          Add Category
        </Button>
      </div>

      {addingParentId === 'top' && (
        <div className="mb-2 flex items-center gap-2 px-3 py-2">
          <input
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name..."
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory(null)}
            autoFocus
          />
          <input type="color" className="h-6 w-6 cursor-pointer" value={newColor} onChange={(e) => setNewColor(e.target.value)} />
          <Button size="sm" onClick={() => handleAddCategory(null)}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setAddingParentId(null)}>Cancel</Button>
        </div>
      )}

      <div className="space-y-0.5">
        {topLevel.map((cat) => renderCategory(cat))}
      </div>
    </div>
  )
}
