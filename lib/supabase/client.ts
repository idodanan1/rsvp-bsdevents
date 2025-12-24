import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return document.cookie.split('; ').map(cookie => {
            const [name, ...rest] = cookie.split('=')
            return { name: name.trim(), value: decodeURIComponent(rest.join('=')) }
          }).filter(c => c.name)
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
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

