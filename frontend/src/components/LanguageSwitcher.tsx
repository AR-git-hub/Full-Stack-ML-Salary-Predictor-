'use client'

import { useLocale, useTranslations } from 'next-intl'
import { routing } from '@/i18n/routing'
import { useLocaleSwitch } from '@/components/IntlProvider'

export function LanguageSwitcher() {
  const locale = useLocale()
  const { switchLocale } = useLocaleSwitch()
  const t = useTranslations('languageSwitcher')

  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="hidden text-xs uppercase tracking-wide text-slate-400 sm:block">
        {t('label')}
      </span>
      <div className="flex overflow-hidden rounded-lg border border-slate-600">
        {routing.locales.map((l) => (
          <button
            key={l}
            onClick={() => switchLocale(l as 'en' | 'ru')}
            aria-pressed={locale === l}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
              locale === l
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
