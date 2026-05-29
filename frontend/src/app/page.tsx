// The next-intl middleware rewrites all root requests to /[locale]/page.tsx.
// This file exists only to satisfy Next.js's file-system router;
// it should never be rendered in production.
import { notFound } from 'next/navigation'

export default function RootPage() {
  notFound()
}
