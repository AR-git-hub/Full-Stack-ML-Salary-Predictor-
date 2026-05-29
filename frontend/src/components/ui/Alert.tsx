'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react'

type Variant = 'success' | 'error' | 'info'

interface AlertProps {
  variant: Variant
  message: string
  onDismiss?: () => void
}

const STYLES: Record<Variant, { container: string; icon: ReactNode }> = {
  success: {
    container: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
  },
  error: {
    container: 'bg-red-50 border-red-300 text-red-800',
    icon: <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />,
  },
  info: {
    container: 'bg-blue-50 border-blue-300 text-blue-800',
    icon: <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />,
  },
}

export function Alert({ variant, message, onDismiss }: AlertProps) {
  const t = useTranslations('alert')
  const { container, icon } = STYLES[variant]

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${container}`}
    >
      {icon}
      <p className="flex-1 leading-relaxed">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('dismiss')}
          className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
        >
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
