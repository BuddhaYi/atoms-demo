import { useCallback } from 'react'
import { useLanguageStore } from '@/store/language-store'
import { t as translate, type TranslationKey, type Locale } from '@/i18n'

export function useTranslation() {
  const locale = useLanguageStore((state) => state.locale)
  const setLocale = useLanguageStore((state) => state.setLocale)

  const t = useCallback(
    (key: TranslationKey) => translate(locale, key),
    [locale]
  )

  return { t, locale, setLocale }
}
