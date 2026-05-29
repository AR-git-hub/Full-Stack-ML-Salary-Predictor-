'use client'

import { useCallback, useState } from 'react'
import { Upload, FileCheck, Loader2 } from 'lucide-react'
import { uploadModel } from '@/lib/api'
import { Alert } from '@/components/ui/Alert'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function ModelUpload() {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(pkl|joblib)$/i)) {
      setStatus('error')
      setMessage('Invalid file type. Please upload a .pkl or .joblib file.')
      return
    }
    setFileName(file.name)
    setStatus('loading')
    setMessage('')
    try {
      const res = await uploadModel(file)
      if (res.status === 'ok') {
        setStatus('success')
        setMessage('Model uploaded and loaded successfully.')
      } else {
        setStatus('error')
        setMessage(res.detail ?? 'Upload failed.')
      }
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'An unexpected error occurred.')
    }
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        <h2 className="text-xl font-semibold text-slate-800">Upload Model</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload a serialized scikit-learn model (
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.pkl</code> or{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">.joblib</code>). The model
          will be held in memory for subsequent prediction requests.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-14 text-center transition-colors ${
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
              {status === 'loading' ? 'Uploading…' : 'Choose a file'}
            </label>
            <span className="text-slate-500"> or drag &amp; drop here</span>
          </p>
          {fileName && (
            <p className="text-sm text-slate-500">
              Selected:{' '}
              <span className="font-medium text-slate-700">{fileName}</span>
            </p>
          )}
        </div>

        <p className="text-xs text-slate-400">
          Supported: <strong>.pkl</strong>, <strong>.joblib</strong> — max&nbsp;50&nbsp;MB
        </p>
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
