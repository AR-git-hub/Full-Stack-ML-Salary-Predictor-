'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '../../messages/en.json'
import ruMessages from '../../messages/ru.json'

type Locale = 'en' | 'ru'

const allMessages = { en: enMessages, ru: ruMessages } as const

interface LocaleCtxValue {
  locale: Locale
  switchLocale: (l: Locale) => void
}

const LocaleCtx = createContext<LocaleCtxValue>({ locale: 'en', switchLocale: () => {} })

export function useLocaleSwitch() {
  return useContext(LocaleCtx)
}

interface Props {
  locale: Locale
  children: ReactNode
}

export function IntlProvider({ locale: initialLocale, children }: Props) {
  const [locale, setLocale] = useState<Locale>(initialLocale)

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === locale) return
    setLocale(newLocale)
    // Update URL without triggering Next.js navigation (no server round-trip,
    // no component remount — React state and module-level cache survive intact).
    const path = window.location.pathname
    const newPath =
      newLocale === 'en'
        ? path.replace(/^\/ru(\/|$)/, '/') || '/'
        : path.startsWith('/ru')
          ? path
          : `/ru${path === '/' ? '' : path}`
    window.history.replaceState(null, '', newPath || '/')
  }

  return (
    <LocaleCtx.Provider value={{ locale, switchLocale }}>
      <NextIntlClientProvider locale={locale} messages={allMessages[locale]}>
        {children}
      </NextIntlClientProvider>
    </LocaleCtx.Provider>
  )
}
