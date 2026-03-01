import { useMemo, useState, useRef, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import type { Transaction, Category } from '@/types/models.ts'
import { formatDate } from '@/utils/dateUtils.ts'
import { formatCurrency, formatCurrencyOrPlain } from '@/utils/currencyUtils.ts'
import { getUniqueCurrency } from '@/hooks/useCurrencyLookup.ts'

interface TransactionTableProps {
  transactions: Transaction[]
  categories: Category[]
  currencyMap?: Map<string, string>
  onSelect?: (transaction: Transaction) => void
  onCategoryChange?: (transactionId: string, categoryId: string | undefined) => void
}

function CategoryCell({ cat, categories, onChange }: {
  cat: Category | undefined
  categories: Category[]
  onChange: (categoryId: string | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) { setFilter(''); setHighlightIdx(-1); return }
    inputRef.current?.focus()
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [open])

  const filtered = filter
    ? categories.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()))
    : categories

  // Build flat options list: "Uncategorized" (only when no filter) + filtered categories
  const options = useMemo(() => {
    const items: { id: string | undefined; name: string; color?: string }[] = []
    if (!filter) items.push({ id: undefined, name: 'Uncategorized' })
    for (const c of filtered) items.push({ id: c.id!, name: c.name, color: c.color })
    return items
  }, [filter, filtered])

  // Reset highlight to first item when filter text changes
  useEffect(() => {
    setHighlightIdx(filter ? 0 : -1)
  }, [filter])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx < 0 || !listRef.current) return
    const el = listRef.current.children[highlightIdx] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlightIdx])

  const selectOption = (opt: { id: string | undefined }) => {
    onChange(opt.id)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((i) => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIdx >= 0 && highlightIdx < options.length) {
        selectOption(options[highlightIdx])
      }
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        {cat ? (
          <>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
            {cat.name}
          </>
        ) : (
          <span className="text-gray-400">Uncategorized</span>
        )}
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-gray-200 px-3 py-1.5 dark:border-gray-700">
            <input
              ref={inputRef}
              className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 dark:text-gray-200 dark:placeholder:text-gray-500"
              placeholder="Filter..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1" ref={listRef}>
            {options.map((opt, i) => {
              const isActive = opt.id === cat?.id
              const isHighlighted = i === highlightIdx
              return (
                <button
                  key={opt.id ?? '_uncategorized'}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                    isHighlighted
                      ? 'bg-gray-100 dark:bg-gray-700'
                      : ''
                  } ${
                    isActive
                      ? 'font-medium text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                  onMouseEnter={() => setHighlightIdx(i)}
                  onClick={() => selectOption(opt)}
                >
                  {opt.color ? (
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: opt.color }} />
                  ) : null}
                  {opt.name}
                </button>
              )
            })}
            {options.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400">No matches</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function TransactionTable({ transactions, categories, currencyMap, onSelect, onCategoryChange }: TransactionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }])

  const catMap = useMemo(() => {
    const map = new Map<string, Category>()
    for (const c of categories) map.set(c.id!, c)
    return map
  }, [categories])

  const leafCategories = useMemo(() => {
    const parentIds = new Set(categories.filter((c) => c.parentId !== null).map((c) => c.parentId))
    return categories.filter((c) => !parentIds.has(c.id!))
  }, [categories])

  const uniqueCurrency = useMemo(
    () => currencyMap ? getUniqueCurrency(transactions, currencyMap) : null,
    [transactions, currencyMap]
  )

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: (info) => formatDate(info.getValue<string>()),
        meta: { shrink: true },
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: (info) => info.row.original.displayDescription ?? info.getValue<string>(),
      },
      {
        accessorKey: 'categoryId',
        header: 'Category',
        meta: { category: true },
        cell: (info) => {
          const catId = info.getValue<string | undefined>()
          const cat = catId ? catMap.get(catId) : undefined
          if (!onCategoryChange) {
            if (!cat) return <span className="text-gray-400">-</span>
            return (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                {cat.name}
              </span>
            )
          }
          return (
            <CategoryCell
              cat={cat}
              categories={leafCategories}
              onChange={(newId) => onCategoryChange(info.row.original.id!, newId)}
            />
          )
        },
      },
      {
        accessorKey: 'amount',
        header: uniqueCurrency ? `Amount (${uniqueCurrency})` : 'Amount',
        meta: { shrink: true },
        cell: (info) => {
          const amount = info.getValue<number>()
          if (uniqueCurrency) {
            return (
              <span className={`font-mono ${amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrencyOrPlain(amount, null)}
              </span>
            )
          }
          const currency = currencyMap?.get(info.row.original.accountId) ?? 'USD'
          return (
            <span className={`font-mono ${amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(amount, currency)}
            </span>
          )
        },
      },
    ],
    [catMap, leafCategories, currencyMap, uniqueCurrency, onCategoryChange]
  )

  const table = useReactTable({
    data: transactions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    initialState: { pagination: { pageSize: 25 } },
  })

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as Record<string, boolean> | undefined
                  const widthClass = meta?.shrink ? 'w-0' : meta?.category ? 'w-48' : 'w-full'
                  return (
                  <th
                    key={header.id}
                    className={`cursor-pointer select-none whitespace-nowrap px-4 py-3 font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 ${widthClass}`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: ' \u2191', desc: ' \u2193' }[header.column.getIsSorted() as string] ?? ''}
                    </span>
                  </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No transactions found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => onSelect?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as Record<string, boolean> | undefined
                    const cellClass = meta?.shrink ? 'whitespace-nowrap' : meta?.category ? 'whitespace-nowrap' : 'max-w-0 truncate'
                    return (
                    <td key={cell.id} className={`px-4 py-3 text-gray-700 dark:text-gray-300 ${cellClass}`}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            transactions.length
          )}{' '}
          of {transactions.length}
        </p>
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </button>
          <button
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
