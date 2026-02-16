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
  currencyMap?: Map<number, string>
  onSelect?: (transaction: Transaction) => void
  onCategoryChange?: (transactionId: number, categoryId: number | undefined) => void
}

function CategoryCell({ cat, categories, catMap, onChange }: {
  cat: Category | undefined
  categories: Category[]
  catMap: Map<number, Category>
  onChange: (categoryId: number | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

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
          className="absolute left-0 top-full z-50 mt-1 max-h-64 w-48 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
              !cat ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
            onClick={() => { onChange(undefined); setOpen(false) }}
          >
            Uncategorized
          </button>
          {categories.map((c) => {
            const isActive = cat?.id === c.id
            return (
              <button
                key={c.id}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                }`}
                onClick={() => { onChange(c.id!); setOpen(false) }}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function TransactionTable({ transactions, categories, currencyMap, onSelect, onCategoryChange }: TransactionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }])

  const catMap = useMemo(() => {
    const map = new Map<number, Category>()
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
          const catId = info.getValue<number | undefined>()
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
              catMap={catMap}
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
