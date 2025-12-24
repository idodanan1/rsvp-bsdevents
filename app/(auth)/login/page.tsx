'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { he } from '@/lib/i18n/he'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  // TEMPORARILY DISABLED: Redirect directly to dashboard
  useEffect(() => {
    window.location.href = '/dashboard'
  }, [])
  
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (loading) {
      return // Prevent double submission
    }
    
    setLoading(true)
    setError(null)
    
    if (!email || !password) {
      setError('אנא מלא את כל השדות')
      setLoading(false)
      return
    }

    try {
      console.log('Starting login...')
      
      // Login with Supabase
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('Login result:', { error: loginError?.message, user: data?.user?.id })

      if (loginError) {
        setError(loginError.message || 'שגיאה בהתחברות. אנא נסה שוב.')
        setLoading(false)
        return
      }

      if (!data?.user || !data?.session) {
        setError('התחברות נכשלה. אנא נסה שוב.')
        setLoading(false)
        return
      }

      console.log('Login successful, saving session...')

      // Save session to server via API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          session: data.session,
          user: data.user 
        }),
      })

      console.log('Save session response:', response.status)

      if (!response.ok) {
        const result = await response.json()
        console.error('Failed to save session:', result.error)
        // Continue anyway - might still work
      }

      // Wait a bit for cookies to be set
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('Redirecting to dashboard...')
      
      // Redirect to dashboard
      window.location.href = '/dashboard'
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'שגיאה לא צפויה. אנא נסה שוב.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {he.auth.login}
          </h2>
        </div>
        <div className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} noValidate>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  {he.auth.email}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder={he.auth.email}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  {he.auth.password}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder={he.auth.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {loading ? he.common.loading : he.auth.login}
              </button>
            </div>
          </form>

          <div className="text-center">
            <a
              href="/signup"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              {he.auth.dontHaveAccount}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
