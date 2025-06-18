import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get appUserId from cookie
  const appUserId = request.cookies.get('appUserId')?.value

  // Protected routes that require authentication
  if (request.nextUrl.pathname.startsWith('/dashboard') || 
      request.nextUrl.pathname.startsWith('/email')) {
    if (!appUserId) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // If we have appUserId and we're on the home page or login/register pages, redirect to emailList
  if ((request.nextUrl.pathname === '/' || 
       request.nextUrl.pathname === '/login' || 
       request.nextUrl.pathname === '/register') && 
      appUserId) {
    return NextResponse.redirect(new URL('/emailList', request.url))
  }

  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: ['/', '/dashboard/:path*', '/email/:path*', '/login', '/register'],
} 