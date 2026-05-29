import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// Root layout required by Next.js.
// Locale-specific wrapping (NextIntlClientProvider) lives in app/[locale]/layout.tsx.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body
        className={`${inter.className} min-h-screen bg-slate-100 text-slate-900 antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
