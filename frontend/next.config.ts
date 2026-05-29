import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // When BACKEND_URL is set (local dev without docker), proxy /api/v1 directly to FastAPI.
  // In production the nginx reverse proxy handles this routing instead.
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

export default nextConfig
