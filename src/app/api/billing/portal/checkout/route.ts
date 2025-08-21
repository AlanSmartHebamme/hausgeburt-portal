import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // wir brauchen hier sichere Updates (stripe_customer_id speichern)
)

export async function POST(req: Request) {
  try {
    const { priceId } = await req.json()
    if (!priceId) return NextResponse.json({ error: 'Missing priceId' }, { status: 400 })

    // User holen (per Auth‑Cookie Token übergeben, supabase-js auf Server akzeptiert sie)
    const authHeader = req.headers.get('Authorization') // optional; mit @supabase/ssr wäre das über Cookies schon ok
    // einfacher Weg: Nutzer aus Session-Tabelle lesen
    const { data: { user } } = await supabase.auth.getUser(authHeader ? { headers: { Authorization: authHeader } } as any : undefined)
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Profile lesen (für stripe_customer_id & email)
    const { data: prof, error: pErr } = await supabase
      .from('profiles')
      .select('id, stripe_customer_id')
      .eq('id', user.id)
      .single()
    if (pErr) throw pErr

    let customerId = prof?.stripe_customer_id ?? null
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?sub=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?sub=cancel`,
      metadata: { user_id: user.id },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message ?? 'Checkout failed' }, { status: 500 })
  }
}
