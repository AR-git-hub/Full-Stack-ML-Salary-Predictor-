'use client'

import { useCallback, useState, type DragEvent, type ChangeEvent } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, FileCheck, Loader2 } from 'lucide-react'
import { uploadModel } from '@/lib/api'
import { Alert } from '@/components/ui/Alert'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function ModelUpload() {
  const t = useTranslations('modelUpload')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.match(/\.(pkl|joblib)$/i)) {
        setStatus('error')
        setMessage(t('invalidType'))
        return
      }
      setFileName(file.name)
      setStatus('loading')
      setMessage('')
      try {
        const res = await uploadModel(file)
        if (res.status === 'ok') {
          setStatus('success')
          setMessage(t('successMessage'))
        } else {
          setStatus('error')
          setMessage(res.detail ?? t('unexpectedError'))
        }
      } catch (err) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : t('unexpectedError'))
      }
    },
    [t],
  )

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const reset = () => {
    setStatus('idle')
    setMessage('')
    setFileName(null)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">{t('heading')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('description')}</p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-14 text-center transition-colors ${
          isDragging
            ? 'border-indigo-400 bg-indigo-50'
            : status === 'success'
              ? 'border-emerald-300 bg-emerald-50'
              : 'border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30'
        }`}
      >
        <input
          id="model-file-input"
          type="file"
          accept=".pkl,.joblib"
          className="sr-only"
          onChange={onInputChange}
          disabled={status === 'loading'}
        />

        {status === 'loading' ? (
          <Loader2 className="h-14 w-14 animate-spin text-indigo-400" />
        ) : status === 'success' ? (
          <FileCheck className="h-14 w-14 text-emerald-500" />
        ) : (
          <Upload className="h-14 w-14 text-slate-300" />
        )}

        <div className="space-y-1">
          <p>
            <label
              htmlFor="model-file-input"
              className={`cursor-pointer font-medium text-indigo-600 hover:text-indigo-700 ${
                status === 'loading' ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              {status === 'loading' ? t('uploading') : t('chooseFile')}
            </label>
            <span className="text-slate-500"> {t('dragDrop')}</span>
          </p>
          {fileName && (
            <p className="text-sm text-slate-500">{t('selected', { name: fileName })}</p>
          )}
        </div>

        <p className="text-xs text-slate-400">{t('hint')}</p>
      </div>

      {(status === 'success' || status === 'error') && (
        <Alert
          variant={status === 'success' ? 'success' : 'error'}
          message={message}
          onDismiss={reset}
        />
      )}
    </div>
  )
}
