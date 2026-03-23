import { create } from 'zustand'
import type { Locale } from '@/i18n'

const STORAGE_KEY = 'atoms_language'

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'zh'
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'zh') return saved
  } catch { /* ignore */ }
  return 'zh'
}

interface LanguageState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLanguageStore = create<LanguageState>((set) => ({
  locale: getInitialLocale(),
  setLocale: (locale) => {
    try { localStorage.setItem(STORAGE_KEY, locale) } catch { /* ignore */ }
    set({ locale })
  },
}))
