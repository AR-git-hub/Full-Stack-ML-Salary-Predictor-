'use client'

import { useState } from 'react'
import { Upload, Brain, Table2 } from 'lucide-react'
import { ModelUpload } from '@/components/ModelUpload'
import { PredictForm } from '@/components/PredictForm'
import { CsvPredict } from '@/components/CsvPredict'

type TabId = 'upload' | 'predict' | 'csv'

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'upload', label: 'Model Upload', icon: Upload },
  { id: 'predict', label: 'Manual Prediction', icon: Brain },
  { id: 'csv', label: 'Batch CSV', icon: Table2 },
]

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>('upload')

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-slate-900 shadow-lg">
        <div className="mx-auto max-w-5xl px-4 py-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">ML Prediction Service</h1>
            <p className="text-xs text-slate-400">Upload model · Run predictions · Batch CSV</p>
          </div>
        </div>
      </header>

      {/* ── Tab navigation ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-5xl px-4">
          <nav className="flex" role="tablist" aria-label="Main navigation">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 border-b-2 px-5 py-4 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          {activeTab === 'upload' && <ModelUpload />}
          {activeTab === 'predict' && <PredictForm />}
          {activeTab === 'csv' && <CsvPredict />}
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="py-4 text-center text-xs text-slate-400">
        ML Prediction Service &mdash; FastAPI + Next.js
      </footer>
    </div>
  )
}
