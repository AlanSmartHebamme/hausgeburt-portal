import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: Request) {
  const { access_token, refresh_token } = await req.json()
  if (!access_token || !refresh_token) {
    return NextResponse.json({ ok: false, error: 'missing tokens' }, { status: 400 })
  }

  const res = NextResponse.json({ ok: true })
  const cookieStore = await cookies() // <-- await hier

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          res.cookies.set({ name, value, ...options })
        },
        remove: (name: string, options: any) => {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  return res
}
