import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_EMAILS = [
  'bazvideo412@gmail.com',
  'tomo517ko@gmail.com',
  'aozora.karin@gmail.com',
  'ohayo0840ohayo@gmail.com'  // 追加
]

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: { headers: req.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            req.cookies.set(name, value)
          )
          res = NextResponse.next({
            request: { headers: req.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getSession()ではなくgetUser()を使う
  const { data: { user } } = await supabase.auth.getUser()

  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    if (!ALLOWED_EMAILS.includes(user.email ?? '')) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*'],
}
