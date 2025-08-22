import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize the Rate Limiter
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'), // 5 requests per 60 seconds
  analytics: true,
})

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting based on IP address
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const { success, limit, remaining, reset } = await ratelimit.limit(ip)

    if (!success) {
      return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })
    }

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
      const msg = (error as any)?.message || ''
      if (error.code === '23505') {
        return NextResponse.json({ error: 'already_active' }, { status: 409 })
      }
      return NextResponse.json({ error: 'unknown', detail: msg }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: 'exception', detail: e?.message }, { status: 500 })
  }
}
