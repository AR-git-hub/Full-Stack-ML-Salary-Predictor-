import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ML Prediction Service',
  description: 'Upload ML models, run manual predictions, and process CSV datasets.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-100 text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  )
}
