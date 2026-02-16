import { useMemo, useState } from 'react'
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
}

export function TransactionTable({ transactions, categories, currencyMap, onSelect }: TransactionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }])

  const catMap = useMemo(() => {
    const map = new Map<number, Category>()
    for (const c of categories) map.set(c.id!, c)
    return map
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
        meta: { shrink: true },
        cell: (info) => {
          const catId = info.getValue<number | undefined>()
          const cat = catId ? catMap.get(catId) : undefined
          if (!cat) return <span className="text-gray-400">-</span>
          return (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
              {cat.name}
            </span>
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
    [catMap, currencyMap, uniqueCurrency]
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
                  const shrink = (header.column.columnDef.meta as Record<string, boolean> | undefined)?.shrink
                  return (
                  <th
                    key={header.id}
                    className={`cursor-pointer select-none whitespace-nowrap px-4 py-3 font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 ${shrink ? 'w-0' : 'w-full'}`}
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
                    const shrink = (cell.column.columnDef.meta as Record<string, boolean> | undefined)?.shrink
                    return (
                    <td key={cell.id} className={`px-4 py-3 text-gray-700 dark:text-gray-300 ${shrink ? 'whitespace-nowrap' : 'max-w-0 truncate'}`}>
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
