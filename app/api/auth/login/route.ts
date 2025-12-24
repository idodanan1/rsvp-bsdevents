import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/types/database.types'

export async function POST(request: Request) {
  try {
    console.log('[API Login] Received request')
    const body = await request.json()
    
    // Check if this is a session save request (from client after login)
    if (body.session && body.user) {
      console.log('[API Login] Saving session to cookies')
      const cookieStore = await cookies()
      const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'default'
      
      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            },
          },
        }
      )

      // Manually set the session cookies
      // Supabase uses cookie name: sb-<project-ref>-auth-token
      const authTokenCookieName = `sb-${projectRef}-auth-token`
      
      // Create the auth token cookie value
      const authTokenValue = JSON.stringify({
        access_token: body.session.access_token,
        refresh_token: body.session.refresh_token,
        expires_at: body.session.expires_at,
        expires_in: body.session.expires_in,
        token_type: body.session.token_type,
        user: body.user,
      })

      console.log('[API Login] Setting cookie:', authTokenCookieName)
      console.log('[API Login] Cookie value length:', authTokenValue.length)

      // Set the session using setSession to trigger cookie handlers
      const { error } = await supabase.auth.setSession({
        access_token: body.session.access_token,
        refresh_token: body.session.refresh_token,
      })

      if (error) {
        console.error('[API Login] Error setting session:', error.message)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      // Get all cookies after setting session
      const allCookies = cookieStore.getAll()
      console.log('[API Login] Cookies after setSession:', allCookies.map(c => c.name))

      // Create response
      const response = NextResponse.json({ success: true })
      
      // Manually set the auth token cookie
      response.cookies.set(authTokenCookieName, authTokenValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
      
      // Also copy any other cookies that were set
      allCookies.forEach((cookie) => {
        if (cookie.name !== authTokenCookieName) {
          response.cookies.set(cookie.name, cookie.value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
          })
        }
      })

      console.log('[API Login] Response cookies:', response.cookies.getAll().map(c => c.name))
      return response
    }

    // Otherwise, this is a login request with email/password
    console.log('[API Login] Received login request')
    const { email, password } = body
    console.log('[API Login] Email:', email)

    if (!email || !password) {
      return NextResponse.json(
        { error: 'אנא מלא את כל השדות' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const cookiesToSet: Array<{ name: string; value: string; options?: any }> = []
    
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSetArray: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSetArray.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
              cookiesToSet.push({ name, value, options })
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('[API Login] Sign in result - Error:', error?.message || 'none')
    console.log('[API Login] Sign in result - User:', data?.user?.id || 'none')
    console.log('[API Login] Sign in result - Session:', data?.session ? 'exists' : 'none')
    console.log('[API Login] Cookies to set:', cookiesToSet.map(c => c.name))

    if (error) {
      console.error('[API Login] Sign in error:', error.message)
      return NextResponse.json(
        { error: error.message || 'שגיאה בהתחברות. אנא נסה שוב.' },
        { status: 400 }
      )
    }

    if (!data?.user || !data?.session) {
      console.error('[API Login] No user or session')
      return NextResponse.json(
        { error: 'התחברות נכשלה. אנא נסה שוב.' },
        { status: 400 }
      )
    }

    // Create JSON response
    const jsonResponse = NextResponse.json({ success: true, user: data.user })
    
    // Set all cookies that were set by createServerClient
    cookiesToSet.forEach(({ name, value, options }) => {
      jsonResponse.cookies.set(name, value, {
        httpOnly: options?.httpOnly ?? true,
        secure: options?.secure ?? (process.env.NODE_ENV === 'production'),
        sameSite: options?.sameSite ?? 'lax',
        path: options?.path ?? '/',
        maxAge: options?.maxAge,
      })
    })
    
    // Also get all cookies from cookieStore and set them
    const allCookies = cookieStore.getAll()
    console.log('[API Login] All cookies from store:', allCookies.map(c => c.name))
    allCookies.forEach((cookie) => {
      // Only set if not already set
      if (!cookiesToSet.find(c => c.name === cookie.name)) {
        jsonResponse.cookies.set(cookie.name, cookie.value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        })
      }
    })

    console.log('[API Login] Final response cookies:', jsonResponse.cookies.getAll().map(c => c.name))
    return jsonResponse
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'שגיאה לא צפויה. אנא נסה שוב.' },
      { status: 500 }
    )
  }
}

