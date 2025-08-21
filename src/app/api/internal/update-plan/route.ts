import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize the Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const internalApiSecret = process.env.INTERNAL_API_SECRET
  const authHeader = req.headers.get('Authorization')

  // 1. Security Check: Ensure the request is from our trusted webhook server
  if (!internalApiSecret || authHeader !== `Bearer ${internalApiSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { userId, plan, subscriptionId, customerId } = await req.json()

    if (!userId || !plan) {
      return NextResponse.json({ error: 'Missing userId or plan' }, { status: 400 })
    }

    // 2. Update the user's profile in Supabase
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        plan: plan,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
      })
      .eq('id', userId)

    if (error) {
      console.error(`Internal API: Failed to update plan for user ${userId}:`, error.message)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    console.log(`Internal API: Successfully updated plan to ${plan} for user ${userId}`)
    return NextResponse.json({ success: true })

  } catch (e: any) {
    console.error('Internal API Error:', e.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
