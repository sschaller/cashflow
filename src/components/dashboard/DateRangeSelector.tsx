import { getDateRange } from '@/utils/dateUtils.ts'

interface DateRangeSelectorProps {
  startDate: string
  endDate: string
  onRangeChange: (start: string, end: string) => void
}

const presets = [
  { label: 'This Month', value: 'this-month' },
  { label: 'Last Month', value: 'last-month' },
  { label: '3 Months', value: 'last-3-months' },
  { label: '6 Months', value: 'last-6-months' },
  { label: '12 Months', value: 'last-12-months' },
  { label: 'This Year', value: 'this-year' },
]

export function DateRangeSelector({ startDate, endDate, onRangeChange }: DateRangeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => {
        const range = getDateRange(preset.value)
        const isActive = range.start === startDate && range.end === endDate
        return (
          <button
            key={preset.value}
            onClick={() => onRangeChange(range.start, range.end)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {preset.label}
          </button>
        )
      })}

      <div className="flex items-center gap-2 ml-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onRangeChange(e.target.value, endDate)}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
        <span className="text-gray-400">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onRangeChange(startDate, e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
      </div>
    </div>
  )
}
