import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

// Admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { priceId, user_id } = body

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
    }
    if (!priceId) {
      return NextResponse.json({ error: 'Missing priceId' }, { status: 400 })
    }

    // 1. Get user profile from Supabase
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, display_name')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 })
    }

    let customerId = profile.stripe_customer_id

    // 2. If user has no stripe_customer_id, create one and update their profile
    if (!customerId) {
      const customer = await stripe.customers.create({
        // email: user.email, // You might want to add the user's email here
        name: profile.display_name ?? undefined,
        metadata: { supabase_user_id: user_id },
      })
      customerId = customer.id

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user_id)

      if (updateError) {
        console.error('Supabase profile update error:', updateError)
        return NextResponse.json({ error: 'Failed to update user profile with Stripe customer ID.' }, { status: 500 })
      }
    }

    const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    // 3. Create the checkout session with the retrieved or newly created customer ID
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${site}/dashboard?upgraded=1`,
      cancel_url: `${site}/pricing?canceled=1`,
      allow_promotion_codes: true,
      metadata: {
        supabase_user_id: user_id,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user_id,
        },
      },
    })

    return NextResponse.json({ url: session.url }, { status: 200 })
  } catch (err: any) {
    console.error('Checkout error:', err.message || err)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
