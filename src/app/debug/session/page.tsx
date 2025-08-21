// src/app/debug/session/page.tsx
import { supabaseServer } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export default async function DebugSessionPage() {
  const supabase = await supabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()

  return (
    <pre style={{ padding: 24 }}>
      SSR getUser error: {error?.message ?? 'none'}
      {'\n'}
      SSR user: {JSON.stringify(user, null, 2)}
    </pre>
  )
}
