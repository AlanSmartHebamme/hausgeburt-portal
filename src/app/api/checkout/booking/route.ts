import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseServer as createClient } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bookingId } = await req.json()
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })
    }

    // Optional: Verify the booking belongs to the user and has the status 'CONFIRMED'
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status, client_id')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    if (booking.client_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (booking.status !== 'CONFIRMED') {
      return NextResponse.json({ error: `Booking status is ${booking.status}, not CONFIRMED` }, { status: 400 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price: process.env.STRIPE_BOOKING_PRICE_ID!,
        quantity: 1,
      }],
      metadata: {
        booking_id: bookingId,
      },
      success_url: `${siteUrl}/dashboard/requests?payment_success=1&booking_id=${bookingId}`,
      cancel_url: `${siteUrl}/dashboard/requests?payment_canceled=1&booking_id=${bookingId}`,
    })

    return NextResponse.json({ url: session.url })

  } catch (err: any) {
    console.error('Booking checkout error:', err.message)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
