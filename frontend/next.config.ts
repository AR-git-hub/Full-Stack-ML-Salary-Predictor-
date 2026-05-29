import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  output: 'standalone',
  // When BACKEND_URL is set (local dev without docker), proxy /api/v1 to FastAPI.
  // In production nginx handles this routing.
  ...(process.env.BACKEND_URL
    ? {
        async rewrites() {
          return [
            {
              source: '/api/v1/:path*',
              destination: `${process.env.BACKEND_URL}/:path*`,
            },
          ]
        },
      }
    : {}),
}

export default withNextIntl(nextConfig)
