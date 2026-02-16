import { create } from 'zustand'
import type { ReactNode } from 'react'
import { getDateRange } from '@/utils/dateUtils.ts'

const defaultRange = getDateRange('last-3-months')

interface UIState {
  sidebarOpen: boolean
  darkMode: boolean
  pageTitle: string
  headerExtra: ReactNode | null
  dateRangeStart: string
  dateRangeEnd: string
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleDarkMode: () => void
  setDarkMode: (dark: boolean) => void
  setPageTitle: (title: string) => void
  setHeaderExtra: (extra: ReactNode | null) => void
  setDateRange: (start: string, end: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: window.innerWidth >= 768,
  darkMode: localStorage.getItem('darkMode') === 'true',
  pageTitle: '',
  headerExtra: null,
  dateRangeStart: defaultRange.start,
  dateRangeEnd: defaultRange.end,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode
      localStorage.setItem('darkMode', String(next))
      return { darkMode: next }
    }),
  setDarkMode: (dark) => {
    localStorage.setItem('darkMode', String(dark))
    set({ darkMode: dark })
  },
  setPageTitle: (title) => set({ pageTitle: title }),
  setHeaderExtra: (extra) => set({ headerExtra: extra }),
  setDateRange: (start, end) => set({ dateRangeStart: start, dateRangeEnd: end }),
}))
