import type {
  UploadModelResponse,
  PredictRequest,
  PredictResponse,
  PredictCsvResponse,
} from '@/types/api'

const BASE = '/api/v1'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error((body as { detail?: string } | null)?.detail ?? `HTTP ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export async function uploadModel(file: File): Promise<UploadModelResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/upload-model`, { method: 'POST', body: form })
  return handleResponse<UploadModelResponse>(res)
}

export async function predict(
  records: Record<string, unknown>[],
): Promise<PredictResponse> {
  const body: PredictRequest = { records }
  const res = await fetch(`${BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse<PredictResponse>(res)
}

export async function predictFromCsv(file: File): Promise<PredictCsvResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/predict-from-csv`, { method: 'POST', body: form })
  return handleResponse<PredictCsvResponse>(res)
}
