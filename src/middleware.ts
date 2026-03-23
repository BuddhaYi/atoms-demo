import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'atoms-demo-jwt-secret-change-in-production'
)

const PROTECTED_PATHS = ['/', '/dashboard', '/workspace']
const PUBLIC_PATHS = ['/login', '/register']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip API routes and static assets
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('atoms_token')?.value
  let isAuthenticated = false

  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET)
      isAuthenticated = true
    } catch {
      // Invalid/expired token
    }
  }

  // Authenticated user visiting login/register → redirect to home
  if (isAuthenticated && PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Unauthenticated user visiting protected route → redirect to login
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith('/workspace/')
  )
  if (!isAuthenticated && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
