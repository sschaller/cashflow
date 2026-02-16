import { useState, useRef, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { getDateRange, getDateRangePresets } from '@/utils/dateUtils.ts'

interface DateRangeSelectorProps {
  startDate: string
  endDate: string
  onRangeChange: (start: string, end: string) => void
}

const presets = getDateRangePresets()

function getActiveLabel(startDate: string, endDate: string): string {
  for (const preset of presets) {
    const range = getDateRange(preset.value)
    if (range.start === startDate && range.end === endDate) {
      return preset.label
    }
  }
  const s = parseISO(startDate)
  const e = parseISO(endDate)
  if (s.getFullYear() === e.getFullYear()) {
    return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`
  }
  return `${format(s, 'MMM d, yyyy')} – ${format(e, 'MMM d, yyyy')}`
}

export function DateRangeSelector({ startDate, endDate, onRangeChange }: DateRangeSelectorProps) {
  const [open, setOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
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

  const activeLabel = getActiveLabel(startDate, endDate)
  const periodPresets = presets.filter((p) => p.group === 'period')
  const yearPresets = presets.filter((p) => p.group === 'year')

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
        {activeLabel}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {periodPresets.map((preset) => {
            const range = getDateRange(preset.value)
            const isActive = range.start === startDate && range.end === endDate
            return (
              <button
                key={preset.value}
                onClick={() => {
                  onRangeChange(range.start, range.end)
                  setShowCustom(false)
                  setOpen(false)
                }}
                className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {preset.label}
              </button>
            )
          })}

          <div className="my-1 border-t border-gray-200 dark:border-gray-700" />

          {yearPresets.map((preset) => {
            const range = getDateRange(preset.value)
            const isActive = range.start === startDate && range.end === endDate
            return (
              <button
                key={preset.value}
                onClick={() => {
                  onRangeChange(range.start, range.end)
                  setShowCustom(false)
                  setOpen(false)
                }}
                className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {preset.label}
              </button>
            )
          })}

          <div className="my-1 border-t border-gray-200 dark:border-gray-700" />

          <button
            onClick={() => setShowCustom(!showCustom)}
            className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Custom Range
          </button>

          {showCustom && (
            <div className="flex flex-col gap-2 px-3 py-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => onRangeChange(e.target.value, endDate)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => onRangeChange(startDate, e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
