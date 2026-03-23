import { en } from './translations/en'
import { zh } from './translations/zh'

export type Locale = 'en' | 'zh'
export type TranslationKey = keyof typeof en

const translations: Record<Locale, Record<string, string>> = { en, zh }

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale][key] ?? translations.en[key] ?? key
}
