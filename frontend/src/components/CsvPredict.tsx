'use client'

import { useCallback, useState, type DragEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Download, Loader2, FileSpreadsheet, BarChart2 } from 'lucide-react'
import { predictFromCsv } from '@/lib/api'
import type { PredictCsvResponse } from '@/types/api'
import { Alert } from '@/components/ui/Alert'

const PAGE_SIZE = 10

function downloadCsv(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return
  const keys = Object.keys(data[0])
  const escape = (v: unknown) => JSON.stringify(v ?? '')
  const lines = [
    keys.join(','),
    ...data.map((row) => keys.map((k) => escape(row[k])).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.replace(/\.csv$/i, '') + '_predictions.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

export function CsvPredict() {
  const t = useTranslations('csvPredict')
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PredictCsvResponse | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError(t('invalidType'))
        return
      }
      setFileName(file.name)
      setLoading(true)
      setError(null)
      setResult(null)
      setPage(0)
      try {
        const res = await predictFromCsv(file)
        setResult(res)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('batchFailed'))
      } finally {
        setLoading(false)
      }
    },
    [t],
  )

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const rows = result?.data ?? []
  const columns = rows.length > 0 ? Object.keys(rows[0]) : []
  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">{t('heading')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('description')}</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
          isDragging
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30'
        }`}
      >
        <input
          id="csv-file-input"
          type="file"
          accept=".csv"
          className="sr-only"
          disabled={loading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />

        {loading ? (
          <Loader2 className="h-12 w-12 animate-spin text-indigo-400" />
        ) : (
          <FileSpreadsheet className="h-12 w-12 text-slate-300" />
        )}

        <div>
          <label
            htmlFor="csv-file-input"
            className={`cursor-pointer font-medium text-indigo-600 hover:text-indigo-700 ${
              loading ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            {loading ? t('processing') : t('chooseFile')}
          </label>
          <span className="text-slate-500"> {t('dragDrop')}</span>
        </div>

        {fileName && !loading && (
          <p className="text-sm text-slate-500">{t('fileSelected', { name: fileName })}</p>
        )}

        <p className="text-xs text-slate-400">{t('hint')}</p>
      </div>

      {error && <Alert variant="error" message={error} onDismiss={() => setError(null)} />}

      {/* Results */}
      {result && rows.length > 0 && (
        <div className="space-y-4">
          {/* Metrics bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-800 px-6 py-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-indigo-400" />
                <div>
                  <p className="text-xs text-slate-400">{t('totalRows')}</p>
                  <p className="text-lg font-bold text-white">
                    {rows.length.toLocaleString()}
                  </p>
                </div>
              </div>
              {result.roc_auc !== null && (
                <div>
                  <p className="text-xs text-slate-400">{t('rocAuc')}</p>
                  <p className="text-lg font-bold text-emerald-400">
                    {result.roc_auc.toFixed(4)}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => downloadCsv(rows, fileName ?? 'results')}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              <Download className="h-4 w-4" />
              {t('download')}
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${
                        col === 'predicted_loan_status'
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {columns.map((col) => {
                      const val = String(row[col] ?? '')
                      const isPrediction = col === 'predicted_loan_status'
                      const isApproved = val.toLowerCase() === 'approved'
                      return (
                        <td
                          key={col}
                          className="whitespace-nowrap px-4 py-2.5 text-slate-700"
                        >
                          {isPrediction ? (
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                isApproved
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {val}
                            </span>
                          ) : (
                            val
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>
                {t('showingRows', {
                  from: page * PAGE_SIZE + 1,
                  to: Math.min((page + 1) * PAGE_SIZE, rows.length),
                  total: rows.length,
                })}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-100 disabled:opacity-40"
                >
                  {t('previous')}
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-100 disabled:opacity-40"
                >
                  {t('next')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
