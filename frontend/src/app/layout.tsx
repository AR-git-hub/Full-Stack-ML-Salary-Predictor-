import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  icons: { icon: '/favicon.png' },
}

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
