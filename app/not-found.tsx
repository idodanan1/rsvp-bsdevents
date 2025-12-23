import Link from 'next/link'
import { he } from '@/lib/i18n/he'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">דף לא נמצא</h2>
        <p className="text-gray-600 mb-8">הדף שביקשת לא קיים.</p>
        <Link
          href="/dashboard"
          className="bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700"
        >
          חזור לדף הבית
        </Link>
      </div>
    </div>
  )
}

