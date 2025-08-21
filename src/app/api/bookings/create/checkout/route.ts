import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // volle Rechte
)

export async function POST(req: Request) {
  try {
    const { bookingId } = await req.json()
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId missing' }, { status: 400 })
    }

    // Booking laden
    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from('bookings')
      .select('id, status, amount_cents, currency, client_id, midwife_id')
      .eq('id', bookingId)
      .single()

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.status !== 'CONFIRMED') {
      return NextResponse.json({ error: 'Booking is not payable' }, { status: 409 })
    }

    const amountCents = booking.amount_cents ?? 19900
    const currency = (booking.currency ?? 'eur').toLowerCase()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: 'Vermittlungsgebühr Hebammen-Anfrage',
              description: `Buchung ${booking.id}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${booking.id}?paid=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${booking.id}?canceled=1`,
      metadata: {
        booking_id: booking.id,
        midwife_id: booking.midwife_id,
        role: 'client_payment',
      },
    })

    // Session-ID speichern
    await supabaseAdmin
      .from('bookings')
      .update({ checkout_session_id: session.id })
      .eq('id', booking.id)

    return NextResponse.json({ url: session.url }, { status: 200 })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 })
  }
}
