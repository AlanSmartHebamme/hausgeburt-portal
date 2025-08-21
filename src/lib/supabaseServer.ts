// src/lib/supabaseServer.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function supabaseServer() {
  // In neueren Next-Versionen ist cookies() async
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // neue API: getAll/setAll
        getAll() {
          return cookieStore.getAll()
        },
        // In Server Components setzen wir i.d.R. nichts (Middleware macht das)
        setAll(_cookies) {
          // no-op
        },
      },
    }
  )
}
