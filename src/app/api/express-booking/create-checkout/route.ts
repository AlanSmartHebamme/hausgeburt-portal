import { supabaseServer } from '@/lib/supabaseServer'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { midwifeIds } = await req.json()
    if (!Array.isArray(midwifeIds) || midwifeIds.length === 0) {
      return new NextResponse('Missing midwifeIds', { status: 400 })
    }

    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // In a real app, the price would be stored in the database or Stripe directly
    const EXPRESS_BOOKING_PRICE_ID = 'price_1Rz0yhFi50BYTrK65cvn8v4a'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'sofort', 'giropay'],
      mode: 'payment',
      line_items: [
        {
          price: EXPRESS_BOOKING_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/requests?express=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/wizard/results`, // Go back to results if canceled
      metadata: {
        client_id: user.id,
        midwife_ids: midwifeIds.join(','),
        feature: 'express_booking',
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('[EXPRESS_CHECKOUT_ERROR]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
