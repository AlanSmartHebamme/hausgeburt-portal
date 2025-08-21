import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type StripeType from 'stripe'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  // ✅ headers() mit await aufrufen
  const sig = (await headers()).get('stripe-signature')!
  const buf = Buffer.from(await req.arrayBuffer())

  let event: StripeType.Event
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as StripeType.Checkout.Session
        if (s.mode === 'subscription' && s.subscription) {
          const sub = (await stripe.subscriptions.retrieve(
            s.subscription as string
          )) as any

          const { data: bc } = await supabaseAdmin
            .from('billing_customers')
            .select('user_id')
            .eq('stripe_customer_id', s.customer as string)
            .single()

          if (bc?.user_id) {
            await supabaseAdmin.from('subscriptions').upsert({
              user_id: bc.user_id,
              stripe_sub_id: sub.id,
              status: sub.status,
              price_id: sub.items.data[0]?.price?.id ?? null,
              current_period_end: sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null, // ✅ optional behandelt
              cancel_at_period_end: sub.cancel_at_period_end ?? false,
            }, { onConflict: 'stripe_sub_id' })
          }
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: sub.status,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
          })
          .eq('stripe_sub_id', sub.id)
        break
      }

      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const inv = event.data.object as StripeType.Invoice
        const customerId = inv.customer as string
        const { data: bc } = await supabaseAdmin
          .from('billing_customers')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (bc?.user_id) {
          await supabaseAdmin.from('invoices').upsert({
            user_id: bc.user_id,
            stripe_invoice_id: inv.id,
            amount_total: inv.amount_due ?? 0,
            currency: inv.currency ?? 'eur',
            hosted_invoice_url: inv.hosted_invoice_url ?? null,
            status: inv.status ?? null,
          }, { onConflict: 'stripe_invoice_id' })
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'processing error' }, { status: 500 })
  }
}
