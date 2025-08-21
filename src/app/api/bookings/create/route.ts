// app/api/bookings/create/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  try {
    const { midwifeId } = await req.json()
    if (!midwifeId) return NextResponse.json({ error: 'missing_midwife_id' }, { status: 400 })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // Optional: Client hat bereits aktiv?
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', user.id)
      .eq('midwife_id', midwifeId)
      .in('status', ['REQUESTED', 'CONFIRMED'])

    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: 'already_active' }, { status: 409 })
    }

    const { error } = await supabase.from('bookings').insert({
      client_id: user.id,
      midwife_id: midwifeId,
      status: 'REQUESTED',
    })

    if (error) {
      // Postgres codes: 23505 unique_violation; unser Trigger wirft "too_many_requests_24h"
      const msg = (error as any)?.message || ''
      if (error.code === '23505') {
        return NextResponse.json({ error: 'already_active' }, { status: 409 })
      }
      if (msg.includes('too_many_requests_24h')) {
        return NextResponse.json({ error: 'cooldown_24h' }, { status: 429 })
      }
      return NextResponse.json({ error: 'unknown', detail: msg }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'exception', detail: e?.message }, { status: 500 })
  }
}
