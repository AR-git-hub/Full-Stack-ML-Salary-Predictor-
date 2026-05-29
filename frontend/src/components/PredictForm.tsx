'use client'

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2, Loader2, Sparkles } from 'lucide-react'
import { predict } from '@/lib/api'
import type { PredictRecord } from '@/types/api'
import { Alert } from '@/components/ui/Alert'

interface Field {
  id: number
  key: string
  value: string
}

const DEFAULT_FIELDS: Field[] = [
  { id: 1, key: 'credit_score', value: '' },
  { id: 2, key: 'annual_income', value: '' },
  { id: 3, key: 'loan_amount', value: '' },
]

function ResultCard({ record }: { record: PredictRecord }) {
  const t = useTranslations('predictForm')
  const isApproved = record.loan_status.toLowerCase() === 'approved'
  const statusLabel = isApproved ? t('approved') : t('rejected')

  return (
    <div
      className={`rounded-xl border-2 p-6 ${
        isApproved ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-700">{t('resultTitle')}</span>
        <span
          className={`rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wider ${
            isApproved ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {Object.keys(record.features).length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {Object.entries(record.features).map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-sm"
            >
              <span className="text-slate-500">{k}</span>
              <span className="font-medium text-slate-800">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function PredictForm() {
  const t = useTranslations('predictForm')
  const [fields, setFields] = useState<Field[]>(DEFAULT_FIELDS)
  const [nextId, setNextId] = useState(DEFAULT_FIELDS.length + 1)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PredictRecord | null>(null)
  const [error, setError] = useState<string | null>(null)

  const addField = () => {
    setFields((prev) => [...prev, { id: nextId, key: '', value: '' }])
    setNextId((n) => n + 1)
  }

  const removeField = (id: number) => {
    setFields((prev) => prev.filter((f) => f.id !== id))
  }

  const updateField = (id: number, prop: 'key' | 'value', val: string) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, [prop]: val } : f)))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    const record: Record<string, unknown> = {}
    for (const f of fields) {
      if (!f.key.trim()) continue
      const num = Number(f.value)
      record[f.key.trim()] = f.value !== '' && !isNaN(num) ? num : f.value
    }

    if (Object.keys(record).length === 0) {
      setError(t('emptyError'))
      return
    }

    setLoading(true)
    try {
      const res = await predict([record])
      setResult(res.results[0] ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('predictionFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">{t('heading')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('description')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2.5">
          <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            <span>{t('featureNameLabel')}</span>
            <span />
            <span>{t('valueLabel')}</span>
            <span />
          </div>

          {fields.map((field) => (
            <div
              key={field.id}
              className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2"
            >
              <input
                type="text"
                placeholder={t('featurePlaceholder')}
                value={field.key}
                onChange={(e) => updateField(field.id, 'key', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm transition-shadow focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <span className="select-none font-mono text-slate-400">=</span>
              <input
                type="text"
                placeholder={t('valuePlaceholder')}
                value={field.value}
                onChange={(e) => updateField(field.id, 'value', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm transition-shadow focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="button"
                onClick={() => removeField(field.id)}
                disabled={fields.length === 1}
                aria-label={t('removeField')}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addField}
          className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 transition-colors hover:border-indigo-400 hover:text-indigo-600"
        >
          <Plus className="h-4 w-4" />
          {t('addField')}
        </button>

        {error && (
          <Alert variant="error" message={error} onDismiss={() => setError(null)} />
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          {loading ? t('running') : t('runPrediction')}
        </button>
      </form>

      {result && <ResultCard record={result} />}
    </div>
  )
}
