// middleware.ts  (ROOT, nicht in /src)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // neue API in @supabase/ssr
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Wichtig: sorgt dafür, dass Access/Refresh-Token im Response aktualisiert werden
  await supabase.auth.getSession()

  return res
}

// Auf Login & Dashboard laufen lassen (reicht zum Syncen, minimaler Overhead)
export const config = {
  matcher: ['/login', '/dashboard/:path*'],
}
