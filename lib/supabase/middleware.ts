import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database.types'

export async function updateSession(request: NextRequest) {
  // TEMPORARILY DISABLED: Simple pass-through middleware
  // Redirect /login to /dashboard
  if (request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Just pass through for now
  return NextResponse.next({
    request,
  })
}

