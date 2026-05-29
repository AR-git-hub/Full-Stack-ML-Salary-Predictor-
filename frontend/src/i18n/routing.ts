import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'ru'] as const,
  defaultLocale: 'en',
  // Default locale (en) is served at '/', other locales at '/ru/...'
  localePrefix: 'as-needed',
})

export type Locale = (typeof routing.locales)[number]
