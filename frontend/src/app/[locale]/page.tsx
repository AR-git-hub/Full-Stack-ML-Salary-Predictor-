'use client'

import { useState, useEffect } from 'react'
import type { ComponentType } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, Brain, Table2 } from 'lucide-react'
import { ModelUpload } from '@/components/ModelUpload'
import { PredictForm } from '@/components/PredictForm'
import { CsvPredict } from '@/components/CsvPredict'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

type TabId = 'upload' | 'predict' | 'csv'

const VALID_TABS: TabId[] = ['upload', 'predict', 'csv']

let _cachedTab: TabId | null = null

export default function HomePage() {
  const tHeader = useTranslations('header')
  const tTabs = useTranslations('tabs')
  const tFooter = useTranslations('footer')
  const [activeTab, setActiveTab] = useState<TabId>('upload')

  useEffect(() => {
    if (_cachedTab && VALID_TABS.includes(_cachedTab)) setActiveTab(_cachedTab)
  }, [])

  const handleTabChange = (tab: TabId) => {
    _cachedTab = tab
    setActiveTab(tab)
  }

  const TABS: { id: TabId; label: string; icon: ComponentType<{ className?: string }> }[] = [
    { id: 'upload', label: tTabs('upload'), icon: Upload },
    { id: 'predict', label: tTabs('predict'), icon: Brain },
    { id: 'csv', label: tTabs('csv'), icon: Table2 },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 shadow-lg">
        <div className="mx-auto max-w-5xl px-4 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow shrink-0">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">
                {tHeader('title')}
              </h1>
              <p className="hidden sm:block text-xs text-slate-400">{tHeader('subtitle')}</p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-5xl px-4">
          <nav className="flex" role="tablist" aria-label="Main navigation">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => handleTabChange(id)}
                className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-2 py-3 text-sm font-medium transition-colors sm:flex-none sm:px-5 sm:py-4 ${
                  activeTab === id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <Icon className="h-5 w-5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 sm:py-8">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className={activeTab !== 'upload' ? 'hidden' : undefined}><ModelUpload /></div>
          <div className={activeTab !== 'predict' ? 'hidden' : undefined}><PredictForm /></div>
          <div className={activeTab !== 'csv' ? 'hidden' : undefined}><CsvPredict /></div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400">
        {tFooter('text')}
      </footer>
    </div>
  )
}
