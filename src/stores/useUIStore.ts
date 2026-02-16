import { create } from 'zustand'
import type { ReactNode } from 'react'

interface UIState {
  sidebarOpen: boolean
  darkMode: boolean
  pageTitle: string
  headerExtra: ReactNode | null
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleDarkMode: () => void
  setDarkMode: (dark: boolean) => void
  setPageTitle: (title: string) => void
  setHeaderExtra: (extra: ReactNode | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: window.innerWidth >= 768,
  darkMode: localStorage.getItem('darkMode') === 'true',
  pageTitle: '',
  headerExtra: null,
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
}))
