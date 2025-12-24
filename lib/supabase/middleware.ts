import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database.types'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // FORCE REDIRECT: Redirect /login to /dashboard immediately
  if (pathname === '/login' || pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url, 308) // 308 = Permanent Redirect
  }

  // Just pass through for now
  return NextResponse.next({
    request,
  })
}

