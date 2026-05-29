'use client'

import { useState } from 'react'
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
  const isApproved = record.loan_status.toLowerCase() === 'approved'
  return (
    <div
      className={`rounded-xl border-2 p-6 ${
        isApproved
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-red-200 bg-red-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-700">Prediction Result</span>
        <span
          className={`rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wider ${
            isApproved ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {record.loan_status}
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

  const handleSubmit = async (e: React.FormEvent) => {
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
      setError('Please add at least one feature field with a non-empty name.')
      return
    }

    setLoading(true)
    try {
      const res = await predict([record])
      setResult(res.results[0] ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed. Is the model loaded?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Manual Prediction</h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter feature name–value pairs that match your uploaded model&apos;s expected features,
          then run prediction to get a single result.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2.5">
          <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            <span className="pl-1">Feature name</span>
            <span />
            <span className="pl-1">Value</span>
            <span />
          </div>

          {fields.map((field) => (
            <div key={field.id} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
              <input
                type="text"
                placeholder="e.g. credit_score"
                value={field.key}
                onChange={(e) => updateField(field.id, 'key', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-shadow"
              />
              <span className="text-slate-400 font-mono select-none">=</span>
              <input
                type="text"
                placeholder="e.g. 720"
                value={field.value}
                onChange={(e) => updateField(field.id, 'value', e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-shadow"
              />
              <button
                type="button"
                onClick={() => removeField(field.id)}
                disabled={fields.length === 1}
                aria-label="Remove field"
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addField}
          className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add feature field
        </button>

        {error && (
          <Alert variant="error" message={error} onDismiss={() => setError(null)} />
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          {loading ? 'Running prediction…' : 'Run Prediction'}
        </button>
      </form>

      {result && <ResultCard record={result} />}
    </div>
  )
}
