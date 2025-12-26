import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Safety check for build time - return mock object if env vars are missing
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
      // Server-side during build - return a mock object
      return {
        auth: {
          signUp: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
          signIn: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
          signOut: async () => ({ error: null }),
          getUser: async () => ({ data: { user: null }, error: null }),
          getSession: async () => ({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        },
      } as any
    }
    // Client-side - throw error or return mock
    console.warn('Supabase environment variables are missing')
    return {
      auth: {
        signUp: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
        signIn: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
        signOut: async () => ({ error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    } as any
  }

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return document.cookie.split('; ').map((cookie: any) => {
            const [name, ...rest] = cookie.split('=')
            return { name: name.trim(), value: decodeURIComponent(rest.join('=')) }
          }).filter((c: any) => c.name)
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value, options }: any) => {
            if (options?.httpOnly) {
              // httpOnly cookies cannot be set from client-side
              // These will be set by the server via API route
              return
            }
            let cookieString = `${name}=${encodeURIComponent(value)}`
            if (options?.maxAge) {
              cookieString += `; max-age=${options.maxAge}`
            }
            if (options?.path) {
              cookieString += `; path=${options.path}`
            } else {
              cookieString += `; path=/`
            }
            if (options?.domain) {
              cookieString += `; domain=${options.domain}`
            }
            if (options?.sameSite) {
              cookieString += `; samesite=${options.sameSite}`
            } else {
              cookieString += `; samesite=lax`
            }
            if (options?.secure) {
              cookieString += `; secure`
            }
            document.cookie = cookieString
          })
        },
      },
    }
  )
}

