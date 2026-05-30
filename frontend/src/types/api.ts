export interface UploadModelResponse {
  status: 'ok' | 'error'
  detail?: string
}

export interface PredictRequest {
  records: Record<string, unknown>[]
}

export interface PredictRecord {
  features: Record<string, unknown>
  loan_status: string
}

export interface PredictResponse {
  results: PredictRecord[]
}

export interface PredictCsvResponse {
  roc_auc: number | null
  data: Record<string, unknown>[]
}
