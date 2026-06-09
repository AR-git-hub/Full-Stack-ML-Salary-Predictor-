'use client'

import { useState, useEffect, type FormEvent } from 'react'
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
  { id: 1,  key: 'person_age',                      value: '' },
  { id: 2,  key: 'person_gender',                   value: '' },
  { id: 3,  key: 'person_education',                value: '' },
  { id: 4,  key: 'person_income',                   value: '' },
  { id: 5,  key: 'person_emp_exp',                  value: '' },
  { id: 6,  key: 'person_home_ownership',           value: '' },
  { id: 7,  key: 'loan_amnt',                       value: '' },
  { id: 8,  key: 'loan_intent',                     value: '' },
  { id: 9,  key: 'loan_int_rate',                   value: '' },
  { id: 10, key: 'loan_percent_income',             value: '' },
  { id: 11, key: 'cb_person_cred_hist_length',      value: '' },
  { id: 12, key: 'credit_score',                    value: '' },
  { id: 13, key: 'previous_loan_defaults_on_file',  value: '' },
]

let _cachedFields: Field[] | null = null
let _cachedResult: PredictRecord | null = null

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

  useEffect(() => {
    if (_cachedFields) {
      setFields(_cachedFields)
      setNextId(Math.max(..._cachedFields.map((f) => f.id)) + 1)
    }
    if (_cachedResult) setResult(_cachedResult)
  }, [])

  const addField = () => {
    const newFields = [...fields, { id: nextId, key: '', value: '' }]
    _cachedFields = newFields
    setFields(newFields)
    setNextId((n) => n + 1)
  }

  const removeField = (id: number) => {
    const newFields = fields.filter((f) => f.id !== id)
    _cachedFields = newFields
    setFields(newFields)
  }

  const updateField = (id: number, prop: 'key' | 'value', val: string) => {
    const newFields = fields.map((f) => (f.id === id ? { ...f, [prop]: val } : f))
    _cachedFields = newFields
    setFields(newFields)
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
      const record0 = res.results[0] ?? null
      _cachedResult = record0
      setResult(record0)
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
          <div className="hidden sm:grid sm:grid-cols-[1fr_auto_1fr_auto] items-center gap-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            <span>{t('featureNameLabel')}</span>
            <span />
            <span>{t('valueLabel')}</span>
            <span />
          </div>

          {fields.map((field) => (
            <div
              key={field.id}
              className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[1fr_auto_1fr_auto]"
            >
              <div className="flex flex-col gap-2 sm:contents">
                <input
                  type="text"
                  placeholder={t('featurePlaceholder')}
                  value={field.key}
                  onChange={(e) => updateField(field.id, 'key', e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm transition-shadow focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <span className="hidden select-none font-mono text-slate-400 sm:block">=</span>
                <input
                  type="text"
                  placeholder={t('valuePlaceholder')}
                  value={field.value}
                  onChange={(e) => updateField(field.id, 'value', e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm transition-shadow focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
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
